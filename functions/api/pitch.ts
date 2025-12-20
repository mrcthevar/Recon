
import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  API_KEY: string;
}

// Utility to clean LLM output (strip markdown) before parsing
const cleanAndParseJSON = (text: string) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
        throw e;
    }
};

export const onRequestPost = async (context: any) => {
  try {
    if (typeof process === 'undefined') {
      (globalThis as any).process = { env: {} };
    }

    const { request, env } = context;
    const apiKey = env.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { 
      companyName, 
      industry, 
      userSkills, 
      tone, 
      companySignals, 
      format = 'email', 
      context: pitchContext = 'sales',
      jobTitle 
    } = await request.json();

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    let contextStr = "";
    if (companySignals && companySignals.length > 0) {
        contextStr = `COMPANY FACTS:\n${companySignals.join('\n')}\n`;
    }
    
    if (jobTitle) {
        contextStr += `\nTARGET ROLE: ${jobTitle}\n`;
    }

    let specificInstructions = "";
    
    // JOB APPLICATION MODE
    if (pitchContext === 'job_application') {
       if (format === 'linkedin_connect') {
        specificInstructions = `
        CONTEXT: Applying for ${jobTitle || 'a job'}.
        FORMAT: LinkedIn Connection Request to Hiring Manager.
        LENGTH: STRICTLY UNDER 300 CHARACTERS.
        SUBJECT LINE: Return an empty string "".
        STYLE: Professional, expressing interest, mention skills.
        `;
      } else {
        specificInstructions = `
        CONTEXT: Job Application for ${jobTitle || 'a role'}.
        FORMAT: Cover Email / Cold Email to Hiring Manager.
        LENGTH: Under 150 words.
        SUBJECT LINE: Required. Professional (e.g., Application for ${jobTitle} - [Name]).
        STYLE: Confident, matching skills to company needs.
        `;
      }
    } 
    // SALES MODE
    else {
      if (format === 'linkedin_connect') {
        specificInstructions = `
        FORMAT: LinkedIn Connection Request
        LENGTH: STRICTLY UNDER 300 CHARACTERS.
        SUBJECT LINE: Return an empty string "".
        STYLE: Casual, direct, mention the specific company fact.
        `;
      } else if (format === 'linkedin_inmail') {
        specificInstructions = `
        FORMAT: LinkedIn InMail
        LENGTH: Under 150 words.
        SUBJECT LINE: Required. Professional and catchy.
        STYLE: Conversational B2B.
        `;
      } else {
        specificInstructions = `
        FORMAT: Cold Email
        LENGTH: Under 100 words.
        SUBJECT LINE: Required. Intriguing.
        STYLE: ${tone}
        `;
      }
    }

    const prompt = `
      Target: ${companyName} (${industry})
      My Skills/Offer: ${userSkills}
      ${contextStr}
      ${specificInstructions}
      
      Generate 3 variations:
      1. Direct & Professional
      2. Value/Skill Focused
      3. Culture/Research Focused (Reference a fact)
    `;

    const systemInstruction = `
      You are an elite business communicator.
      1. Reference provided company facts.
      2. No hashtags.
      3. No buzzwords like "delve", "tapestry", "unlock".
      4. If format is 'linkedin_connect', the body MUST be < 300 chars.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pitches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  angle: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING },
                },
                required: ["angle", "subject", "body"],
              },
            },
          },
          required: ["pitches"],
        },
        temperature: 0.7,
      },
    });

    try {
        // Robust parsing using utility
        const data = cleanAndParseJSON(response.text || "{}");
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("Backend Pitch JSON Error:", e);
        return new Response(JSON.stringify({ error: "Failed to generate pitch format." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

  } catch (error: any) {
    console.error("Backend Pitch Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
