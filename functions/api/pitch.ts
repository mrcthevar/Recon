import { GoogleGenAI } from "@google/genai";

// We redefine constants here to ensure the serverless function is self-contained
const MODEL_NAME = 'gemini-3-flash-preview';
const SYSTEM_INSTRUCTION = `
You are Recon, an elite sales strategist for high-end creative freelancers (cinematographers, editors, designers).
Your goal is to write cold emails that convert.
Input: Company Name, Industry, User's Skills, Desired Tone.
Output: A concise, high-impact cold email.

Rules:
1. Subject line must be intriguing but not clickbait.
2. Opening line must be hyper-personalized based on the company's industry.
3. No fluff. Get straight to the value proposition.
4. Call to action should be low friction (e.g., "Worth a chat?").
5. Return ONLY the email body (including subject line at the top formatted as "Subject: ...").
`;

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: any) => {
  try {
     // Polyfill process for libraries that expect it
    if (typeof process === 'undefined') {
      (globalThis as any).process = { env: {} };
    }

    const { request, env } = context;
    
    // 1. Security Check
    const apiKey = env.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key not configured on server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Parse Input
    const params = await request.json();
    const { companyName, industry, userSkills, tone } = params;

    if (!companyName || !industry || !userSkills) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Initialize AI (Server-side)
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 4. Generate Content
    const prompt = `
      Write a cold email to ${companyName}, a company in the ${industry} space.
      My skills: ${userSkills}.
      Tone: ${tone}.
      
      Focus on how my skills specifically solve problems for their industry. 
      Keep it under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    const generatedText = response.text || "Could not generate pitch.";

    // 5. Return Result
    return new Response(JSON.stringify({ text: generatedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Backend Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};