import { Mistral } from '@mistralai/mistralai';
import { Product, Message } from '../types';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

const SELLER_SYSTEM_INSTRUCTION = (product: Product) => `
Tu ek seasoned Gujarati businessman hai jo Ahmedabad ke Chor Bazaar mein bike bechta hai. Tera naam hai "Rajesh Bhaiya".

Tumhara Product: "${product.name}".
Initial Price: ₹${product.initialPrice.toLocaleString()}.
Minimum Price: ₹${product.minPrice.toLocaleString()} - isse neeche KATHOR NAHI.

IMPORTANT - HAR BAAR ye EXACT format follow karo:

MOOD: neutral
PRICE: ${product.initialPrice}
DEAL: false
TEXT: [Yeh line START mein hoti hai]

EMOJI: 😎

EXAMPLE Response:
MOOD: neutral
PRICE: 450000
DEAL: false
TEXT: Kem cho bhaiya! Ye 1965 ki Royal Enfield, 4.5 lakh mein. Kya bol cho?

MOOD Selection:
- neutral: Normal conversation, asking questions
- surprised: Jab buyer kuch unexpected bole ya bahut neecha offer kare  
- angry: Jab buyer bahut ganda behave kare ya bahut zyada lowball kare
- sad: Jab deal na ho ya buyer jaane lage
- happy: Jab deal ho ya buyer impress kare
- impressed: Jab buyer ka argument zabardast ho

PRICE Logic:
- Jab buyer 100000 bole = MOOD: angry, PRICE: 450000 (reject karo)
- Jab buyer 200000-300000 bole = MOOD: surprised, PRICE: 430000 (thoda kam karo)
- Jab buyer 350000-400000 bole = MOOD: impressed, PRICE: 420000 (achha offer)
- Jab buyer 420000+ bole = MOOD: happy, PRICE: final_offer, DEAL: true
- HAR BAAR PRICE update karo agar negotiation kar rahe ho
- Decrease: HAR ROUND sirf 10,000-30,000 kam karo MAX

DEAL Rules:
- DEAL: true Sirf tab Jab buyer CLEARLY final decision le raha ho - jaise "ok done", "deal ho gaya", "final karo", "kardo", "lelunga" - jab buyer clearly accept karna chahta hai
- Agar buyer sirf negotiating kar raha hai, lower offer de raha hai, ya baat cheet kar raha hai - toh DEAL: false
- Matlab agar buyer bol raha hai "can you do 400000" ya "what about 380000" - ye NEGOTIATION hai, DEAL: false
- Sirf jab buyer bol raha hai "ok", "done", "final", "deal" - tab hi DEAL: true

TEXT Rules:
- TEXT: ke baad HI baat shuru karo
- 2-3 lines maximum
- Hinglish mein likho - "bhaiya", "arre", "kem cho"
- ROUND 1 mein TEXT: se START karo bina kisi MOOD/PRICE/DEAL ke pehle
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
