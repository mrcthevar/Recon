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
    // Using gemini-2.5-flash for reliable Google Maps support
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    // Explicitly define schema in the prompt text since we can't use responseSchema with Google Maps
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
          "socials": "string (space separated URLs)",
          "hotScore": number (0-100),
          "scoreReasoning": "string",
          "signals": [{ "type": "string", "text": "string" }]
        }
      ]
    }
    `;

    if (mode === 'lookup') {
        prompt = `
            Perform detailed reconnaissance on the company "${companyName}" located in or near "${city}".
            Use Google Maps to find their real-world existence, location, and details.
            
            Return ONLY valid JSON matching this structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            Task: Scout for 10 high-potential, active ${industry} companies or agencies in ${city} using Google Maps.
            
            CRITICAL EXCLUSION LIST: Do NOT include these companies: ${exclusionList}.
            
            Steps:
            1. Use Google Maps to find real companies.
            2. Analyze their digital presence.
            3. Calculate "Hot Score" (0-100) = (Hiring*30 + Funding*25 + Website*20 + Growth*15 + Industry*10).
            4. Extract "Tactical Signals".
            
            Return ONLY valid JSON matching this structure:
            ${jsonStructure}
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.5,
        // responseMimeType and responseSchema are NOT supported with googleMaps
      },
    });

    let text = response.text || "{}";
    
    // Clean up markdown code blocks if the model includes them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error", text);
        // Fallback or better error message
        return new Response(JSON.stringify({ error: "AI Intelligence extraction failed to format data correctly. Please try again." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Post-process to ensure IDs and defaults
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
    return new Response(JSON.stringify({ error: error.message || "Unknown Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};