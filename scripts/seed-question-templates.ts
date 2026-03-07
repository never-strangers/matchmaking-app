/**
 * Seed question templates: ~100 questions across 8 categories.
 * Idempotent: upserts on prompt text (case-insensitive match).
 *
 * Usage:
 *   npm run seed:question-templates
 *
 * Default selection: 20 questions spread across all 8 categories,
 * assigned default_rank 1–20 for deterministic "Reset to defaults" behaviour.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

if (process.env.SEED_CONFIRM !== "true") {
  console.error("❌ Set SEED_CONFIRM=true to run this script.");
  process.exit(1);
}

type Template = {
  prompt: string;
  tags: string[];
  is_default: boolean;
  default_rank: number | null;
};

// 8 categories × 12–13 questions = ~100 total
// default_rank 1–20 spread: PRINCIPLES×3, INTROSPECTIVE×3, SPICY×2,
//   FAMILY TIME×2, COWORKERS×2, BESTIES×3, PARTIES×3, GAME NIGHT×2
const TEMPLATES: Template[] = [
  // ── PRINCIPLES (13) ──────────────────────────────────────────────────
  { prompt: "How important is financial stability to you? (1=not important, 5=essential)", tags: ["PRINCIPLES"], is_default: true,  default_rank: 1  },
  { prompt: "How strongly do your core values influence your daily decisions?",             tags: ["PRINCIPLES"], is_default: true,  default_rank: 2  },
  { prompt: "How important is personal integrity in the people you surround yourself with?",tags: ["PRINCIPLES"], is_default: true,  default_rank: 3  },
  { prompt: "How much do you prioritise experiences over possessions?",                     tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How important is it to you that others share your political views?",           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How much do environmental sustainability efforts matter to you?",              tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How high a priority is your health and physical wellbeing?",                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How much do you value financial generosity in others?",                        tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How important is religious or spiritual practice to your identity?",           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How much do you value punctuality and reliability?",                           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How important is lifelong learning to you?",                                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How strongly do you believe in equality and social justice?",                  tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "How much does ambition drive your choices?",                                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },

  // ── INTROSPECTIVE (13) ────────────────────────────────────────────────
  { prompt: "How often do you reflect on your personal growth?",                            tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 4  },
  { prompt: "How comfortable are you sitting with uncertainty or ambiguity?",               tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 5  },
  { prompt: "How well do you understand your own emotional triggers?",                      tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 6  },
  { prompt: "How often do you journal or otherwise process your thoughts?",                 tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How much do past experiences shape who you are today?",                        tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you asking for help when you need it?",                    tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How good are you at setting and respecting your own boundaries?",              tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How often do you challenge your own assumptions?",                             tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How in touch are you with your long-term goals?",                              tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How much does solitude recharge rather than drain you?",                       tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How often do you seek feedback on yourself from trusted friends?",             tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How much do you believe in therapy or professional self-development?",         tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "How forgiving are you of your own mistakes?",                                  tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },

  // ── SPICY (12) ────────────────────────────────────────────────────────
  { prompt: "How comfortable are you with spontaneous decisions?",                          tags: ["SPICY"], is_default: true,  default_rank: 7  },
  { prompt: "How willing are you to share a controversial opinion in public?",              tags: ["SPICY"], is_default: true,  default_rank: 8  },
  { prompt: "How adventurous are you when it comes to trying new foods?",                   tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you discussing money openly with people you've just met?", tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How likely are you to quit a job you hate without another one lined up?",      tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you with public displays of affection?",                   tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy debating people who disagree with you?",                 tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How willing are you to travel solo to an unknown destination?",                tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How open are you about your salary with close friends?",                       tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you with being the centre of attention?",                  tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How likely are you to voice disagreement with a group consensus?",             tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you with not knowing the plan in advance?",                tags: ["SPICY"], is_default: false, default_rank: null },

  // ── FAMILY TIME (12) ─────────────────────────────────────────────────
  { prompt: "How close are you with your immediate family?",                                tags: ["FAMILY TIME"], is_default: true,  default_rank: 9  },
  { prompt: "How often do you make time for family gatherings?",                            tags: ["FAMILY TIME"], is_default: true,  default_rank: 10 },
  { prompt: "How much do your family's opinions influence your major life decisions?",      tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How important is it that a partner gets along with your family?",              tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How often do you check in on parents or siblings?",                            tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How much do you expect to be involved in raising children someday?",           tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you discussing family problems with outsiders?",           tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How much do family traditions matter to you?",                                 tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How willing are you to relocate for the sake of family?",                      tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How much do you value having family dinners or shared meals?",                 tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How involved are you in extended family events and decisions?",                tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "How much do you feel a duty to financially support your family?",              tags: ["FAMILY TIME"], is_default: false, default_rank: null },

  // ── COWORKERS (12) ───────────────────────────────────────────────────
  { prompt: "How much do you enjoy collaborative work environments?",                       tags: ["COWORKERS"], is_default: true,  default_rank: 11 },
  { prompt: "How important is a clear boundary between work and personal life to you?",     tags: ["COWORKERS"], is_default: true,  default_rank: 12 },
  { prompt: "How comfortable are you giving critical feedback to colleagues?",              tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How often do you socialise with coworkers outside of work?",                   tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How important is a strong company culture to your job satisfaction?",          tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How much do you value recognition from your manager?",                         tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you working remotely without daily check-ins?",            tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How much does career progression drive your motivation at work?",              tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How important is psychological safety in your team?",                          tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How often do you mentor or support junior colleagues?",                        tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you disagreeing with your manager?",                       tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "How much does your job define your personal identity?",                        tags: ["COWORKERS"], is_default: false, default_rank: null },

  // ── BESTIES (13) ─────────────────────────────────────────────────────
  { prompt: "How would your best friend describe your loyalty?",                            tags: ["BESTIES"], is_default: true,  default_rank: 13 },
  { prompt: "How often do you initiate plans with your close friends?",                     tags: ["BESTIES"], is_default: true,  default_rank: 14 },
  { prompt: "How comfortable are you being deeply vulnerable with a friend?",               tags: ["BESTIES"], is_default: true,  default_rank: 15 },
  { prompt: "How important is it that your friends share your sense of humour?",            tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How often do you check in on friends who seem distant?",                       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How much do you value a friend who tells you the truth even when it hurts?",   tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How important is it to have friends who challenge your worldview?",            tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How many genuinely close friends do you have?",                                tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How much effort do you put into maintaining long-distance friendships?",       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How quickly do you open up to new people?",                                    tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you ending a friendship that no longer serves you?",       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How much do you rely on your friends for emotional support?",                  tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "How important is reciprocity in your friendships?",                            tags: ["BESTIES"], is_default: false, default_rank: null },

  // ── PARTIES (13) ─────────────────────────────────────────────────────
  { prompt: "How often do you enjoy going out to social events?",                           tags: ["PARTIES"], is_default: true,  default_rank: 16 },
  { prompt: "How much energy do you get from being in a lively crowd?",                     tags: ["PARTIES"], is_default: true,  default_rank: 17 },
  { prompt: "How often do you stay out past midnight when socialising?",                    tags: ["PARTIES"], is_default: true,  default_rank: 18 },
  { prompt: "How important is the atmosphere of a venue to your enjoyment?",                tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you striking up conversations with strangers at events?",  tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy dancing in social settings?",                            tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How often do you host social gatherings at your home?",                        tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How important is a shared playlist or music taste to your social experience?", tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How likely are you to leave a party if you're not having fun?",               tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How often do you prefer small intimate gatherings over big parties?",          tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you being introduced to a large group of new people?",     tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy being the person who organises group outings?",          tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "How important is it that your social circle is diverse?",                      tags: ["PARTIES"], is_default: false, default_rank: null },

  // ── GAME NIGHT (12) ──────────────────────────────────────────────────
  { prompt: "How competitive do you get during games?",                                     tags: ["GAME NIGHT"], is_default: true,  default_rank: 19 },
  { prompt: "How much do you enjoy strategy games over luck-based ones?",                   tags: ["GAME NIGHT"], is_default: true,  default_rank: 20 },
  { prompt: "How often do you play board games, card games, or video games?",               tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How good are you at losing gracefully?",                                       tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy trivia and knowledge-based games?",                      tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How important is it to you that everyone has fun, even if you lose?",          tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy improv or creative group games?",                        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How long can you sustain focus during a complex game?",                        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How often do you replay or practise a game to improve?",                       tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How comfortable are you bending rules for the sake of fun?",                   tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy being on a team versus playing solo?",                   tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "How much do you enjoy games that involve physical skill or dexterity?",        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`\n📋 Seeding ${TEMPLATES.length} question templates…`);

  let inserted = 0;
  let skipped = 0;

  for (const t of TEMPLATES) {
    // Check for existing by prompt (case-insensitive)
    const { data: existing } = await supabase
      .from("question_templates")
      .select("id")
      .ilike("prompt", t.prompt.trim())
      .maybeSingle();

    if (existing) {
      // Update default flag + rank if changed
      await supabase
        .from("question_templates")
        .update({
          tags: t.tags,
          is_default: t.is_default,
          default_rank: t.default_rank ?? 0,
          is_active: true,
        })
        .eq("id", existing.id);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("question_templates").insert({
      prompt: t.prompt.trim(),
      type: "scale",
      options: null,
      tags: t.tags,
      weight: 1,
      "order": t.default_rank ?? 999,
      is_default: t.is_default,
      default_rank: t.default_rank ?? 0,
      is_active: true,
    });

    if (error) {
      console.error(`  ❌ ${t.prompt.slice(0, 60)}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`\n✅ Done: ${inserted} inserted, ${skipped} updated/skipped`);
  console.log(`   Total active templates should be: ${TEMPLATES.length}`);

  // Verify defaults
  const { count } = await supabase
    .from("question_templates")
    .select("*", { count: "exact", head: true })
    .eq("is_default", true);
  console.log(`   is_default=true count: ${count ?? "?"} (expected 20)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
