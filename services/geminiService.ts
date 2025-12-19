
import { PitchParams, Company, SearchParams, Pitch, SearchResult } from "../types";

export const generatePitch = async (params: PitchParams): Promise<Pitch[]> => {
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
      return data.pitches || [];
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

export const findLeads = async (params: SearchParams, signal?: AbortSignal): Promise<SearchResult> => {
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal // Pass the abort signal to the fetch request
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Discovery Failed: ${response.statusText}`);
        }
        return {
            leads: data.leads || [],
            sources: data.sources || []
        };
    } else {
        const text = await response.text();
        console.error("Leads API Error (Non-JSON):", text);
        
        let msg = `Server Error (${response.status})`;
        if (response.status === 404) msg = "API Endpoint Not Found (404).";
        else if (response.status === 500) msg = "Internal Server Error (500).";
        
        throw new Error(msg);
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Ignore abort errors, they are intentional
      throw error; 
    }
    console.error("Recon Discovery Error:", error);
    throw error;
  }
};
