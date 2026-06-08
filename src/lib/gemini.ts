import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Use highly available and supported models. Primary is gemini-3.5-flash, with stable fallback variants.
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContentWithFallback(params: any): Promise<any> {
  let lastError = null;
  const MAX_RETRIES = 3;

  for (const model of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const status = err?.status || err?.code || '';
        
        console.warn(`Model ${model} failed on attempt ${attempt}/${MAX_RETRIES}:`, errMessage);

        const isTransient = 
          status === 503 || 
          status === 'UNAVAILABLE' || 
          status === 429 || 
          status === 'RESOURCE_EXHAUSTED' ||
          errMessage.toLowerCase().includes('high demand') ||
          errMessage.toLowerCase().includes('temporary') ||
          errMessage.toLowerCase().includes('unavailable') ||
          errMessage.toLowerCase().includes('rate limit') ||
          errMessage.toLowerCase().includes('limit exceeded') ||
          errMessage.toLowerCase().includes('busy');

        if (isTransient && attempt < MAX_RETRIES) {
          const delay = attempt * 1200; // Exponential-ish backoff
          console.log(`Transient failure detected on ${model}. Retrying in ${delay}ms...`);
          await sleep(delay);
        } else {
          break; // Stop retrying this model and move to the next model in fallback list
        }
      }
    }
  }
  throw lastError || new Error('All fallback models failed due to temporary network/demand spikes.');
}
