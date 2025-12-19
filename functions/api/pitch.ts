
import { GoogleGenAI, Type } from "@google/genai";

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
      return new Response(JSON.stringify({ error: "API Key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { companyName, industry, userSkills, tone, companySignals, format = 'email' } = await request.json();

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    let contextStr = "";
    if (companySignals && companySignals.length > 0) {
        contextStr = `COMPANY FACTS:\n${companySignals.join('\n')}\n`;
    }

    let specificInstructions = "";
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

    const prompt = `
      Target: ${companyName} (${industry})
      My Skills: ${userSkills}
      ${contextStr}
      ${specificInstructions}
      
      Generate 3 variations:
      1. Evidence-Based (Lead with facts)
      2. Solution-Focused (Lead with value)
      3. Low-Friction (Short ask)
    `;

    const systemInstruction = `
      You are an elite B2B sales copywriter.
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

    const data = JSON.parse(response.text || "{}");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Backend Pitch Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
    