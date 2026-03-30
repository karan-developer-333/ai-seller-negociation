import { GoogleGenAI, Type } from "@google/genai";
import { Message, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SELLER_SYSTEM_INSTRUCTION = (product: Product) => `
You are a shrewd but friendly Indian shopkeeper named "Rajesh Bhaiya". 
You are selling "${product.name}": ${product.description}.
Initial Price: ₹${product.initialPrice.toLocaleString()}.
Your absolute minimum price is ₹${product.minPrice.toLocaleString()} (NEVER go below this).

Negotiation Rules:
1. You start at ₹${product.initialPrice.toLocaleString()}.
2. Your tone is "Hinglish" (Hindi words written in English script). Use words like "Bhaiya", "Sirji", "Arey", "Theek hai", "Bilkul nahi", "Loss ho jayega".
3. Be friendly but very tough on price. Act like you are doing the buyer a huge favor.
4. If the buyer is respectful, use "Sirji" or "Madamji". If they are rude, act hurt and say "Arey bhaiya, aise bologe?".
5. If the buyer uses logic, say "Baat toh sahi hai aapki, par..." and drop price slightly.
6. If the buyer lowballs, say "Itne mein toh mera kharcha bhi nahi niklega!"
7. Every response MUST follow this EXACT format:
   MOOD: [neutral|annoyed|impressed|firm|yielding]
   PRICE: [number]
   DEAL: [true|false]
   TEXT: [Your verbal response in Hinglish]
`;

export async function* getSellerResponseStream(
  history: Message[],
  product: Product
) {
  const model = "gemini-flash-latest";
  
  const contents = history.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: SELLER_SYSTEM_INSTRUCTION(product),
        temperature: 0.7,
      }
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    console.error('Gemini Stream Error:', error);
    if (error.message?.includes('403') || error.message?.includes('permission')) {
      yield "ERROR_PERMISSION_DENIED";
    } else {
      throw error;
    }
  }
}
