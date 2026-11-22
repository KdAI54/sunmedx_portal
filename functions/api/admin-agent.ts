interface FunctionContext {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
  };
}

type WorkerMode = 'research' | 'course_gen' | 'tool_gen' | 'catalogue_gen' | 'ops_worker' | 'portal_clone';

const SUNMEDX_SYSTEM_INSTRUCTION = `You are the SunMedX Biomedical AI Worker — an autonomous, specialist engineering and operations agent embedded inside the SunMedX Admin Studio.

BRAND & DOMAIN TRAINING:
- Organization: SunMedX Biomedical (Mumbai, Maharashtra, India; GSTIN: 27AABCS1429B1Z5; Academy: https://sunmedxacademy.graphy.com).
- Core Services: NABL ISO/IEC 17025 calibration & validation, IEC 60601 electrical safety testing, NABH clinical equipment compliance audits, Annual/Comprehensive Maintenance Contracts (AMC/CMC), emergency repair dispatch, and biomedical IoT/HL7 integration.
- Equipment Focus: Multi-parameter ICU patient monitors, biphasic defibrillators, ICU ventilators, anesthesia workstations, syringe/infusion pumps, SpO2/ECG simulators, and traceable reference analyzers.
- Commercial Context: Currency is INR (Rs). Standard GST rate is 18% (9% CGST + 9% SGST intra-state or 18% IGST inter-state). Common HSN/SAC codes: 9018 (Medical/Surgical instruments), 9027 (Analysis instruments), 998719 (Maintenance & calibration services), 999293 (Training & Academy courses).
- Writing Style: Crisp, authoritative, clinical-grade engineering precision tailored for hospital biomedical HODs, procurement officers, and SunMedX administrators.`;

