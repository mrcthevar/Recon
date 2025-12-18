import { GoogleGenAI } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;

    if (!env.API_KEY) {
      console.error("API_KEY not found in environment variables");
      return new Response(JSON.stringify({ error: "Server Configuration Error: API Key missing in Cloudflare" }), { status: 500 });
    }

    const { industry, city } = await request.json();

    if (!industry || !city) {
      return new Response(JSON.stringify({ error: "Industry and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    // Maps Grounding requires Gemini 2.5 series
    const model = 'gemini-2.5-flash';

    console.log(`Searching for ${industry} in ${city} using ${model}...`);

    const prompt = `
      Find 5 active ${industry} companies or agencies in ${city}.
      
      I need you to use Google Maps to find real, existing companies.
      
      For each company found, strictly output the details in this exact format on a single line:
      Name | Website URL | Brief Description | Potential Service Need
      
      If a website is not found, write "N/A".
      The "Potential Service Need" should be a short guess based on their type (e.g., "Video Production", "Branding").
      
      Do not include any intro or outro text. Just the list.
    `;

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
      throw new Error("AI returned empty response. Maps tool might have failed to find locations.");
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
          needs: [need]
        };
      });

    if (leads.length === 0) {
        console.warn("No leads parsed from text:", text);
        return new Response(JSON.stringify({ leads: [], debug: text }), { status: 200 });
    }

    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Leads API Critical Error:", error);
    const errorMessage = error.message || "Unknown Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};