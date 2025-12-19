
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
    
    // Gemini 2.5 Flash is required for Maps + Search combo
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    const jsonStructure = `
    {
      "leads": [
        {
          "name": "string",
          "website": "string (Must be the specific company URL, not a directory)",
          "location": "string (City, Country)",
          "description": "string (short summary)",
          "needs": ["string (e.g. 'Hiring Developers', 'Rebranding')"],
          "heroProduct": "string",
          "phone": "string (Look for local numbers on Contact pages)",
          "email": "string (Look for info@, hello@, or specific contact emails)",
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
            Act as a highly skilled Open Source Intelligence (OSINT) investigator. 
            Target: "${companyName}" in "${city || 'any location'}".
            
            TASKS:
            1. Use Google Search to find their OFFICIAL website.
            2. "Scrape" the website content (mentally) to find their specific email address and phone number (Check headers, footers, and 'Contact Us' pages).
            3. Use Google Maps to verify they have a physical presence.
            4. Look for recent news, blog posts, or social media activity to gauge their status.

            Return valid JSON only. Structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            Act as a highly skilled Open Source Intelligence (OSINT) investigator.
            Mission: Find 5 ACTIVE companies in the ${industry} space in ${city}.
            Exclude: ${exclusionList}.
            
            EXECUTION STEPS:
            1. Use Google Search to identify potential candidates.
            2. For each candidate, verify they are active by looking for recent activity (2024-2025).
            3. DEEP DIVE for Contact Info: You MUST try to find a real email address and phone number by searching for their "Contact Us" page or Facebook "About" section. Do not return "N/A" unless absolutely impossible to find.
            4. Use Google Maps to verify their location.
            
            SCORING:
            - High Score (80+): Has Website + Email + Verified Map Location + Recent News.
            - Low Score: Missing contact info or inactive website.
            
            Return valid JSON only. Structure:
            ${jsonStructure}
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        // We use BOTH Search (for scraping info) and Maps (for location verification)
        tools: [
            { googleSearch: {} },
            { googleMaps: {} }
        ],
        temperature: 0.5,
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

    // Post-process to ensure fields exist
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
