interface FunctionContext {
  request: Request;
  env: {
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  };
}

interface EmailRequestBody {
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function onRequestPost({ request, env }: FunctionContext): Promise<Response> {
  try {
    const body = (await request.json()) as EmailRequestBody;
    const rawRecipients = Array.isArray(body.to)
      ? body.to
      : typeof body.to === 'string'
      ? body.to.split(',')
      : [];

    const recipients = Array.from(
      new Set(rawRecipients.map((e) => e.trim()).filter((e) => isValidEmail(e)))
    );

    if (recipients.length === 0) {
      return Response.json(
        { error: 'Provide at least one valid recipient email address.' },
        { status: 400 }
      );
    }

    const subject = (body.subject || '').trim();
    const text = (body.text || '').trim();
    if (!subject || (!text && !body.html)) {
      return Response.json(
        { error: 'Email subject and message content are required.' },
        { status: 400 }
      );
    }

    const mailtoUrl = `mailto:${encodeURIComponent(recipients[0])}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(text.slice(0, 1800))}`;

    const resendKey = env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      return Response.json({
        sent: false,
        provider: 'mailto_fallback',
        recipients,
        mailtoUrl,
        message:
          'Server email relay (RESEND_API_KEY) is not configured yet. Use the prepared mailto draft or configure RESEND_API_KEY in Secrets.',
      });
    }

    const fromAddress = env.EMAIL_FROM?.trim() || 'SunMedX Biomedical <onboarding@resend.dev>';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        text: text || undefined,
        html: body.html || undefined,
        reply_to: body.replyTo && isValidEmail(body.replyTo) ? body.replyTo.trim() : undefined,
      }),
    });

    const resendJson = (await resendRes.json().catch(() => ({}))) as any;
    if (!resendRes.ok) {
      return Response.json(
        {
          sent: false,
          error: resendJson?.message || 'Upstream email delivery failed.',
          mailtoUrl,
        },
        { status: resendRes.status >= 400 ? resendRes.status : 502 }
      );
    }

    return Response.json({
      sent: true,
      provider: 'resend',
      id: resendJson?.id || null,
      recipients,
      mailtoUrl,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Failed preparing or sending email.' },
      { status: 500 }
    );
  }
}
