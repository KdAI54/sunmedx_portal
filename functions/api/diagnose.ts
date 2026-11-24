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
              responseMimeType: 'application/json',
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
          ? 'Gemini API quota or rate limit exceeded (429 RESOURCE_EXHAUSTED). Please wait a few seconds and retry, or check Settings > Secrets.'
          : lastErrText || 'Gemini API error';
      return Response.json({ error: msg, code: lastStatus }, { status: lastStatus >= 400 ? lastStatus : 502 });
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
