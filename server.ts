import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function cleanJsonText(raw: string): string {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

const SUNMEDX_SYSTEM_INSTRUCTION = `You are the SunMedX Biomedical AI Worker — an autonomous, specialist engineering and operations agent embedded inside the SunMedX Admin Studio.

BRAND & DOMAIN TRAINING:
- Organization: SunMedX Biomedical (Mumbai, Maharashtra, India; GSTIN: 27AABCS1429B1Z5; Academy: https://sunmedxacademy.graphy.com).
- Core Services: NABL ISO/IEC 17025 calibration & validation, IEC 60601 electrical safety testing, NABH clinical equipment compliance audits, Annual/Comprehensive Maintenance Contracts (AMC/CMC), emergency repair dispatch, and biomedical IoT/HL7 integration.
- Equipment Focus: Multi-parameter ICU patient monitors, biphasic defibrillators, ICU ventilators, anesthesia workstations, syringe/infusion pumps, SpO2/ECG simulators, and traceable reference analyzers.
- Commercial Context: Currency is INR (Rs). Standard GST rate is 18% (9% CGST + 9% SGST intra-state or 18% IGST inter-state). Common HSN/SAC codes: 9018 (Medical/Surgical instruments), 9027 (Analysis instruments), 998719 (Maintenance & calibration services), 999293 (Training & Academy courses).
- Writing Style: Crisp, authoritative, clinical-grade engineering precision tailored for hospital biomedical HODs, procurement officers, and SunMedX administrators.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // API Route - Payment Gateway Server Secret Readiness (booleans only, never exposes secret strings)
  app.get("/api/payments/status", (_req, res) => {
    res.json({
      razorpaySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.trim().length > 0),
      stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim().length > 0),
      webhookSecretConfigured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET && process.env.PAYMENT_WEBHOOK_SECRET.trim().length > 0),
      runtime: "express-node",
    });
  });

  // API Route - Biomedical AI Agent / Worker (Admin Studio)
  app.post("/api/admin-agent", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY environment variable is required on the server. Configure it in Settings > Secrets.",
        });
      }

      const { mode, prompt, workspaceContext, portalSpec } = req.body || {};
      const allowedModes = ["research", "course_gen", "tool_gen", "catalogue_gen", "ops_worker", "portal_clone"] as const;
      if (!mode || !allowedModes.includes(mode)) {
        return res.status(400).json({ error: "Invalid worker mode specified." });
      }
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 6000) {
        return res.status(400).json({ error: "Provide a valid task instruction (1 to 6000 characters)." });
      }

      const ai = createGeminiClient(apiKey);
      const contextSummary = workspaceContext
        ? `\n\nLIVE SUNMEDX ADMIN WORKSPACE CONTEXT:\n${JSON.stringify(workspaceContext).slice(0, 2500)}`
        : "";
      const fullPrompt = `${prompt.trim()}${contextSummary}`;

      if (mode === "research") {
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Perform live biomedical, regulatory, technical, or Indian hospital procurement research for SunMedX Admin on the following task. Organize findings clearly with practical engineering/business takeaways for SunMedX:\n\n${fullPrompt}`,
          config: {
            systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
          },
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = chunks
          .map((c: any) => c?.web)
          .filter((w: any) => w?.uri)
          .map((w: any) => ({
            title: w.title || w.uri,
            uri: w.uri,
          }));

        return res.json({
          mode,
          text: response.text || "No research output generated.",
          sources,
        });
      }

      if (mode === "course_gen") {
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Design a complete SunMedX Academy training course ready to publish in the Academy Manager:\n\n${fullPrompt}`,
          config: {
            systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                course: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    level: { type: Type.STRING, description: "Beginner, Intermediate, or Advanced" },
                    duration: { type: Type.STRING, description: "e.g. 6 Weeks" },
                    language: { type: Type.STRING, description: "e.g. English / Hindi" },
                    price: { type: Type.NUMBER, description: "INR tuition fee, 0 for free certification" },
                    featured: { type: Type.BOOLEAN },
                    graphyUrl: { type: Type.STRING, description: "Valid URL starting with https://sunmedxacademy.graphy.com/courses/" },
                    targetAudience: { type: Type.STRING },
                    certificationNotes: { type: Type.STRING },
                    syllabus: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          module: { type: Type.STRING },
                          topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["module", "topics"],
                      },
                    },
                  },
                  required: ["title", "level", "duration", "language", "price", "featured", "graphyUrl", "syllabus"],
                },
              },
              required: ["summary", "course"],
            },
          },
        });

        const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
        return res.json({ mode, ...parsed });
      }

      if (mode === "tool_gen") {
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Design a clinical biomedical engineering tool or calculator for SunMedX sidebar deployment (categories: Critical Care, Pacing, Metrology, Gas Systems, Safety Audit, Diagnostics). Provide a FontAwesome 6 solid icon class (e.g. 'fa-solid fa-calculator', 'fa-solid fa-heart-pulse', 'fa-solid fa-lungs', 'fa-solid fa-bolt', 'fa-solid fa-gauge-high') and hex accent color:\n\n${fullPrompt}`,
          config: {
            systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                tool: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    icon: { type: Type.STRING },
                    color: { type: Type.STRING },
                    isFree: { type: Type.BOOLEAN },
                    description: { type: Type.STRING },
                    formula: { type: Type.STRING },
                    outputLabel: { type: Type.STRING },
                    safetyThreshold: { type: Type.STRING },
                    inputs: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          unit: { type: Type.STRING },
                          defaultValue: { type: Type.STRING },
                        },
                        required: ["label", "unit", "defaultValue"],
                      },
                    },
                  },
                  required: ["name", "category", "icon", "color", "isFree", "description", "formula", "inputs", "outputLabel", "safetyThreshold"],
                },
              },
              required: ["summary", "tool"],
            },
          },
        });

        const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
        return res.json({ mode, ...parsed });
      }

      if (mode === "catalogue_gen") {
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Draft a complete SunMedX E-Catalogue equipment listing with Indian market INR pricing (use 0 for Price on Request), category ('Critical Care', 'Emergency', 'Accessories', 'Testing Tools', or 'General Care'), badge, clinical description, 4 concise feature bullets, HSN/SAC code, and matching studio asset ('monitor', 'defibrillator', 'ventilator', or 'analyzer'):\n\n${fullPrompt}`,
          config: {
            systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                product: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER, description: "INR amount or 0 for RFQ" },
                    category: { type: Type.STRING },
                    badge: { type: Type.STRING },
                    description: { type: Type.STRING },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hsnSac: { type: Type.STRING },
                    suggestedAsset: { type: Type.STRING },
                  },
                  required: ["name", "price", "category", "badge", "description", "features", "hsnSac", "suggestedAsset"],
                },
              },
              required: ["summary", "product"],
            },
          },
        });

        const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
        return res.json({ mode, ...parsed });
      }

      if (mode === "portal_clone") {
        const specText = portalSpec ? `\n\nCLIENT PORTAL SPECIFICATION:\n${JSON.stringify(portalSpec).slice(0, 2500)}` : "";
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `You are cloning and tailoring a complete white-label biomedical / healthcare service portal modeled after SunMedX for a new client brand. Generate ONLY the requested selective features if specific modules are false, or the full suite if all are enabled. Provide valid hex colors (6 digits with #), INR pricing, realistic starter data, and Cloudflare deployment naming.\n\n${fullPrompt}${specText}`,
          config: {
            systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                portalBlueprint: {
                  type: Type.OBJECT,
                  properties: {
                    brandName: { type: Type.STRING },
                    slug: { type: Type.STRING },
                    niche: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    databaseId: { type: Type.STRING },
                    planType: { type: Type.STRING, description: "Basic, Professional, or Enterprise" },
                    setupFeeInr: { type: Type.NUMBER },
                    monthlyRetainerInr: { type: Type.NUMBER },
                    tagline: { type: Type.STRING },
                    merchantName: { type: Type.STRING },
                    companyGstin: { type: Type.STRING },
                    upiVpa: { type: Type.STRING },
                    supportPhone: { type: Type.STRING },
                    supportEmail: { type: Type.STRING },
                    address: { type: Type.STRING },
                    academyUrl: { type: Type.STRING },
                    enabledModules: { type: Type.ARRAY, items: { type: Type.STRING } },
                    homepageOrder: { type: Type.ARRAY, items: { type: Type.STRING } },
                    themeVariables: {
                      type: Type.OBJECT,
                      properties: {
                        colorNavy: { type: Type.STRING },
                        colorCrimson: { type: Type.STRING },
                        colorAmber: { type: Type.STRING },
                        colorGolden: { type: Type.STRING },
                        colorDarkBg: { type: Type.STRING },
                      },
                      required: ["colorNavy", "colorCrimson", "colorAmber", "colorGolden", "colorDarkBg"],
                    },
                    services: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          priceRange: { type: Type.STRING },
                          minPrice: { type: Type.NUMBER },
                        },
                        required: ["title", "description", "priceRange", "minPrice"],
                      },
                    },
                    products: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          price: { type: Type.NUMBER },
                          category: { type: Type.STRING },
                          badge: { type: Type.STRING },
                          description: { type: Type.STRING },
                          features: { type: Type.ARRAY, items: { type: Type.STRING } },
                          suggestedAsset: { type: Type.STRING },
                        },
                        required: ["name", "price", "category", "badge", "description", "features", "suggestedAsset"],
                      },
                    },
                    courses: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          level: { type: Type.STRING },
                          duration: { type: Type.STRING },
                          language: { type: Type.STRING },
                          price: { type: Type.NUMBER },
                          graphyUrl: { type: Type.STRING },
                        },
                        required: ["title", "level", "duration", "language", "price", "graphyUrl"],
                      },
                    },
                    tools: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          category: { type: Type.STRING },
                          icon: { type: Type.STRING },
                          color: { type: Type.STRING },
                        },
                        required: ["name", "category", "icon", "color"],
                      },
                    },
                    chatbotQa: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING },
                          answer: { type: Type.STRING },
                        },
                        required: ["question", "answer"],
                      },
                    },
                  },
                  required: [
                    "brandName",
                    "slug",
                    "niche",
                    "domain",
                    "databaseId",
                    "planType",
                    "setupFeeInr",
                    "monthlyRetainerInr",
                    "tagline",
                    "merchantName",
                    "companyGstin",
                    "upiVpa",
                    "supportPhone",
                    "supportEmail",
                    "address",
                    "academyUrl",
                    "enabledModules",
                    "homepageOrder",
                    "themeVariables",
                    "services",
                    "products",
                    "courses",
                    "tools",
                    "chatbotQa",
                  ],
                },
              },
              required: ["summary", "portalBlueprint"],
            },
          },
        });

        const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
        return res.json({ mode, ...parsed });
      }

      // ops_worker
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Execute this SunMedX administrative operations task (SOP drafting, RFQ pricing analysis, AMC proposal drafting, site announcement marquee, or Public FAQ Q&A synthesis). Return actionable output:\n\n${fullPrompt}`,
        config: {
          systemInstruction: SUNMEDX_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              deliverables: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendedActionType: {
                    type: Type.STRING,
                    description: "One of: none, faq, announcement, quote_draft, sop",
                  },
                  faqEntry: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      answer: { type: Type.STRING },
                    },
                    required: ["question", "answer"],
                  },
                  announcementText: { type: Type.STRING },
                  quoteDraft: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      hsnSac: { type: Type.STRING },
                      unitPrice: { type: Type.NUMBER },
                      quantity: { type: Type.INTEGER },
                      notes: { type: Type.STRING },
                    },
                    required: ["description", "hsnSac", "unitPrice", "quantity", "notes"],
                  },
                },
                required: ["title", "checklist", "recommendedActionType"],
              },
            },
            required: ["summary", "deliverables"],
          },
        },
      });

      const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
      return res.json({ mode, ...parsed });
    } catch (error: any) {
      console.error("Admin AI Worker error:", error);
      return res.status(500).json({
        error: error?.message || "Biomedical AI Worker failed executing task.",
      });
    }
  });

  // API Route - AI Fault Diagnosis
  app.post("/api/diagnose", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required on the server." });
      }

      const { equipmentType, problemDescription } = req.body;
      if (!equipmentType || !problemDescription) {
        return res.status(400).json({ error: "Missing equipmentType or problemDescription" });
      }

      const ai = createGeminiClient(apiKey);
      const prompt = `
        You are an expert clinical biomedical engineer specializing in fault diagnosis for hospital medical devices. 
        Analyze the provided medical equipment type and described problem to recommend:
        1. Probable root causes (array of strings)
        2. Severity level ('Low' | 'Medium' | 'High')
        3. Step-by-step diagnostic or safety inspection checks (array of strings)
        4. Recommended resolution, specifying if an expert engineering onsite visit is required.
        
        Equipment Type: ${equipmentType}
        Problem Description: ${problemDescription}

        Format your reply as a strict, valid JSON object with the following keys, without any markdown backticks or block formatting wrappers:
        {
          "causes": ["cause 1", "cause 2"],
          "severity": "High",
          "checks": ["check 1", "check 2"],
          "recommendation": "recommendation text",
          "onsiteRequired": true
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt
      });

      const diagnosis = JSON.parse(cleanJsonText(response.text || ""));
      res.json(diagnosis);
    } catch (error: any) {
      console.error("Diagnosis endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed running AI fault diagnosis simulator." });
    }
  });

  // API Route - AI Quote Suggestion
  app.post("/api/suggest-quote", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required on the server." });
      }

      const { deviceModel, serviceType, quantity, city, notes } = req.body;
      const ai = createGeminiClient(apiKey);
      const prompt = `
        You are a senior service quotation analyst for SunMedX Biomedical engineering brand in India.
        Analyze the provided quote request:
        - Device Model: ${deviceModel}
        - Service Type: ${serviceType}
        - Quantity: ${quantity}
        - City Location: ${city}
        - Additional Notes: ${notes || "None"}

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

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt
      });

      const quotation = JSON.parse(cleanJsonText(response.text || ""));
      res.json(quotation);
    } catch (error: any) {
      console.error("Quotation AI endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed running AI quote simulator." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK SERVER] Running on host 0.0.0.0 inside container port ${PORT}`);
  });
}

startServer();
