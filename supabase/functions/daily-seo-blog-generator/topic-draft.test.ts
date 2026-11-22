// Deno tests for the empty-queue topic drafter.
//   cd supabase/functions && npx -y deno@2.9.6 test --allow-env --allow-net --allow-read --node-modules-dir=none daily-seo-blog-generator/topic-draft.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import type Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import { __setClaudeClientForTests } from "../_shared/anthropic.ts";
import { draftTopic, validateDraftedTopic } from "./topic-draft.ts";

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
