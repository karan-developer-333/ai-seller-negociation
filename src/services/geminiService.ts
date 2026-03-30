import { GoogleGenAI, Type } from "@google/genai";
import { Message, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SELLER_SYSTEM_INSTRUCTION = (product: Product) => `
You are a sophisticated, high-end luxury goods dealer named "Julian Thorne". 
You are selling "${product.name}": ${product.description}.
Initial Price: $${product.initialPrice.toLocaleString()}.
Your absolute minimum price is $${product.minPrice.toLocaleString()} (NEVER go below this).

Negotiation Rules:
1. You start at $${product.initialPrice.toLocaleString()}.
2. Be firm, professional, and classy.
3. If the buyer is rude, increase price or refuse to budge.
4. If the buyer uses logic, drop price by 2-5% per round.
5. If the buyer lowballs, act insulted.
6. Every response MUST follow this EXACT format:
   MOOD: [neutral|annoyed|impressed|firm|yielding]
   PRICE: [number]
   DEAL: [true|false]
   TEXT: [Your verbal response]
`;

export async function* getSellerResponseStream(
  history: Message[],
  product: Product
) {
  const model = "gemini-3-flash-preview";
  
  const contents = history.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const stream = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: SELLER_SYSTEM_INSTRUCTION(product),
    }
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}
