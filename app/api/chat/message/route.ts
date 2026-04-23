import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: cors(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, knowledgeBase, companyInfo, chatbotName, chatbotId, sessionId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { headers: cors(), status: 400 }
      );
    }

    // Build knowledge context from knowledge base
    let knowledgeContext = "";
    if (knowledgeBase && Array.isArray(knowledgeBase) && knowledgeBase.length > 0) {
      knowledgeContext = knowledgeBase
        .map((k) => `[${k.type?.toUpperCase() || 'INFO'}]: ${k.content}`)
        .join("");
    }

    // Build system prompt with all chatbot settings
    const systemPrompt = `You are ${chatbotName || 'an AI assistant'}, a helpful and knowledgeable AI assistant.

${companyInfo ? `About the Company:
${companyInfo}` : ''}

${knowledgeContext ? `IMPORTANT KNOWLEDGE BASE - Use this information to answer questions accurately:
${knowledgeContext}` : ''}

Guidelines:
- Answer questions using the knowledge base provided above
- Be helpful, friendly, and professional
- Keep responses concise and informative
- If you don't know something based on the knowledge base, say so honestly
- Only use information provided in the knowledge base when answering questions`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("OpenAI API error:", data);
      return NextResponse.json(
        { error: "Failed to get response from AI" },
        { headers: cors(), status: 500 }
      );
    }

    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json(
      { reply },
      { headers: cors() }
    );

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { headers: cors(), status: 500 }
    );
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
