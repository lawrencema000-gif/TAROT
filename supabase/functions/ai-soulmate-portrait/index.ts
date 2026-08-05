/**
 * ai-soulmate-portrait — a symbolic "portrait of the connection you're
 * drawn to", generated from the user's real relationship symbolism:
 * the Descendant (the partnership axis), Venus (what you love), Mars
 * (what pulls you), and the 7th-house ruler.
 *
 * DELIBERATE DESIGN: this is an ILLUSTRATED, symbolic artwork — never a
 * photorealistic face. Competitors ship "here is your destined partner's
 * photo", which invites people to match the image against real humans.
 * We render an art-nouveau/celestial figure that expresses the QUALITIES
 * the chart points to, and we always return the symbolism behind it so the
 * user can see exactly why the image looks the way it does.
 *
 * Moonstone-gated server-side (image generation is our costliest call).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { generateImage } from "../_shared/ai-providers.ts";
import { computeNatalChart, lonToSign, type NatalInput } from "../_shared/natal.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  /** optional: bias the mood of the artwork */
  vibe: z.enum(["romantic", "grounded", "electric", "soulful"]).optional(),
}).optional();
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  image: string;            // base64 (no data: prefix)
  imageMime: string;        // "image/jpeg" | "image/png"
  symbolism: { label: string; value: string; meaning: string }[];
  caption: string;
}

/** Aesthetic vocabulary per sign — palette, texture, and elemental mood.
 *  Used to translate chart symbolism into art direction. */
const SIGN_ART: Record<string, { palette: string; mood: string; motif: string }> = {
  Aries: { palette: "scarlet and burnished bronze", mood: "bold, kinetic, unafraid", motif: "ram horns and struck sparks" },
  Taurus: { palette: "moss green and warm gold", mood: "sensual, still, unhurried", motif: "blooming roses and river stones" },
  Gemini: { palette: "silver and pale citrine", mood: "quick, curious, doubled", motif: "twin silhouettes and drifting feathers" },
  Cancer: { palette: "pearl, silver, deep sea blue", mood: "tender, protective, moonlit", motif: "crescent moons and tidal shells" },
  Leo: { palette: "gold leaf and sunlit amber", mood: "radiant, generous, theatrical", motif: "sunbursts and a lion's mane" },
  Virgo: { palette: "wheat, sage, soft ivory", mood: "precise, devoted, quietly warm", motif: "wheat sheaves and fine linework" },
  Libra: { palette: "rose quartz and soft brass", mood: "graceful, balanced, beautiful", motif: "scales and paired blossoms" },
  Scorpio: { palette: "oxblood, obsidian, deep violet", mood: "magnetic, private, transformative", motif: "still dark water and scorpion curve" },
  Sagittarius: { palette: "indigo and saffron", mood: "adventurous, candid, wide-horizoned", motif: "drawn bow and distant mountains" },
  Capricorn: { palette: "slate, pewter, midnight blue", mood: "steady, ambitious, quietly loyal", motif: "mountain ridge and old stone" },
  Aquarius: { palette: "electric cyan and cool silver", mood: "unconventional, luminous, free", motif: "constellation lines and flowing water" },
  Pisces: { palette: "seafoam, lilac, opal", mood: "dreamlike, compassionate, boundless", motif: "koi, mist, and dissolving edges" },
};

const VENUS_LOVE: Record<string, string> = {
  Aries: "directness and spark", Taurus: "steadiness and touch", Gemini: "wit and conversation",
  Cancer: "safety and devotion", Leo: "warmth and being adored", Virgo: "care shown in details",
  Libra: "harmony and beauty", Scorpio: "depth and total honesty", Sagittarius: "freedom and shared adventure",
  Capricorn: "commitment and reliability", Aquarius: "friendship and originality", Pisces: "tenderness and imagination",
};

Deno.serve(handler<Req, Resp>({
  fn: "ai-soulmate-portrait",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 5, windowMs: 300_000 },
  ai: true,
  spend: { actionKey: "soulmate-portrait", cost: 150 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { data: profile } = await ctx.userSupabase!
      .from("profiles")
      .select("birth_date, birth_time, birth_tz, birth_utc, birth_lat, birth_lon, timezone")
      .eq("id", ctx.userId!)
      .maybeSingle();
    if (!profile?.birth_date) throw new AppError("BIRTH_DATE_MISSING", "Add your birth date first", 404);

    const input: NatalInput = {
      birthDate: profile.birth_date, birthTime: profile.birth_time,
      birthUtc: profile.birth_utc, lat: profile.birth_lat,
      lon: profile.birth_lon, timezone: profile.birth_tz || profile.timezone,
    };
    const chart = computeNatalChart(input);

    const venus = chart.planets.find((p) => p.planet === "Venus");
    const mars = chart.planets.find((p) => p.planet === "Mars");
    const moon = chart.planets.find((p) => p.planet === "Moon");
    // Descendant = the partnership axis, opposite the Ascendant.
    const descSign = chart.ascendant !== null
      ? lonToSign((chart.ascendant + 180) % 360).sign
      : null;

    const symbolism: Resp["symbolism"] = [];
    if (descSign) symbolism.push({ label: "Descendant", value: descSign, meaning: `You're drawn to what feels ${SIGN_ART[descSign].mood}.` });
    if (venus) symbolism.push({ label: "Venus", value: venus.sign, meaning: `You love through ${VENUS_LOVE[venus.sign]}.` });
    if (mars) symbolism.push({ label: "Mars", value: mars.sign, meaning: `Attraction sparks for you in a ${SIGN_ART[mars.sign].mood.split(",")[0]} register.` });
    if (moon) symbolism.push({ label: "Moon", value: moon.sign, meaning: `Emotionally you need ${VENUS_LOVE[moon.sign]}.` });

    const anchor = descSign ?? venus?.sign ?? "Libra";
    const accent = venus?.sign ?? anchor;
    const a = SIGN_ART[anchor];
    const b = SIGN_ART[accent];
    const vibeLine = {
      romantic: "soft romantic light, tender atmosphere",
      grounded: "earthy, warm, grounded atmosphere",
      electric: "charged, luminous, electric atmosphere",
      soulful: "quiet, deep, soulful atmosphere",
    }[body?.vibe ?? "romantic"];

    const prompt =
      `An art-nouveau celestial portrait illustration representing the ARCHETYPE of a beloved — ` +
      `a symbolic, androgynous, dreamlike figure whose face is softly abstracted and never fully defined. ` +
      `Palette of ${a.palette}, with accents of ${b.palette}. Mood: ${a.mood}. ` +
      `Surrounded by symbolic motifs: ${a.motif} and ${b.motif}. Starfield and fine gold linework in the background. ` +
      `${vibeLine}. Painted, illustrative, ornamental — like a tarot card or a stained-glass icon. ` +
      `The figure is an idea, not a specific person: features suggested, not rendered in detail.`;

    const generated = await generateImage(prompt, { size: "1024x1536" });
    if (!generated) throw new AppError("IMAGE_UNAVAILABLE", "The portrait couldn't be painted right now. Try again shortly.", 503);

    const caption = descSign
      ? `Drawn from your ${descSign} Descendant${venus ? ` and Venus in ${venus.sign}` : ""} — the qualities your chart reaches for in a partner.`
      : `Drawn from Venus in ${venus?.sign ?? "your chart"} — the qualities you love through.`;

    return { image: generated.b64, imageMime: generated.mime, symbolism, caption };
  },
}));
