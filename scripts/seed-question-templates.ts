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
  { prompt: "Financial stability is a top priority in my life.", tags: ["PRINCIPLES"], is_default: true,  default_rank: 1  },
  { prompt: "My core values guide almost every decision I make.",             tags: ["PRINCIPLES"], is_default: true,  default_rank: 2  },
  { prompt: "I only surround myself with people who have strong personal integrity.",tags: ["PRINCIPLES"], is_default: true,  default_rank: 3  },
  { prompt: "I'd rather spend money on experiences than things.",                     tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "I find it hard to be close with someone who has very different political views.",           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "I actively try to live in an environmentally sustainable way.",              tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "My health and physical wellbeing are a high priority for me.",                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "Generosity with money is something I really value in others.",                        tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "My religious or spiritual beliefs are central to who I am.",           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "Being on time and reliable is very important to me.",                           tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "I'm committed to learning and growing throughout my entire life.",                                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "Equality and social justice are causes I care deeply about.",                  tags: ["PRINCIPLES"], is_default: false, default_rank: null },
  { prompt: "Ambition is a major driver of the choices I make.",                                   tags: ["PRINCIPLES"], is_default: false, default_rank: null },

  // ── INTROSPECTIVE (13) ────────────────────────────────────────────────
  { prompt: "I regularly take time to reflect on my own personal growth.",                            tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 4  },
  { prompt: "I'm comfortable with uncertainty and don't need all the answers.",               tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 5  },
  { prompt: "I have a clear understanding of what triggers my emotions.",                      tags: ["INTROSPECTIVE"], is_default: true,  default_rank: 6  },
  { prompt: "I regularly journal or find other ways to process my thoughts.",                 tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "My past experiences have strongly shaped who I am today.",                        tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable asking for help when I need it.",                    tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I'm good at setting and enforcing my own boundaries.",              tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I regularly question and challenge my own assumptions.",                             tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I have a clear sense of where I want to be in the long run.",                              tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "Spending time alone recharges me more than it drains me.",                       tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I actively seek honest feedback about myself from people I trust.",             tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I believe in therapy and investing in professional self-development.",         tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },
  { prompt: "I'm able to forgive myself when I make mistakes.",                                  tags: ["INTROSPECTIVE"], is_default: false, default_rank: null },

  // ── SPICY (12) ────────────────────────────────────────────────────────
  { prompt: "I love making spontaneous decisions without much planning.",                          tags: ["SPICY"], is_default: true,  default_rank: 7  },
  { prompt: "I'm willing to share a controversial opinion, even in public.",              tags: ["SPICY"], is_default: true,  default_rank: 8  },
  { prompt: "I'll try almost any food at least once.",                   tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable talking openly about money with people I just met.", tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'd quit a job I hate even without another one lined up.",      tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable with public displays of affection.",                   tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I enjoy a good debate with people who see things differently.",                 tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'd happily travel solo to a place I know nothing about.",                tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'm open about my salary with close friends.",                       tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable being the centre of attention.",                  tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "I'll speak up even if my view goes against the group.",             tags: ["SPICY"], is_default: false, default_rank: null },
  { prompt: "Not knowing the plan in advance doesn't stress me out.",                tags: ["SPICY"], is_default: false, default_rank: null },

  // ── FAMILY TIME (12) ─────────────────────────────────────────────────
  { prompt: "I'm very close with my immediate family.",                                tags: ["FAMILY TIME"], is_default: true,  default_rank: 9  },
  { prompt: "I make a consistent effort to attend family gatherings.",                            tags: ["FAMILY TIME"], is_default: true,  default_rank: 10 },
  { prompt: "My family's opinions play a big role in my major life decisions.",      tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "It's important to me that a partner gets along well with my family.",              tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I regularly check in on my parents or siblings.",                            tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I expect to be very hands-on in raising children someday.",           tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable discussing family problems with people outside my family.",           tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "Family traditions are something I genuinely value and protect.",                                 tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I'd be willing to relocate if it meant being closer to family.",                      tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "Shared family meals are something I value and prioritise.",                 tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I'm actively involved in extended family events and decisions.",                tags: ["FAMILY TIME"], is_default: false, default_rank: null },
  { prompt: "I feel a strong duty to financially support my family.",              tags: ["FAMILY TIME"], is_default: false, default_rank: null },

  // ── COWORKERS (12) ───────────────────────────────────────────────────
  { prompt: "I thrive in collaborative work environments.",                       tags: ["COWORKERS"], is_default: true,  default_rank: 11 },
  { prompt: "I keep a clear boundary between my work and personal life.",     tags: ["COWORKERS"], is_default: true,  default_rank: 12 },
  { prompt: "I'm comfortable giving honest, critical feedback to colleagues.",              tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "I enjoy socialising with coworkers outside of work.",                   tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "A strong company culture is important to my job satisfaction.",          tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "Recognition from my manager matters a lot to me.",                         tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "I work well remotely and don't need daily check-ins.",            tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "Career progression is a key driver of my work motivation.",              tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "Feeling psychologically safe in my team is essential.",                          tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "I actively mentor or support junior colleagues.",                        tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "I'm comfortable respectfully disagreeing with my manager.",                       tags: ["COWORKERS"], is_default: false, default_rank: null },
  { prompt: "My job is a significant part of how I define myself.",                        tags: ["COWORKERS"], is_default: false, default_rank: null },

  // ── BESTIES (13) ─────────────────────────────────────────────────────
  { prompt: "My friends would describe me as deeply loyal.",                            tags: ["BESTIES"], is_default: true,  default_rank: 13 },
  { prompt: "I'm usually the one who initiates plans with close friends.",                     tags: ["BESTIES"], is_default: true,  default_rank: 14 },
  { prompt: "I'm comfortable being deeply vulnerable with close friends.",               tags: ["BESTIES"], is_default: true,  default_rank: 15 },
  { prompt: "It's important to me that my friends share my sense of humour.",            tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I check in on friends who seem to be going through a hard time.",                       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I value friends who tell me hard truths over those who just agree with me.",   tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I want friends who challenge my worldview, not just confirm it.",            tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I have a small circle of very deep friendships rather than many surface-level ones.",                                tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I put real effort into maintaining friendships across distance.",       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I open up to new people relatively quickly.",                                    tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "I'm willing to let go of a friendship that has run its course.",       tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "My friends are a main source of emotional support for me.",                  tags: ["BESTIES"], is_default: false, default_rank: null },
  { prompt: "Reciprocity is essential — I need to feel the effort goes both ways.",                            tags: ["BESTIES"], is_default: false, default_rank: null },

  // ── PARTIES (13) ─────────────────────────────────────────────────────
  { prompt: "I love going out to social events regularly.",                           tags: ["PARTIES"], is_default: true,  default_rank: 16 },
  { prompt: "Being in a lively crowd energises me.",                     tags: ["PARTIES"], is_default: true,  default_rank: 17 },
  { prompt: "I often stay out past midnight when I'm out socialising.",                    tags: ["PARTIES"], is_default: true,  default_rank: 18 },
  { prompt: "The atmosphere of a venue makes or breaks my night.",                tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I have no problem striking up conversations with strangers at events.",  tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I love dancing when I'm out socially.",                            tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I regularly host social gatherings at my place.",                        tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "Good music is essential to my social experience.", tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I'll leave a party early if I'm not having a good time.",               tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I prefer intimate gatherings over large parties.",          tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "Being introduced to a large group of new people doesn't faze me.",     tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I enjoy being the one who organises group outings.",          tags: ["PARTIES"], is_default: false, default_rank: null },
  { prompt: "I actively want a diverse and varied social circle.",                      tags: ["PARTIES"], is_default: false, default_rank: null },

  // ── GAME NIGHT (12) ──────────────────────────────────────────────────
  { prompt: "I get quite competitive when playing games.",                                     tags: ["GAME NIGHT"], is_default: true,  default_rank: 19 },
  { prompt: "I prefer games of strategy over games of pure chance.",                   tags: ["GAME NIGHT"], is_default: true,  default_rank: 20 },
  { prompt: "Games — board, card, or video — are a regular part of my life.",               tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I can lose a game gracefully and still have fun.",                                       tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I love trivia and knowledge-based games.",                      tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "Everyone having a good time matters more to me than winning.",          tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I enjoy improv and creative games that don't have a set winner.",                        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I can stay focused and engaged through long, complex games.",                        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I'll replay or practise a game just to get better at it.",                       tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I'm happy to bend the rules if it makes the game more fun.",                   tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I'd rather compete as part of a team than play solo.",                   tags: ["GAME NIGHT"], is_default: false, default_rank: null },
  { prompt: "I enjoy games that involve physical skill or hand-eye coordination.",        tags: ["GAME NIGHT"], is_default: false, default_rank: null },
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