function cleanJsonText(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUpstreamGeminiError(status: number, rawText: string): { status: number; message: string } {
  if (status === 429 || rawText.includes('RESOURCE_EXHAUSTED') || rawText.toLowerCase().includes('quota')) {
    return {
      status: 429,
      message:
        'Gemini API quota or rate limit exceeded (429 RESOURCE_EXHAUSTED). Please wait a few seconds and retry, or check your Gemini API plan & billing key in Settings > Secrets.',
    };
  }
  if (status === 401 || status === 403 || rawText.includes('PERMISSION_DENIED') || rawText.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected (403 PERMISSION_DENIED). Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 404) {
    return { status: 404, message: 'Requested Gemini model is unavailable or unsupported.' };
  }
  return { status: status >= 400 ? status : 502, message: rawText || 'Gemini API error' };
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
      mode?: WorkerMode;
      prompt?: string;
      workspaceContext?: Record<string, unknown>;
      portalSpec?: Record<string, unknown>;
    };

    const allowedModes: WorkerMode[] = ['research', 'course_gen', 'tool_gen', 'catalogue_gen', 'ops_worker', 'portal_clone'];
    if (!body.mode || !allowedModes.includes(body.mode)) {
      return Response.json({ error: 'Invalid worker mode specified.' }, { status: 400 });
    }
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 6000) {
      return Response.json(
        { error: 'Provide a valid task instruction (1 to 6000 characters).' },
        { status: 400 }
      );
    }

    const contextSummary = body.workspaceContext
      ? `\n\nLIVE SUNMEDX ADMIN WORKSPACE CONTEXT:\n${JSON.stringify(body.workspaceContext).slice(0, 2500)}`
      : '';
    const specSummary = body.portalSpec
      ? `\n\nCLIENT PORTAL SPECIFICATION:\n${JSON.stringify(body.portalSpec).slice(0, 2500)}`
      : '';
    const fullPrompt = `${body.prompt.trim()}${contextSummary}${specSummary}`;

    const baseGenerationConfig: Record<string, unknown> =
      body.mode === 'research'
        ? { thinkingConfig: { thinkingLevel: 'LOW' } }
        : { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } };

    const generationPayload: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: SUNMEDX_SYSTEM_INSTRUCTION }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                body.mode === 'research'
                  ? `Perform live biomedical, regulatory, technical, or Indian hospital procurement research for SunMedX Admin on the following task. Organize findings clearly with practical engineering/business takeaways:\n\n${fullPrompt}`
                  : body.mode === 'course_gen'
                  ? `Return ONLY valid JSON with shape {"summary": string, "course": {"title": string, "level": "Beginner"|"Intermediate"|"Advanced", "duration": string, "language": string, "price": number, "featured": boolean, "graphyUrl": string, "targetAudience": string, "certificationNotes": string, "syllabus": [{"module": string, "topics": string[]}]}} for:\n\n${fullPrompt}`
                  : body.mode === 'tool_gen'
                  ? `Return ONLY valid JSON with shape {"summary": string, "tool": {"name": string, "category": string, "icon": string, "color": string, "isFree": boolean, "description": string, "formula": string, "outputLabel": string, "safetyThreshold": string, "inputs": [{"label": string, "unit": string, "defaultValue": string}]}} for:\n\n${fullPrompt}`
                  : body.mode === 'catalogue_gen'
                  ? `Return ONLY valid JSON with shape {"summary": string, "product": {"name": string, "price": number, "category": string, "badge": string, "description": string, "features": string[], "hsnSac": string, "suggestedAsset": "monitor"|"defibrillator"|"ventilator"|"analyzer"}} for:\n\n${fullPrompt}`
                  : body.mode === 'portal_clone'
                  ? `Return ONLY valid JSON cloning a white-label portal modeled after SunMedX for the requested brand and selective features, with shape {"summary": string, "portalBlueprint": {"brandName": string, "slug": string, "niche": string, "domain": string, "databaseId": string, "planType": "Basic"|"Professional"|"Enterprise", "setupFeeInr": number, "monthlyRetainerInr": number, "tagline": string, "merchantName": string, "companyGstin": string, "upiVpa": string, "supportPhone": string, "supportEmail": string, "address": string, "academyUrl": string, "enabledModules": string[], "homepageOrder": string[], "themeVariables": {"colorNavy": string, "colorCrimson": string, "colorAmber": string, "colorGolden": string, "colorDarkBg": string}, "services": [{"title": string, "description": string, "priceRange": string, "minPrice": number}], "products": [{"name": string, "price": number, "category": string, "badge": string, "description": string, "features": string[], "suggestedAsset": string}], "courses": [{"title": string, "level": string, "duration": string, "language": string, "price": number, "graphyUrl": string}], "tools": [{"name": string, "category": string, "icon": string, "color": string}], "chatbotQa": [{"question": string, "answer": string}]}}:\n\n${fullPrompt}`
                  : `Return ONLY valid JSON with shape {"summary": string, "deliverables": {"title": string, "checklist": string[], "recommendedActionType": "none"|"faq"|"announcement"|"quote_draft"|"sop", "faqEntry"?: {"question": string, "answer": string}, "announcementText"?: string, "quoteDraft"?: {"description": string, "hsnSac": string, "unitPrice": number, "quantity": number, "notes": string}}} for:\n\n${fullPrompt}`,
            },
          ],
        },
      ],
      generationConfig: baseGenerationConfig,
    };

    if (body.mode === 'research') {
      generationPayload.tools = [{ googleSearch: {} }];
    }

    const attempts = [
      { model: 'gemini-4-hydrogen', delayMs: 0, thinkingLevel: 'LOW' },
      { model: 'gemini-4-hydrogen', delayMs: 1200, thinkingLevel: 'LOW' },
      { model: 'gemini-3.1-flash-lite', delayMs: 1800, thinkingLevel: 'MINIMAL' },
    ];

    let geminiRes: Response | null = null;
    let lastErrStatus = 502;
    let lastErrText = '';

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) {
        await sleep(attempt.delayMs);
      }

      const payloadForAttempt = {
        ...generationPayload,
        generationConfig: {
          ...baseGenerationConfig,
          thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
        },
      };

      const attemptRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'aistudio-build',
          },
          body: JSON.stringify(payloadForAttempt),
        }
      );

      if (attemptRes.ok) {
        geminiRes = attemptRes;
        break;
      }

      lastErrStatus = attemptRes.status;
      lastErrText = await attemptRes.text();
      if (attemptRes.status !== 429 && attemptRes.status !== 503 && attemptRes.status !== 404) {
        break;
      }
    }

    if (!geminiRes) {
      const formatted = formatUpstreamGeminiError(lastErrStatus, lastErrText);
      return Response.json(
        {
          error: formatted.message,
          code: formatted.status,
          retryable: formatted.status === 429 || formatted.status === 503,
        },
        { status: formatted.status }
      );
    }

    const geminiJson = (await geminiRes.json()) as any;
    const rawText: string =
      geminiJson?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text || '')
        .join('') || '';

    if (body.mode === 'research') {
      const chunks = geminiJson?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: any) => c?.web)
        .filter((w: any) => w?.uri)
        .map((w: any) => ({
          title: w.title || w.uri,
          uri: w.uri,
        }));
      return Response.json({ mode: body.mode, text: rawText, sources });
    }

    const parsed = JSON.parse(cleanJsonText(rawText || '{}'));
    return Response.json({ mode: body.mode, ...parsed });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Biomedical AI Worker failed executing task.' },
      { status: 500 }
    );
  }
}
