import { PitchParams, Company } from "../types";

export const generatePitch = async (params: PitchParams): Promise<string> => {
  try {
    const response = await fetch('/api/pitch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Pitch Generation Failed: ${response.statusText}`);
      }
      return data.text;
    } else {
       const text = await response.text();
       console.error("Pitch API Error (Non-JSON):", text);
       throw new Error(`Server Error (${response.status}). Check console for details.`);
    }

  } catch (error) {
    console.error("Recon Pitch Error:", error);
    throw error;
  }
};

export const findLeads = async (industry: string, city: string, excludeNames: string[] = []): Promise<Company[]> => {
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, city, excludeNames }),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Discovery Failed: ${response.statusText}`);
        }
        return data.leads || [];
    } else {
        // Handle non-JSON response (e.g., 404 HTML page or 500 crash page)
        const text = await response.text();
        console.error("Leads API Error (Non-JSON):", text);
        
        let msg = `Server Error (${response.status})`;
        if (response.status === 404) msg = "API Endpoint Not Found (404). If running locally, use 'wrangler pages dev'.";
        else if (response.status === 500) msg = "Internal Server Error (500). Check Cloudflare logs.";
        
        throw new Error(msg);
    }

  } catch (error) {
    console.error("Recon Discovery Error:", error);
    throw error;
  }
};