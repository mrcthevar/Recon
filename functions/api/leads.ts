
import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

// Utility to clean LLM output (strip markdown) before parsing
const cleanAndParseJSON = (text: string) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        // Simple extraction of first { to last }
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
        throw e;
    }
};

export const onRequestPost = async (context: any) => {
  try {
    if (typeof process === 'undefined') {
      (globalThis as any).process = { env: {} };
    }

    const { request, env } = context;
    const apiKey = env.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Configuration Error: API Key missing." }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { mode, industry, city, companyName, excludeNames, role } = await request.json();

    if (mode === 'lookup') {
        if (!companyName) return new Response(JSON.stringify({ error: "Company Name is required for lookup" }), { status: 400 });
    } else if (mode === 'discovery') {
        if (!industry || !city) return new Response(JSON.stringify({ error: "Industry and City are required" }), { status: 400 });
    } else if (mode === 'jobs') {
        if (!role || !city) return new Response(JSON.stringify({ error: "Role and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";
    const today = new Date().toDateString();

    const systemInstruction = `
      You are an expert Lead Generation & Recruitment Intelligence AI.
      CURRENT DATE: ${today}.
      
      CORE DIRECTIVE: Prioritize finding CONTACT INFORMATION, OPEN ROLES, and FRESH INTELLIGENCE.
      
      SEARCH RULES:
      1. Use the googleSearch tool to find the company website, careers page, linkedin, and contact pages.
      2. FOR 'recentWork', 'signals', and 'openRoles': You MUST use Google Search to find data from the last 30 days.
      3. IF MODE IS 'jobs': Look specifically for open job listings matching the user's requested role.
      4. TIME CHECK: Compare found dates with CURRENT DATE (${today}). Discard any job listings older than 30 days.
      5. Ensure all URLs are full and valid (https://).
    `;

    let prompt = '';
    if (mode === 'lookup') {
        prompt = `Target: "${companyName}" in "${city || 'any location'}". Find verified contact details and checking for any open roles related to creative, tech, or marketing.
        CRITICAL: Search for the absolute latest news relative to ${today}.`;
    } else if (mode === 'jobs') {
        prompt = `Find 5 ACTIVE companies in ${city} that have posted job listings for "${role}" in the LAST 30 DAYS.
        Exclude: ${exclusionList}.
        For each company, list specific open roles matching "${role}" (include title, estimated salary, and a direct link to the listing if found).
        Also find their general contact info and hiring culture.`;
    } else {
        prompt = `Find 5 ACTIVE ${industry} companies in ${city}. Exclude: ${exclusionList}. 
        For every lead, find specific contact info. 
        CRITICAL: Search for their latest activities relative to ${today}.`;
    }

    // Strict Schema Definition
    const schema = {
      type: Type.OBJECT,
      properties: {
        leads: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              website: { type: Type.STRING },
              location: { type: Type.STRING },
              description: { type: Type.STRING },
              needs: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              heroProduct: { type: Type.STRING },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              socials: { type: Type.STRING, description: "Space separated full URLs" },
              hotScore: { type: Type.INTEGER },
              hiringCulture: { type: Type.STRING, description: "Brief notes on their culture or hiring process" },
              openRoles: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                      title: { type: Type.STRING },
                      location: { type: Type.STRING },
                      type: { type: Type.STRING },
                      salary: { type: Type.STRING },
                      link: { type: Type.STRING }
                   }
                }
              },
              signals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    text: { type: Type.STRING, description: "Must be a recent event or fact found via search." },
                    confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                  },
                  required: ["type", "text", "confidence"]
                }
              }
            },
            required: ["name", "website", "description", "hotScore", "email"]
          }
        }
      },
      required: ["leads"]
    };

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      },
    });

    let data;
    try {
        // Robust parsing using the utility function
        data = cleanAndParseJSON(response.text || "{}");
    } catch (e) {
        console.error("JSON Parse Error:", response.text);
        throw new Error("Invalid JSON response from AI");
    }

    const leads = (data.leads || []).map((lead: any, index: number) => ({
        ...lead,
        id: `gen-${Date.now()}-${index}`,
        status: 'New',
        recentWork: lead.description, 
        website: lead.website || "N/A",
        phone: lead.phone || "N/A",
        email: lead.email || "N/A",
        socials: lead.socials || "N/A",
        signals: lead.signals || [],
        location: lead.location || city,
        openRoles: (lead.openRoles || []).map((r: any, ri: number) => ({
            ...r,
            id: `role-${Date.now()}-${index}-${ri}`,
            status: 'Saved'
        }))
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => ({
            title: chunk.web?.title || "Web Source",
            uri: chunk.web?.uri
        }))
        .filter((s: any) => s.uri)
        .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.uri === v.uri)) === i);

    return new Response(JSON.stringify({ leads, sources }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Leads API Critical Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};
