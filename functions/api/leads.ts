import { GoogleGenAI } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
    const { request, env } = context;

    if (!env.API_KEY) {
      return new Response(JSON.stringify({ error: "API Key not configured" }), { status: 500 });
    }

    const { industry, city } = await request.json();

    if (!industry || !city) {
      return new Response(JSON.stringify({ error: "Industry and City are required" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });
    
    // Maps Grounding is supported on gemini-2.5-flash
    const model = 'gemini-2.5-flash';

    // We ask for a strict separator format including the Website if available
    const prompt = `
      Find 5 active ${industry} companies or agencies in ${city}.
      
      For each company, provide:
      1. Name
      2. Website URL (if found, otherwise write 'N/A')
      3. A brief 1-sentence description of what they do.
      4. A specific 'need' or 'opportunity' a freelancer could pitch for (e.g., "Website redesign", "Video marketing").
      
      Format your output as a strict list where each line is:
      Name | Website | Description | Potential Need
      
      Do not add numbering or bullet points. Just the data separated by pipes (|).
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
    
    // Parse the pipe-separated text response
    const leads = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('|'))
      .map((line, index) => {
        const parts = line.split('|').map(s => s.trim());
        // Handle cases where the model might miss a column, though strict prompting helps
        const name = parts[0] || "Unknown Company";
        const website = parts[1] || "N/A";
        const description = parts[2] || "No description available";
        const need = parts[3] || "General Creative Services";

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

    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Leads API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};