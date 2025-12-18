import { GoogleGenAI } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
    // Polyfill process for libraries that expect it
    if (typeof process === 'undefined') {
      (globalThis as any).process = { env: {} };
    }

    const { request, env } = context;

    // Robust API Key extraction
    const apiKey = env.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);

    if (!apiKey) {
      console.error("API_KEY not found in environment variables");
      return new Response(JSON.stringify({ error: "Server Configuration Error: API Key missing. Please set API_KEY in Cloudflare Pages settings or .dev.vars" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { industry, city, excludeNames } = await request.json();

    if (!industry || !city) {
      return new Response(JSON.stringify({ error: "Industry and City are required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Initialize AI
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Maps Grounding requires Gemini 2.5 series
    const model = 'gemini-2.5-flash';

    console.log(`Searching for ${industry} in ${city} using ${model}...`);
    
    const exclusionText = excludeNames && excludeNames.length > 0 
      ? `Do NOT include these companies: ${excludeNames.join(', ')}.` 
      : '';

    const prompt = `
      Find 10 active ${industry} companies or agencies in ${city}.
      ${exclusionText}
      
      I need you to use Google Maps to find real, existing companies.
      
      For each company found, strictly output the details in this exact format on a single line (use "N/A" if info is missing):
      Name | Website URL | Brief Description | Potential Service Need | Hero Product/Service | Phone Number | Email Address
      
      Rules:
      1. "Hero Product/Service" is their main offering (e.g., "High-end TVC Production").
      2. "Potential Service Need" is a guess based on their type (e.g., "Video Editing").
      3. If Email is not explicitly found, write "N/A".
      4. If Phone is not found, write "N/A".
      5. Do not include any intro or outro text. Just the pipe-separated list.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.6,
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
    
    // Parse the pipe-separated text response
    const leads = text
      .split('\n')
      .map(line => line.trim())
      // Filter out empty lines, separator lines (---), and header rows
      .filter(line => line.length > 5 && line.includes('|') && !line.toLowerCase().includes('name | website') && !line.match(/^[\s|\-]+$/)) 
      .map((line, index) => {
        // Clean up markdown table formatting (leading/trailing pipes)
        const cleanLine = line.replace(/^\|/, '').replace(/\|$/, '').trim();
        const parts = cleanLine.split('|').map(s => s.trim());
        
        const name = parts[0] || "Unknown Company";
        let website = parts[1] || "N/A";
        const description = parts[2] || "No description available";
        const need = parts[3] || "General Creative Services";
        const heroProduct = parts[4] || "Services";
        const phone = parts[5] || "N/A";
        const email = parts[6] || "N/A";

        // Cleanup website URL if it contains markdown or extra text
        website = website.replace(/\[.*?\]\(.*?\)/g, (match) => {
            const url = match.match(/\((.*?)\)/)?.[1];
            return url || "N/A";
        }).replace(/\.$/, ''); // remove trailing dot

        return {
          id: `gen-${Date.now()}-${index}`,
          name: name,
          website: website,
          industry: industry,
          status: 'New',
          description: description,
          recentWork: "Identified via live search",
          needs: [need],
          heroProduct: heroProduct,
          phone: phone,
          email: email
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