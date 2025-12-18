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

    // Validate inputs based on mode
    if (mode === 'lookup') {
        if (!companyName) return new Response(JSON.stringify({ error: "Company Name is required for lookup" }), { status: 400 });
    } else {
        // Discovery mode (default)
        if (!industry || !city) return new Response(JSON.stringify({ error: "Industry and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-2.5-flash';

    let prompt = '';

    if (mode === 'lookup') {
        console.log(`Looking up specific company: ${companyName} in ${city}...`);
        prompt = `
            Find details for the company "${companyName}" located in or near "${city}".
            I need you to use Google Maps to find this specific existing company.
            
            Output the details in this exact format on a single line:
            Name | Website URL | Brief Description | Potential Service Need | Hero Product/Service | Phone Number | Email Address | Social Media URLs (space separated)

            Rules:
            1. If exact website is not found, "N/A".
            2. "Potential Service Need" should be a guess based on their business.
            3. "Hero Product" is their main offering.
            4. If Phone/Email not found, "N/A".
            5. For Social Media, list full URLs separated by spaces. If none, "N/A".
            6. Return ONLY that single line.
        `;
    } else {
        console.log(`Searching for ${industry} in ${city}...`);
        const exclusionText = excludeNames && excludeNames.length > 0 
          ? `Do NOT include these companies: ${excludeNames.join(', ')}.` 
          : '';

        prompt = `
          Find 10 active ${industry} companies or agencies in ${city}.
          ${exclusionText}
          
          I need you to use Google Maps to find real, existing companies.
          
          For each company found, strictly output the details in this exact format on a single line (use "N/A" if info is missing):
          Name | Website URL | Brief Description | Potential Service Need | Hero Product/Service | Phone Number | Email Address | Social Media URLs (space separated)
          
          Rules:
          1. "Hero Product/Service" is their main offering.
          2. "Potential Service Need" is a guess based on their type.
          3. If Email/Phone not found, write "N/A".
          4. For Social Media, list full URLs separated by spaces. If none, "N/A".
          5. Do not include any intro/outro. Just the pipe-separated list.
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

    const text = response.text || "";
    console.log("Gemini Response Text:", text);

    if (!text) {
       return new Response(JSON.stringify({ leads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const leads = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5 && line.includes('|') && !line.toLowerCase().includes('name | website') && !line.match(/^[\s|\-]+$/)) 
      .map((line, index) => {
        const cleanLine = line.replace(/^\|/, '').replace(/\|$/, '').trim();
        const parts = cleanLine.split('|').map(s => s.trim());
        
        const name = parts[0] || "Unknown Company";
        let website = parts[1] || "N/A";
        const description = parts[2] || "No description available";
        const need = parts[3] || "General Creative Services";
        const heroProduct = parts[4] || "Services";
        const phone = parts[5] || "N/A";
        const email = parts[6] || "N/A";
        const socials = parts[7] || "N/A";

        website = website.replace(/\[.*?\]\(.*?\)/g, (match) => {
            const url = match.match(/\((.*?)\)/)?.[1];
            return url || "N/A";
        }).replace(/\.$/, '');

        // For lookup mode, infer industry if possible or set generic
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
          socials: socials
        };
      });

    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Leads API Critical Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown Server Error";
    return new Response(JSON.stringify({ error: errorMessage, stack: error.stack }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};