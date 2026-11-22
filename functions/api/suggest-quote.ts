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
        { error: 'GEMINI_API_KEY environment variable is required.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      deviceModel?: string;
      serviceType?: string;
      quantity?: number;
      city?: string;
      notes?: string;
    };

    const prompt = `
      You are a senior service quotation analyst for SunMedX Biomedical engineering brand in India.
      Analyze the provided quote request:
      - Device Model: ${body.deviceModel || 'Standard Medical Device'}
      - Service Type: ${body.serviceType || 'Calibration'}
      - Quantity: ${body.quantity || 1}
      - City Location: ${body.city || 'Mumbai'}
      - Additional Notes: ${body.notes || 'None'}

      Suggest:
      1. A fair, competitive price minimum and maximum range in Indian Rupees (INR)
      2. A recommended single quote amount (recommending a value between min and max)
      3. Analytical justification/reasoning
      4. Confidence scoring (number 0 to 100)

      Format your reply as a strict, valid JSON object with the following keys, without any markdown backticks or block formatting wrappers:
      {
        "minPrice": number,
        "maxPrice": number,
        "recommendedPrice": number,
        "reasoning": "string explanation",
        "confidence": number
      }
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return Response.json({ error: errText || 'Gemini API error' }, { status: 502 });
    }

    const geminiJson = (await geminiRes.json()) as any;
    const rawText: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    return Response.json(JSON.parse(cleaned));
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Failed running quote estimation.' },
      { status: 500 }
    );
  }
}
