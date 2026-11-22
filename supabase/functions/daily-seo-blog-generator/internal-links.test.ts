// cd supabase/functions && npx -y deno@2.9.6 test --allow-env --allow-net --allow-read --node-modules-dir=none daily-seo-blog-generator/internal-links.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import { APP_LINKS, fixInternalLinks, isAppPath } from "./internal-links.ts";

Deno.test("isAppPath: listed pages and real detail pages pass; invented ones do not", () => {
  for (const [p] of APP_LINKS) assert(isAppPath(p), p);
  assert(isAppPath("/tarot-meanings/the-star"));
  assert(isAppPath("/cartomancy/cards/ace-of-spades"));
  assert(isAppPath("/blog/three-of-cups-love"));
  assert(!isAppPath("/more/dream"));
  assert(!isAppPath("/more/quick"));
  assert(!isAppPath("/tarot-meanings/"));
  assert(!isAppPath("/dream-interpreter"));
});

Deno.test("fixInternalLinks: invented paths become /readings; real, external and anchors stay", () => {
  const html = [
    '<a href="/more/dream">dream</a>',
    '<a href="/readings">readings</a>',
    '<a href="/ai/quick?src=blog">quick</a>',
    '<a href="/more/quick#top">old quick</a>',
    '<a href="https://example.com/more/dream">external</a>',
    '<a href="//cdn.example.com/x">protocol-relative</a>',
    '<a href="#faq">anchor</a>',
    '<a href="/cartomancy/">trailing slash</a>',
  ].join("\n");
  const { html: out, rewritten } = fixInternalLinks(html);
  assertEquals(rewritten, ["/more/dream", "/more/quick#top"]);
  assert(out.includes('<a href="/readings">dream</a>'));
  assert(out.includes('<a href="/ai/quick?src=blog">quick</a>'));
  assert(out.includes('<a href="/readings">old quick</a>'));
  assert(out.includes('href="https://example.com/more/dream"'));
  assert(out.includes('href="//cdn.example.com/x"'));
  assert(out.includes('href="#faq"'));
  assert(out.includes('href="/cartomancy/"'));
});
