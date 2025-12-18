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
    // Keep 2.5 Flash for Google Maps support
    const model = 'gemini-2.5-flash';

    let prompt = '';
    
    // Strict example line to guide the model
    const exampleLine = "Example Co | https://example.com | A leading digital agency | Web Dev | Custom Apps | 555-0123 | info@example.com | https://twitter.com/ex | 85 | Hiring:Devs;Growth:New Office";

    if (mode === 'lookup') {
        prompt = `
            Task: detailed research on company "${companyName}" in "${city}".
            Use Google Maps to verify they exist.
            
            Output: A SINGLE LINE of pipe-separated details.
            Format: Name | Website URL | Brief Description | Potential Service Need | Hero Product/Service | Phone Number | Email Address | Social Media URLs | Hot Score (0-100) | Signals
            
            Example output format:
            ${exampleLine}

            Rules:
            1. Hot Score: 0-100 based on digital presence/activity.
            2. Signals: 1-3 signals (e.g. Funding:Series A; Hiring:Designers). Separated by semicolons (;).
            3. Use "N/A" for missing text.
            4. Return ONLY the data line. No intro, no markdown.
        `;
    } else {
        const exclusionText = excludeNames && excludeNames.length > 0 
          ? `Exclude: ${excludeNames.join(', ')}.` 
          : '';

        prompt = `
          Task: List 10 active ${industry} companies in ${city}.
          ${exclusionText}
          
          Output: 10 lines of pipe-separated details.
          Format: Name | Website URL | Brief Description | Potential Service Need | Hero Product/Service | Phone Number | Email Address | Social Media URLs | Hot Score (0-100) | Signals
          
          Example output format:
          ${exampleLine}

          Rules:
          1. Hot Score: 0-100. 80+ is high-end/distinct.
          2. Signals: e.g. Hiring:Creative Director; Tech:Shopify; Growth:New Office. Format: "Type:Desc;Type:Desc".
          3. If Email/Phone missing, write "N/A".
          4. Social Media: Space separated URLs.
          5. STRICTLY NO MARKDOWN, NO TABLE HEADERS, JUST RAW DATA LINES.
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.6,
        systemInstruction: "You are a data extractor API. You output raw text data in pipe-separated format only. Do not converse."
      },
    });

    const text = response.text || "";
    
    const leads = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5 && line.includes('|') && !line.toLowerCase().includes('name | website')) 
      .map((line, index) => {
        // Remove markdown table borders if present
        const cleanLine = line.replace(/^\|/, '').replace(/\|$/, '');
        const parts = cleanLine.split('|').map(s => s.trim());
        
        const name = parts[0] || "Unknown Company";
        let website = parts[1] || "N/A";
        const description = parts[2] || "No description available";
        const need = parts[3] || "General Creative Services";
        const heroProduct = parts[4] || "Services";
        const phone = parts[5] || "N/A";
        const email = parts[6] || "N/A";
        const socials = parts[7] || "N/A";
        
        // Safety check for Hot Score to ensure it is a number
        let hotScore = 50;
        if (parts[8]) {
            const scoreMatch = parts[8].match(/(\d{1,3})/);
            if (scoreMatch) hotScore = parseInt(scoreMatch[0]);
        }
        
        const signalsRaw = parts[9] || "Growth:Active Business";

        // Parse Signals
        const signals = signalsRaw.split(';').map(s => {
            const [type, text] = s.split(':').map(x => x.trim());
            return { type: type || 'Info', text: text || type || 'General Info' };
        }).filter(s => s.text);

        website = website.replace(/\[.*?\]\(.*?\)/g, (match) => {
            const url = match.match(/\((.*?)\)/)?.[1];
            return url || "N/A";
        }).replace(/\.$/, '');

        const leadIndustry = mode === 'lookup' ? (industry || "General") : industry;

        return {
          id: `gen-${Date.now()}-${index}`,
          name: name,
          website: website,
          industry: leadIndustry,
          status: 'New',
          description: description,
          recentWork: "Identified via live search",
          needs: [need],
          heroProduct: heroProduct,
          phone: phone,
          email: email,
          socials: socials,
          hotScore: hotScore,
          signals: signals
        };
      });

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