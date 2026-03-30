import { Mistral } from '@mistralai/mistralai';
import { Product, Message } from '../types';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

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
  try {
    const response = await fetch('/api/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        systemInstruction: SELLER_SYSTEM_INSTRUCTION(product)
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.error === 'MISTRAL_API_KEY not configured') {
        yield "ERROR_MISTRAL_KEY_MISSING";
      } else {
        yield "ERROR_MISTRAL_API_FAILED";
      }
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              yield parsed.content;
            }
          } catch (e) {
            console.error('Error parsing SSE:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Mistral proxy error:', error);
    yield "ERROR_MISTRAL_API_FAILED";
  }
}
