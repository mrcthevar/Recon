
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

    const { companyName, industry, userSkills, tone, companySignals } = await request.json();

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-3-flash-preview';

    // Construct a context-rich prompt
    let contextStr = "";
    if (companySignals && companySignals.length > 0) {
        contextStr = `\nUse these specific FACTS about the company to personalize the emails:\n${companySignals.join('\n')}\n`;
    }

    const prompt = `
      You are an elite B2B sales copywriter.
      Target Company: ${companyName} (${industry})
      My Offer/Skills: ${userSkills}
      Tone: ${tone}
      ${contextStr}

      Generate 3 distinct cold email pitches. 
      Rules:
      1. If company facts are provided, YOU MUST REFERENCE THEM (e.g., "Saw you are hiring for X", "Congrats on the Y news").
      2. Keep it under 100 words.
      3. No fluff.

      Variations:
      1. "Evidence-Based": Lead with the observed signal/fact, then pivot to solution.
      2. "The Specialist": Focus on how my skills solve a specific problem in ${industry}.
      3. "Low Friction": A very short, casual "worth a chat?" approach.

      Format as a JSON object with a key "pitches" containing an array of objects.
      Each object must have: "angle", "subject", "body".
    `;

    const generationPromise = ai.models.generateContent({
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

    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Generation timed out. Please try again.")), 25000)
    );

    const response: any = await Promise.race([generationPromise, timeoutPromise]);

    let text = response.text || "{}";
    
    // Robust cleanup for markdown code blocks (just in case)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Ensure we are parsing from the first curly brace
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
         console.error("JSON Parse Error on Pitch:", text);
         throw new Error("Failed to parse pitch response.");
    }

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
