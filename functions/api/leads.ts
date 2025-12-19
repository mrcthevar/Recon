
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
    
    // Gemini 2.5 Flash is the fastest model for Search Grounding
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    // We simplify the requested JSON reasoning fields to save generation tokens/time
    const jsonStructure = `
    {
      "leads": [
        {
          "name": "string",
          "website": "string",
          "location": "string",
          "description": "string (Max 15 words)",
          "needs": ["string (Key needs only)"],
          "heroProduct": "string",
          "phone": "string",
          "email": "string",
          "socials": "string",
          "hotScore": number (0-100),
          "signals": [
            { 
               "type": "string", 
               "text": "string (Concise evidence)",
               "confidence": "High" | "Medium" | "Low"
            }
          ]
        }
      ]
    }
    `;

    // Prompt optimized for VELOCITY
    if (mode === 'lookup') {
        prompt = `
            FAST OSINT TASK: Target "${companyName}" in "${city || 'any location'}".
            
            PROTOCOL:
            1. Use Google Search to find Official Website + Contact Page + Socials.
            2. EXTRACT email/phone. Look for "info@", "hello@", or footer details.
            3. Verify location via Search Snippets (do not use Maps tool).
            
            Return JSON only. Structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            FAST SCOUT MISSION: Find 5 ACTIVE ${industry} companies in ${city}.
            Exclude: ${exclusionList}.
            
            SPEED PROTOCOL:
            1. SEARCH EFFICIENTLY: Use queries like "${industry} companies ${city} directory" or "top ${industry} agencies ${city}".
            2. FOR EACH TARGET: Perform ONE targeted search for contact info (e.g. "Company Name email phone contact"). 
            3. IGNORE companies with no web presence.
            4. VERIFY location via search snippet.
            
            Return JSON only. Structure:
            ${jsonStructure}
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        // OPTIMIZATION: Removed googleMaps to reduce latency. Search is sufficient for location verification.
        tools: [
            { googleSearch: {} } 
        ],
        // Lower temperature for faster, more deterministic extraction
        temperature: 0.3,
      },
    });

    let text = response.text || "{}";
    
    // Robust JSON extraction
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
