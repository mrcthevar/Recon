
import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

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

    const { mode, industry, city, companyName, excludeNames } = await request.json();

    if (mode === 'lookup') {
        if (!companyName) return new Response(JSON.stringify({ error: "Company Name is required for lookup" }), { status: 400 });
    } else {
        if (!industry || !city) return new Response(JSON.stringify({ error: "Industry and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    const systemInstruction = `
      You are an expert Lead Generation AI agent.
      CORE DIRECTIVE: Prioritize finding CONTACT INFORMATION (Phone, Email, Social Links).
      
      SEARCH RULES:
      1. Use the googleSearch tool to find the company website, linkedin, and contact pages.
      2. If a direct email is missing, look for generic ones (info@, hello@).
      3. Do not return "N/A" unless you have verified it does not exist.
      4. Ensure all URLs are full and valid (https://).
    `;

    let prompt = '';
    if (mode === 'lookup') {
        prompt = `Target: "${companyName}" in "${city || 'any location'}". Find verified contact details, key needs, and social profiles.`;
    } else {
        prompt = `Find 5 ACTIVE ${industry} companies in ${city}. Exclude: ${exclusionList}. For every lead, find specific contact info and key business needs.`;
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
              signals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    text: { type: Type.STRING },
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

    // With responseSchema, response.text is guaranteed to be valid JSON structure
    let data;
    try {
        data = JSON.parse(response.text || "{}");
    } catch (e) {
        // Fallback for extremely rare edge cases
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
        location: lead.location || city
    }));

    // Extract Grounding Chunks (Sources)
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
    