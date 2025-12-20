
import { PitchParams, Company, SearchParams, Pitch, SearchResult } from "../types";

/**
 * PRODUCTION UTILITY: Clean JSON
 * LLMs often wrap JSON in markdown blocks (```json ... ```) or include preambles.
 * This extracts the actual JSON object/array substring.
 */
const cleanAndParseJSON = <T>(text: string): T => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try stripping markdown code blocks
    let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    
    // 3. Robust Extraction: Find the first '{' or '[' and the last '}' or ']'
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    const start = (firstBrace === -1) ? firstBracket : (firstBracket === -1) ? firstBrace : Math.min(firstBrace, firstBracket);
    
    if (start !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        
        if (end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
            try {
                return JSON.parse(cleaned);
            } catch (innerError) {
                console.error("Failed to parse extracted JSON segment", innerError);
            }
        }
    }
    
    console.error("JSON Parse Failed. Raw text:", text);
    throw new Error("Received malformed data from AI. Please try again.");
  }
};

/**
 * PRODUCTION UTILITY: Fetch with Retry
 * Handles network flakes and rate limits.
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, backoff = 1000): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        
        // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
        if (!response.ok && (response.status === 429 || response.status >= 500) && retries > 0) {
            console.warn(`Request failed with ${response.status}. Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
             console.warn(`Network error. Retrying in ${backoff}ms...`);
             await new Promise(resolve => setTimeout(resolve, backoff));
             return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
};

export const generatePitch = async (params: PitchParams): Promise<Pitch[]> => {
  try {
    const response = await fetchWithRetry('/api/pitch', {
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
       // Fallback: If backend returns text/plain error despite JSON request
       const text = await response.text();
       throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
    }

  } catch (error) {
    console.error("Recon Pitch Error:", error);
    throw error;
  }
};

export const findLeads = async (params: SearchParams, signal?: AbortSignal): Promise<SearchResult> => {
  try {
    const response = await fetchWithRetry('/api/leads', {
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
      throw error; 
    }
    console.error("Recon Discovery Error:", error);
    throw error;
  }
};
