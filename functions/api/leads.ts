

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
    } else if (mode === 'people') {
        if (!role || !city) return new Response(JSON.stringify({ error: "Role and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";
    const today = new Date().toDateString();

    const systemInstruction = `
      You are an expert Lead Generation & Recruitment Intelligence AI.
      CURRENT DATE: ${today}.
      
      ACCURACY PROTOCOL:
      1. JOB TITLES: Prefer VERBATIM extraction. However, if a specific role isn't found but the company is a strong match, you may list "General Application" or "Open Talent Network".
      2. URLS: You MUST find a valid URL. If a specific job post URL is unavailable (e.g. behind a login or SPA), use the main Careers Page URL.
      3. INTEGRITY: Do not invent salary numbers. Use "Not Disclosed" if missing.
      4. RELEVANCE: Prioritize companies with activity in the LAST 30 DAYS.
      
      FALLBACK STRATEGY:
      If you find a perfect company for the user's industry but cannot verify a *specific* open role, you SHOULD still return the company as a lead, but mark the openRole title as "Unverified" or "See Careers Page".
    `;

    let prompt = '';
    if (mode === 'lookup') {
        prompt = `Target: "${companyName}" in "${city || 'any location'}". Find verified contact details and check for any open roles related to creative, tech, or marketing.
        CRITICAL: Search for the absolute latest news relative to ${today}.`;
    } else if (mode === 'jobs') {
        prompt = `GOAL: Find 5 active companies in ${city} with job openings related to "${role}".
        
        EXECUTION STEPS:
        1. Search for: "careers at companies in ${city} hiring ${role}".
        2. Filter for postings from the LAST 30 DAYS.
        3. If a specific job link is found, use it.
        4. If NOT found, but the company is hiring generally, use the main Careers Page.
        
        OUTPUT RULES:
        - If the exact role "${role}" is not found, list the closest actual matches.
        - Exclude: ${exclusionList}.
        
        Return 5 companies.`;
    } else if (mode === 'people') {
        prompt = `GOAL: Find 5 active professionals/freelancers in ${city} with the role/title of "${role}".
        
        EXECUTION STEPS:
        1. Search for: "${role} in ${city} portfolio contact".
        2. Find their specific contact info (email, phone, socials, portfolio).
        3. Extract their recent work or bio.
        
        OUTPUT RULES:
        - Exclude: ${exclusionList}.
        - Return 5 people.
        - Map their name to the 'name' field, their portfolio to 'website', their role to 'industry', their bio to 'description'.
        - Map their skills to 'needs'.
        - Map their most notable project or current status to 'heroProduct'.
        - Map their email to 'email' and phone to 'phone'.`;
    } else {
        prompt = `Find 5 ACTIVE ${industry} companies in ${city}. 
        If multiple cities are provided in "${city}", find top companies distributed across them.
        Exclude: ${exclusionList}. 
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
                      title: { type: Type.STRING, description: "The job title or 'General Application'" },
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
        temperature: 0.1, // Keep it deterministic
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
