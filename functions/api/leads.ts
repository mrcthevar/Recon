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
    // Using gemini-2.5-flash for reliable Google Maps + JSON Schema support
    const model = 'gemini-2.5-flash';

    const exclusionList = excludeNames && excludeNames.length > 0 ? excludeNames.join(', ') : "None";

    let prompt = '';
    
    if (mode === 'lookup') {
        prompt = `
            Perform detailed reconnaissance on the company "${companyName}" located in or near "${city}".
            Use Google Maps to find their real-world existence, location, and details.
            
            Return a SINGLE company object in the specified JSON schema.
        `;
    } else {
        prompt = `
            Scout for 10 high-potential, active ${industry} companies or agencies in ${city}.
            
            CRITICAL EXCLUSION LIST: Do NOT include these companies: ${exclusionList}.
            
            For each company found via Google Maps:
            1. Analyze their digital presence and activity.
            2. Calculate a "Hot Score" (0-100) based on this formula:
               (Hiring Signals * 30) + (Recent Funding * 25) + (Modern Website/Branding * 20) + (Team Growth * 15) + (Industry Fit * 10).
               Estimate these values based on available data.
            3. Extract "Tactical Signals" (e.g. "Hiring: Senior Designer", "News: Series A Funding", "Tech: Using Shopify").
            
            Return the results in the specified JSON schema.
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leads: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  website: { type: Type.STRING },
                  description: { type: Type.STRING },
                  needs: { type: Type.ARRAY, items: { type: Type.STRING } },
                  heroProduct: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  email: { type: Type.STRING },
                  socials: { type: Type.STRING },
                  hotScore: { type: Type.INTEGER },
                  scoreReasoning: { type: Type.STRING },
                  signals: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        text: { type: Type.STRING }
                      }
                    }
                  }
                },
                required: ["name", "hotScore", "signals"]
              }
            }
          }
        }
      },
    });

    const text = response.text || "{}";
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error", text);
        throw new Error("Failed to parse intelligence data.");
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
        // Flatten signals if the model returns them nested or weirdly, though schema helps
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