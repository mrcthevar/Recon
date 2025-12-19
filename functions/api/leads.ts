import { GoogleGenAI } from "@google/genai";

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
    // Using gemini-2.5-flash as it is the standard for Maps Grounding
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    // Simplified structure request for robustness
    const jsonStructure = `
    {
      "leads": [
        {
          "name": "string",
          "website": "string",
          "description": "string",
          "needs": ["string"],
          "heroProduct": "string",
          "phone": "string",
          "email": "string",
          "socials": "string",
          "hotScore": number,
          "scoreReasoning": "string",
          "signals": [{ "type": "string", "text": "string" }]
        }
      ]
    }
    `;

    if (mode === 'lookup') {
        prompt = `
            Research the company "${companyName}" in "${city}".
            Use Google Maps to verify details.
            Return valid JSON only. Structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            Find 5 active ${industry} companies in ${city}.
            Exclude: ${exclusionList}.
            Use Google Maps to verify.
            Return valid JSON only. Structure:
            ${jsonStructure}
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.5,
        // Removed responseMimeType entirely to avoid 'application/json' conflict with Maps tool
      },
    });

    let text = response.text || "{}";
    
    // Aggressive cleanup for markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Find the first { and last } to extract JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error on text:", text);
        return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Post-process
    const leads = (data.leads || []).map((lead: any, index: number) => ({
        ...lead,
        id: `gen-${Date.now()}-${index}`,
        status: 'New',
        recentWork: "Identified via live search",
        website: lead.website || "N/A",
        phone: lead.phone || "N/A",
        email: lead.email || "N/A",
        socials: lead.socials || "N/A",
        signals: lead.signals || []
    }));

    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Leads API Critical Error:", error);
    // Return the raw error message to help debugging
    return new Response(JSON.stringify({ error: error.message || "Unknown Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};