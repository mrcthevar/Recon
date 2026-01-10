

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
      
      HALLUCINATION ZERO-TOLERANCE POLICY:
      1. JOB TITLES MUST BE VERBATIM: You must extract the EXACT text of the job title from the search result snippet.
      2. DO NOT NORMALIZE: If the user searches for "SAS Programmer" but the website says "Data Manager", output "Data Manager".
      3. DO NOT INVENT: Do not create "Intern" or "Junior" roles unless the text explicitly says "Intern" or "Junior".
      4. EVIDENCE REQUIRED: If you cannot find a specific job listing URL active in the last 30 days, do not list that role.
      
      GENERAL RULES:
      1. Use the googleSearch tool to find verified data.
      2. Ensure all URLs are full and valid (https://).
      3. Discard any job listings older than 30 days.
    `;

    let prompt = '';
    if (mode === 'lookup') {
        prompt = `Target: "${companyName}" in "${city || 'any location'}". Find verified contact details and check for any open roles related to creative, tech, or marketing.
        CRITICAL: Search for the absolute latest news relative to ${today}.`;
    } else if (mode === 'jobs') {
        prompt = `GOAL: Find 5 active companies in ${city} with job openings related to "${role}".
        
        EXECUTION STEPS:
        1. Search for: "careers at companies in ${city} hiring ${role}".
        2. Look for specific job board postings or career page snippets from the LAST 30 DAYS.
        3. Extract the REAL job title found.
        
        STRICT OUTPUT RULES:
        - If you find a "Manager" role, list "Manager". Do NOT change it to "${role}" to match the user's query.
        - If a company has no active roles, skip it.
        - Exclude: ${exclusionList}.
        
        Return 5 companies with verified, verbatim job titles and direct links.`;
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
                      title: { type: Type.STRING, description: "The EXACT title found on the website. Do not rephrase." },
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
        temperature: 0.1, // Reduced for deterministic results
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
