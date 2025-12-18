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
      throw new Error(errorData.error || `Server error: ${response.status}`);
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

    if (!response.ok) {
      throw new Error(`Failed to fetch leads: ${response.statusText}`);
    }

    const data = await response.json();
    return data.leads || [];
  } catch (error) {
    console.error("Recon Discovery Error:", error);
    throw error;
  }
};