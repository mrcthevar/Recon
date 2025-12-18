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
      return new Response(JSON.stringify({ error: "API Key not configured on server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { companyName, industry, userSkills, tone } = await request.json();

    const ai = new GoogleGenAI({ apiKey: apiKey });
    // Using Gemini 3 Flash for superior creative writing and instruction following
    const model = 'gemini-3-flash-preview';

    const prompt = `
      Create 3 distinct cold email pitches for:
      Target: ${companyName} (${industry})
      My Offer/Skills: ${userSkills}
      Tone: ${tone}

      Generate 3 variations:
      1. "Direct Value": Short, punchy, focuses on ROI/Result.
      2. "The Observer": Compliments specific aspect of their industry/work, then pivots to offer.
      3. "The Problem Solver": Asks a question about a common pain point in ${industry}, offers solution.

      Format as a JSON object with a key "pitches" containing an array of objects.
      Each object must have: "angle" (e.g. Direct Value), "subject", "body".
      Keep bodies under 120 words.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {
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

    const text = response.text || "{}";
    const data = JSON.parse(text);

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