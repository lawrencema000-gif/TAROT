import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://arcana.app",
  "https://www.arcana.app",
  "capacitor://localhost",
  "http://localhost",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

interface TarotCard {
  id: number;
  name: string;
  reversed: boolean;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
}

interface ReadingRequest {
  cards: TarotCard[];
  question?: string;
  spreadType: string;
  zodiacSign?: string;
  goals?: string[];
  focusArea?: "love" | "career" | "general";
}

interface UserContext {
  journalThemes?: string[];
  recentReadings?: number;
}

const spreadPositions: Record<string, string[]> = {
  single: ["The essence of the situation"],
  "three-card": ["Past influences", "Present situation", "Future potential"],
  relationship: ["Your energy", "Their energy", "The connection between you"],
  career: ["Current position", "Challenges to overcome", "Path forward"],
  shadow: ["What you hide from yourself", "The root cause", "How to integrate"],
  "celtic-cross": [
    "Present situation",
    "Challenge or obstacle",
    "Subconscious influences",
    "Recent past",
    "Best possible outcome",
    "Near future",
    "Your attitude",
    "External influences",
    "Hopes and fears",
    "Final outcome",
  ],
};

function buildPrompt(
  request: ReadingRequest,
  userContext?: UserContext
): string {
  const { cards, question, spreadType, zodiacSign, goals, focusArea } = request;
  const positions = spreadPositions[spreadType] || spreadPositions.single;

  let prompt = `You are a wise and compassionate tarot reader. Generate a personalized tarot reading interpretation.

`;

  if (zodiacSign) {
    prompt += `The querent is a ${zodiacSign}. Consider their zodiac characteristics in your interpretation.\n`;
  }

  if (goals && goals.length > 0) {
    prompt += `Their current life focus areas are: ${goals.join(", ")}.\n`;
  }

  if (focusArea) {
    prompt += `They specifically want insight about: ${focusArea}.\n`;
  }

  if (question) {
    prompt += `\nTheir question: "${question}"\n`;
  }

  prompt += `\nSpread Type: ${spreadType}\n\nCards drawn:\n`;

  cards.forEach((card, index) => {
    const position = positions[index] || `Position ${index + 1}`;
    const orientation = card.reversed ? "(Reversed)" : "(Upright)";
    prompt += `- ${position}: ${card.name} ${orientation}\n`;
    if (card.keywords) {
      prompt += `  Keywords: ${card.keywords.join(", ")}\n`;
    }
  });

  if (userContext?.journalThemes && userContext.journalThemes.length > 0) {
    prompt += `\nRecent themes from their journal entries: ${userContext.journalThemes.join(", ")}\n`;
  }

  prompt += `\nProvide an interpretation that:
1. Addresses each card in its position
2. Weaves the cards together into a cohesive narrative
3. Offers practical guidance they can apply
4. Ends with an empowering message

Write in second person ("you"). Be warm but not overly mystical. Keep the total response under 500 words.`;

  return prompt;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function generateFallbackReading(request: ReadingRequest): string {
  const { cards, spreadType, question } = request;
  const positions = spreadPositions[spreadType] || spreadPositions.single;

  let reading = "";

  if (question) {
    reading += `Regarding your question, the cards offer the following guidance:\n\n`;
  }

  cards.forEach((card, index) => {
    const position = positions[index] || `Position ${index + 1}`;
    const meaning = card.reversed ? card.meaningReversed : card.meaningUpright;
    reading += `**${position}: ${card.name}${card.reversed ? " (Reversed)" : ""}**\n`;
    reading += `${meaning || "This card invites you to trust your intuition and look within for answers."}\n\n`;
  });

  reading += `\nTaken together, these cards suggest a time of ${cards.length > 1 ? "transition and growth" : "reflection"}. Trust the journey and know that you have the wisdom within to navigate whatever arises.`;

  return reading;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const request: ReadingRequest = await req.json();

    if (!request.cards || request.cards.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cards are required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const journalThemes: string[] = [];
    if (journalData) {
      const tagCounts: Record<string, number> = {};
      journalData.forEach((entry) => {
        entry.tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([tag]) => journalThemes.push(tag));
    }

    const prompt = buildPrompt(request, { journalThemes });

    let interpretation: string;
    let usedLlm = false;

    try {
      interpretation = await callGemini(prompt);
      usedLlm = true;
    } catch (llmError) {
      console.error("LLM call failed, using fallback:", llmError);
      interpretation = generateFallbackReading(request);
    }

    const { error: saveError } = await supabase.from("premium_readings").insert({
      user_id: user.id,
      reading_type: request.spreadType,
      content: interpretation,
      context: {
        question: request.question,
        zodiacSign: request.zodiacSign,
        goals: request.goals,
        focusArea: request.focusArea,
        usedLlm,
      },
      cards: request.cards.map((c) => ({
        id: c.id,
        name: c.name,
        reversed: c.reversed,
      })),
    });

    if (saveError) {
      console.error("Error saving reading:", saveError);
      return new Response(
        JSON.stringify({ error: `Database error: ${saveError.message}` }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        interpretation,
        usedLlm,
        cardCount: request.cards.length,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-reading:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});