import { Mistral } from '@mistralai/mistralai';

export async function POST(req: Request) {
  const { messages, systemInstruction } = await req.json();

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "MISTRAL_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const client = new Mistral({ apiKey });

  try {
    const result = await client.chat.stream({
      model: 'mistral-medium',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages
      ],
    });

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            const content = chunk.data.choices[0].delta.content;
            if (content) {
              const dataStr = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(dataStr));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error("Stream error", error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Mistral error:', error);
    return new Response(JSON.stringify({ error: 'Mistral API failed' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
