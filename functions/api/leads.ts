
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
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    // Enhanced Structure for Evidence-Based Scoring
    const jsonStructure = `
    {
      "leads": [
        {
          "name": "string",
          "website": "string",
          "location": "string (City, Country)",
          "description": "string (short summary)",
          "needs": ["string (e.g. 'Hiring Developers', 'Rebranding')"],
          "heroProduct": "string",
          "phone": "string",
          "email": "string",
          "socials": "string (space separated urls)",
          "hotScore": number (0-100),
          "scoreReasoning": "string (Why is this score high/low?)",
          "signals": [
            { 
               "type": "string (e.g. 'Hiring', 'Growth', 'Tech Stack', 'News', 'Verified Location')", 
               "text": "string (Specific evidence, e.g. '3 Open Job Roles for React')",
               "confidence": "High" | "Medium" | "Low"
            }
          ]
        }
      ]
    }
    `;

    if (mode === 'lookup') {
        prompt = `
            Act as a B2B Intelligence Scout. Research "${companyName}" in "${city || 'any location'}".
            Use Google Maps to verify they exist physically.
            Look for evidence of activity (job postings, news, blog posts).
            Return valid JSON only. Structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            Act as a B2B Intelligence Scout. Find 5 ACTIVE companies in the ${industry} space in ${city}.
            Exclude: ${exclusionList}.
            
            CRITICAL: Only return companies where you can find EVIDENCE of activity (active website, recent job posts, or verified map location).
            
            For 'signals', extract specific facts that would help a salesperson pitch them.
            For 'hotScore', calculate based on: Website Quality + Verified Location + Recent Evidence.
            
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
      },
    });

    let text = response.text || "{}";
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

    // Post-process
    const leads = (data.leads || []).map((lead: any, index: number) => ({
        ...lead,
        id: `gen-${Date.now()}-${index}`,
        status: 'New',
        recentWork: lead.description, // Fallback
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
