import { Company } from './types';

export const MODEL_NAME = 'gemini-3-flash-preview';

export const SYSTEM_INSTRUCTION = `
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

export const ACCEPTED_IMAGE_TYPES = 'image/png, image/jpeg, image/webp';

export const MOCK_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'Nebula Studios',
    website: 'nebulastudios.io',
    industry: 'Motion Design',
    status: 'New',
    description: 'Award-winning motion design house focusing on tech startups.',
    recentWork: 'Rebranded Fintech giant "Vault" with 3D abstract loops.',
    needs: ['3D Generalist', 'Rive Animation']
  },
  {
    id: '2',
    name: 'Apex Gear Co',
    website: 'apexgear.com',
    industry: 'Outdoor Retail',
    status: 'Warm',
    description: 'Premium outdoor equipment manufacturer for extreme sports.',
    recentWork: 'Launched "Summit" series hiking boots.',
    needs: ['Cinematography', 'Social Cuts']
  },
  {
    id: '3',
    name: 'Lumina Health',
    website: 'lumina.health',
    industry: 'Healthcare Tech',
    status: 'New',
    description: 'AI-driven personalized healthcare platform.',
    recentWork: 'Series B funding announcement video.',
    needs: ['Explainer Videos', 'UI Animation']
  },
  {
    id: '4',
    name: 'Urban Coffee',
    website: 'urbancoffee.co',
    industry: 'F&B',
    status: 'Contacted',
    description: 'Direct-to-consumer artisanal coffee subscription.',
    recentWork: 'Expansion into Asian markets.',
    needs: ['Lifestyle Photography', 'Short-form Video']
  },
  {
    id: '5',
    name: 'Drift Motors',
    website: 'driftmotors.ev',
    industry: 'Automotive',
    status: 'New',
    description: 'Electric vehicle startup focusing on retro-conversions.',
    recentWork: 'Viral campaign featuring vintage Porsche 911 conversion.',
    needs: ['Color Grading', 'Sound Design']
  }
];