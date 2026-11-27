// Deno tests for the empty-queue topic drafter.
//   cd supabase/functions && npx -y deno@2.9.6 test --allow-env --allow-net --allow-read --node-modules-dir=none daily-seo-blog-generator/topic-draft.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import type Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import { __setClaudeClientForTests } from "../_shared/anthropic.ts";
import { breaksContentRules, draftTopic, validateDraftedTopic } from "./topic-draft.ts";

const GOOD = {
  category: "cartomancy",
  topic: "Jack of Diamonds Meaning in Cartomancy",
  brief: "The jack of diamonds as news about money or a messenger with a practical offer. Cover upright meaning, neighbours, and love and career readings.",
  keyword: "Jack of Diamonds Meaning",
  related_keywords: ["jack of diamonds cartomancy", "jack of diamonds love", "jack of diamonds meaning", "jack of diamonds love"],
};

Deno.test("validateDraftedTopic: a good reply becomes a clean row", () => {
  const t = validateDraftedTopic(GOOD, ["ace of spades meaning"]);
  assert(t);
  assertEquals(t.category, "cartomancy");
  assertEquals(t.keyword, "jack of diamonds meaning");
  // de-duplicated, lowercased, and the keyword itself dropped from its related list
  assertEquals(t.related_keywords, ["jack of diamonds cartomancy", "jack of diamonds love"]);
});

Deno.test("validateDraftedTopic: an existing keyword (any case) is refused", () => {
  assertEquals(validateDraftedTopic(GOOD, ["JACK OF DIAMONDS MEANING "]), null);
});

Deno.test("validateDraftedTopic: unknown category, missing fields or junk are refused", () => {
  assertEquals(validateDraftedTopic({ ...GOOD, category: "astrology-memes" }, []), null);
  assertEquals(validateDraftedTopic({ ...GOOD, brief: "too short" }, []), null);
  assertEquals(validateDraftedTopic({ ...GOOD, keyword: "" }, []), null);
  assertEquals(validateDraftedTopic({ ...GOOD, keyword: 'evil "quote"' }, []), null);
  assertEquals(validateDraftedTopic(null, []), null);
  assertEquals(validateDraftedTopic("a string", []), null);
});

Deno.test("validateDraftedTopic: D34 rules 4 and 5 refuse health, self-harm, money-outcome, gambling and competitor topics", () => {
  const base = { ...GOOD, keyword: "queen of clubs meaning", related_keywords: [] };
  for (
    const bad of [
      { keyword: "suicide king meaning" },
      { topic: "Pregnancy Dreams and Fertility Signs" },
      { brief: "How the Ace of Pentacles tells you when to invest and which stocks will rise; cover the timing in detail." },
      { keyword: "lottery numbers tarot" },
      { keyword: "co-star vs arcana" },
      { brief: "The Nine of Swords as a sign of an anxiety disorder and the treatment it points to, in clinical terms here." },
    ]
  ) {
    assertEquals(validateDraftedTopic({ ...base, ...bad }, []), null, JSON.stringify(bad));
  }
});

Deno.test("validateDraftedTopic: a rule-breaking related keyword is dropped, the topic kept; Cancer the sign is fine", () => {
  const t = validateDraftedTopic({
    ...GOOD,
    category: "zodiac",
    topic: "Cancer Moon Sign Meaning",
    keyword: "cancer moon sign meaning",
    brief: "The Moon in Cancer as emotional memory and care: what it is said to mean for comfort, home and love, as astrology reads it.",
    related_keywords: ["cancer moon woman", "cancer moon self harm", "moon in cancer love"],
  }, []);
  assert(t);
  assertEquals(t.related_keywords, ["cancer moon woman", "moon in cancer love"]);
  assert(!breaksContentRules("cancer rising meaning"));
  assert(breaksContentRules("tarot for gambling luck"));
});

Deno.test("draftTopic: a refused draft is retried, and the refused keyword is named in the next prompt", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("GEMINI_API_KEY");
  const replies = [
    JSON.stringify({ ...GOOD, keyword: "lottery numbers tarot" }),
    JSON.stringify(GOOD),
  ];
  const prompts: string[] = [];
  const client = {
    beta: {
      messages: {
        create: (params: { messages: Array<{ content: string }> }) => {
          prompts.push(params.messages[0].content);
          const text = replies[Math.min(prompts.length - 1, replies.length - 1)];
          return Promise.resolve({
            model: "claude-opus-5-5",
            stop_reason: "end_turn",
            content: [{ type: "text", text }],
            usage: { input_tokens: 10, output_tokens: 10 },
          });
        },
      },
    },
  } as unknown as Anthropic;
  __setClaudeClientForTests(client);
  try {
    const t = await draftTopic(["ace of spades meaning"]);
    assert(t);
    assertEquals(t.keyword, "jack of diamonds meaning");
    assertEquals(prompts.length, 2);
    assert(prompts[1].includes("lottery numbers tarot"));
  } finally {
    __setClaudeClientForTests(null);
  }
});

function claudeSays(text: string) {
  const prompts: string[] = [];
  const client = {
    beta: {
      messages: {
        create: (params: { messages: Array<{ content: string }> }) => {
          prompts.push(params.messages[0].content);
          return Promise.resolve({
            model: "claude-opus-5-5",
            stop_reason: "end_turn",
            content: [{ type: "text", text }],
            usage: { input_tokens: 10, output_tokens: 10 },
          });
        },
      },
    },
  } as unknown as Anthropic;
  return { client, prompts };
}

Deno.test("draftTopic: Claude drafts the topic and is shown the existing keywords", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("GEMINI_API_KEY");
  const { client, prompts } = claudeSays(JSON.stringify(GOOD));
  __setClaudeClientForTests(client);
  try {
    const t = await draftTopic(["ace of spades meaning", "cartomancy"]);
    assert(t);
    assertEquals(t.keyword, "jack of diamonds meaning");
    assert(prompts[0].includes("ace of spades meaning | cartomancy"));
  } finally {
    __setClaudeClientForTests(null);
  }
});

Deno.test("draftTopic: an unusable reply gives null (the cron then reports QUEUE_EMPTY)", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("GEMINI_API_KEY");
  const { client } = claudeSays("Sorry, here is an idea: tarot for cats.");
  __setClaudeClientForTests(client);
  try {
    assertEquals(await draftTopic([]), null);
  } finally {
    __setClaudeClientForTests(null);
  }
});
