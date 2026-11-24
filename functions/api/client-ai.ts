interface FunctionContext {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
  };
}

export async function onRequestPost({ request, env }: FunctionContext): Promise<Response> {
  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GEMINI_API_KEY environment variable is required on the server.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      question?: string;
      equipmentContext?: string;
      hospitalName?: string;
      brandName?: string;
      userRole?: string;
      aiQueriesUsed?: number;
      aiQueryLimit?: number;
    };

    const privilegedRoles = ['superadmin', 'owner', 'admin', 'technician'];
    const role = (body.userRole || 'customer').toLowerCase();
    const limit = typeof body.aiQueryLimit === 'number' ? body.aiQueryLimit : -1;
    const used = typeof body.aiQueriesUsed === 'number' ? body.aiQueriesUsed : 0;

    if (!privilegedRoles.includes(role) && limit >= 0 && used >= limit) {
      return Response.json(
        {
          error: `Monthly AI query limit reached (${used}/${limit}). Upgrade to Pro or Enterprise in Client Hub → Plan & Billing.`,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const question = (body.question || '').trim();
    if (!question || question.length > 2500) {
      return Response.json(
        { error: 'Please provide a valid clinical or calibration question (1–2500 characters).' },
        { status: 400 }
      );
    }

    const activeBrand = (body.brandName || 'SunMedX').trim();
    const prompt = `You are the ${activeBrand} Client Hub Biomedical AI Advisor assisting verified hospital clinicians and biomedical engineers in India.
Answer clearly, accurately, and concisely with NABL ISO/IEC 17025 and IEC 60601 safety context where relevant. Do not provide human clinical diagnosis—focus strictly on medical device calibration, preventive maintenance, AMC coverage, and analyzer troubleshooting.

${body.hospitalName ? `Hospital / Organization: ${body.hospitalName}\n` : ''}${body.equipmentContext ? `Equipment / Asset Context: ${body.equipmentContext}\n` : ''}Client Question: ${question}`;

    const attempts = [
      { model: 'gemini-4-hydrogen', delayMs: 0, thinkingLevel: 'LOW' },
      { model: 'gemini-4-hydrogen', delayMs: 1200, thinkingLevel: 'LOW' },
      { model: 'gemini-3.1-flash-lite', delayMs: 1800, thinkingLevel: 'MINIMAL' },
    ];

    let geminiRes: Response | null = null;
    let lastStatus = 502;
    let lastErrText = '';

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) {
        await new Promise((r) => setTimeout(r, attempt.delayMs));
      }
      const attemptRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'aistudio-build',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
            },
          }),
        }
      );

      if (attemptRes.ok) {
        geminiRes = attemptRes;
        break;
      }

      lastStatus = attemptRes.status;
      lastErrText = await attemptRes.text();
      if (attemptRes.status !== 429 && attemptRes.status !== 503 && attemptRes.status !== 404) {
        break;
      }
    }

    if (!geminiRes) {
      const msg =
        lastStatus === 429 || lastErrText.includes('RESOURCE_EXHAUSTED')
          ? 'Gemini API quota or rate limit exceeded (429 RESOURCE_EXHAUSTED). Please wait a few seconds and retry.'
          : lastErrText || 'Gemini API error';
      return Response.json({ error: msg, code: lastStatus }, { status: lastStatus >= 400 ? lastStatus : 502 });
    }

    const geminiJson = (await geminiRes.json()) as any;
    const answer: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return Response.json({ answer });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Failed processing Client Hub AI request.' },
      { status: 500 }
    );
  }
}
