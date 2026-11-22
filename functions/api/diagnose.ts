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
      equipmentType?: string;
      problemDescription?: string;
    };

    if (!body.equipmentType || !body.problemDescription) {
      return Response.json(
        { error: 'Missing equipmentType or problemDescription' },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert clinical biomedical engineer specializing in fault diagnosis for hospital medical devices.
      Analyze the provided medical equipment type and described problem to recommend:
      1. Probable root causes (array of strings)
      2. Severity level ('Low' | 'Medium' | 'High')
      3. Step-by-step diagnostic or safety inspection checks (array of strings)
      4. Recommended resolution, specifying if an expert engineering onsite visit is required.

      Equipment Type: ${body.equipmentType}
      Problem Description: ${body.problemDescription}

      Format your reply as a strict, valid JSON object with the following keys, without any markdown backticks or block formatting wrappers:
      {
        "causes": ["cause 1", "cause 2"],
        "severity": "High",
        "checks": ["check 1", "check 2"],
        "recommendation": "recommendation text",
        "onsiteRequired": true
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
      { error: err?.message || 'Failed running fault diagnosis.' },
      { status: 500 }
    );
  }
}
