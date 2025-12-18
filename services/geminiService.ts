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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Pitch Generation Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Recon Pitch Error:", error);
    throw error;
  }
};

export const findLeads = async (industry: string, city: string): Promise<Company[]> => {
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, city }),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Discovery Failed: ${response.statusText}`);
        }
        return data.leads || [];
    } else {
        // Handle non-JSON response (e.g., 404 HTML page from Vite/Cloudflare 404)
        if (!response.ok) {
            throw new Error(`Server Error (${response.status}): ${response.statusText}. Check API path.`);
        }
        return [];
    }

  } catch (error) {
    console.error("Recon Discovery Error:", error);
    throw error;
  }
};