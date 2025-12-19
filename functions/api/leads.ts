
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
    
    // Using Gemini 3 Flash Preview for optimal speed and search grounding support
    const model = 'gemini-3-flash-preview';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    const jsonStructure = `
    {
      "leads": [
        {
          "name": "string",
          "website": "string (Full URL starting with https://)",
          "location": "string",
          "description": "string (Max 15 words)",
          "needs": ["string (Key needs only)"],
          "heroProduct": "string",
          "phone": "string (MUST TRY TO FIND - SEARCH HARD)",
          "email": "string (MUST TRY TO FIND - SEARCH HARD)",
          "socials": "string (Space separated FULL URLs starting with https:// - REQUIRED)",
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

    // SYSTEM INSTRUCTION: Sets the baseline behavior to be aggressive about contacts
    const systemInstruction = `
      You are an expert Lead Generation AI agent.
      
      CORE DIRECTIVE: You MUST prioritize finding CONTACT INFORMATION (Phone, Email, Social Links) above all else.
      
      SEARCH RULES:
      1. Always search for "[Company] contact phone email".
      2. Always search for "[Company] facebook instagram linkedin" to find social profiles, as they often contain phone numbers/emails missing from websites.
      3. If a direct email is missing, look for "info@", "hello@", or "contact@" addresses on their homepage or social media.
      4. Do not return "N/A" for Phone or Email unless you have verified it does not exist on their Website, Facebook, AND Instagram.
      5. Ensure all website and social URLs are FULL and VALID (start with https://).
    `;

    if (mode === 'lookup') {
        prompt = `
            DEEP OSINT TASK: Target "${companyName}" in "${city || 'any location'}".
            
            OBJECTIVE: Find confirmed contact details (Phone, Email, Socials).
            
            PROTOCOL:
            1. Search for official website.
            2. Search for "${companyName} contact email phone".
            3. Search for "${companyName} LinkedIn" or Facebook to find contact info in profiles.
            
            Return JSON only. Structure:
            ${jsonStructure}
        `;
    } else {
        prompt = `
            SCOUT MISSION: Find 5 ACTIVE ${industry} companies in ${city}.
            Exclude: ${exclusionList}.
            
            CRITICAL: For every lead found, you must perform a secondary search for their contact info.
            
            PROTOCOL:
            1. SEARCH: "${industry} companies ${city} directory".
            2. FOR EACH LEAD:
               - Search for "[Lead Name] ${city} phone email social media".
               - Check the snippets for phone numbers (look for local area codes).
               - Check the snippets for emails (look for @ symbol).
            
            Return JSON only. Structure:
            ${jsonStructure}
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [
            { googleSearch: {} } 
        ],
        temperature: 0.4,
        systemInstruction: systemInstruction
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
