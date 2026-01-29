import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import type {
  QuestionnaireAnswers,
  MatchUser,
  Question,
} from "@/types/questionnaire";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchCard } from "@/components/match/MatchCard";
import { MatchRealtimeSubscriber } from "@/components/match/MatchRealtimeSubscriber";

type MatchRow = {
  otherProfileId: string;
  displayName: string;
  score: number;
  aligned: string[];
  mismatched: string[];
  likedByMe: boolean;
  mutual: boolean;
  whatsappUrl: string | null;
};

export default async function MatchPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    redirect("/");
  }

  const supabase = getServiceSupabaseClient();

  // For now, use the single seeded demo event
  const { data: events } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("status", "live")
    .order("created_at", { ascending: true });

  if (!events || events.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Join an event first to see your matches."
        />
        <EmptyState
          title="No events available"
          description="Check back soon for upcoming gatherings in your city."
        />
      </div>
    );
  }

  const event = events[0];

  // Load all answers for this event
  const { data: answerRows } = await supabase
    .from("answers")
    .select("profile_id, question_id, answer")
    .eq("event_id", event.id);

  if (!answerRows || answerRows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Admin needs to run matching for this event."
        />
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Once matching is run and attendees answer questions, your top matches will appear here."
          />
        </Card>
        <div className="mt-8">
          <Link
            href="/events"
            className="text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  // Build QuestionnaireAnswers per profile
  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  answerRows.forEach((row: any) => {
    const pid = String(row.profile_id);
    const qid = String(row.question_id);
    const v = row.answer as any;
    const n =
      typeof v === "number"
        ? v
        : typeof v?.value === "number"
        ? v.value
        : null;
    if (!(n === 1 || n === 2 || n === 3 || n === 4)) return;
    if (!answersByProfile.has(pid)) {
      answersByProfile.set(pid, {});
    }
    const qa = answersByProfile.get(pid)!;
    qa[qid] = n;
  });

  const currentAnswers = answersByProfile.get(session.profile_id);
  if (!currentAnswers) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Answer this event's questions to see your matches."
        />
        <Card padding="lg">
          <EmptyState
            title="No answers yet"
            description="Complete the event questionnaire first, then return to see your matches."
          />
        </Card>
        <div className="mt-8">
          <Link
            href={`/events/${event.id}/questions`}
            className="text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            → Go to Event Questions
          </Link>
        </div>
      </div>
    );
  }

  // Build questions model for explanation text
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, prompt, weight")
    .eq("event_id", event.id)
    .order("order_index", { ascending: true });

  const questions: Question[] = (questionRows || []).map((q: any) => ({
    id: String(q.id),
    text: q.prompt,
    category: "Custom" as any,
    weight: Number(q.weight ?? 1),
    isDealbreaker: false,
  }));

  // Build MatchUser models
  const others: MatchUser[] = [];
  for (const [pid, qa] of answersByProfile.entries()) {
    if (pid === session.profile_id) continue;
    others.push({
      id: pid,
      name: pid,
      city: "",
      answers: qa,
    });
  }

  if (others.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Waiting for more attendees to complete their questionnaires."
        />
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Once others answer their questions, your matches will appear here."
          />
        </Card>
        <div className="mt-8">
          <Link
            href="/events"
            className="text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const currentUser: MatchUser = {
    id: session.profile_id,
    name: session.display_name,
    city: "",
    answers: currentAnswers,
  };

  const computed = getMatchesForUser(currentUser, others, questions);

  // Load likes for this event (from or to current user)
  const { data: likeRows } = await supabase
    .from("likes")
    .select("from_profile_id, to_profile_id")
    .eq("event_id", event.id)
    .or(
      `from_profile_id.eq.${session.profile_id},to_profile_id.eq.${session.profile_id}`
    );

  const likedByMe = new Set<string>();
  const likedByThem = new Set<string>();
  (likeRows || []).forEach((r: { from_profile_id: string; to_profile_id: string }) => {
    if (r.from_profile_id === session.profile_id) likedByMe.add(r.to_profile_id);
    if (r.to_profile_id === session.profile_id) likedByThem.add(r.from_profile_id);
  });

  // Load display_name and phone_e164 for other profiles
  const otherIds = [...new Set(others.map((o) => o.id))];
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, phone_e164")
    .in("id", otherIds.length ? otherIds : ["__none__"]);

  const profileMap = new Map<
    string,
    { display_name: string | null; phone_e164: string | null }
  >();
  (profileRows || []).forEach((p: { id: string; display_name: string | null; phone_e164: string | null }) => {
    profileMap.set(p.id, { display_name: p.display_name, phone_e164: p.phone_e164 });
  });

  function buildWhatsAppUrl(phoneE164: string): string {
    const digits = phoneE164.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  }

  const matches: MatchRow[] = computed.map((m) => {
    const otherId = m.user.id;
    const info = profileMap.get(otherId);
    const displayName = info?.display_name || m.user.name || otherId;
    const mutual = likedByMe.has(otherId) && likedByThem.has(otherId);
    const phone = info?.phone_e164;
    const whatsappUrl = mutual && phone ? buildWhatsAppUrl(phone) : null;
    return {
      otherProfileId: otherId,
      displayName,
      score: m.score,
      aligned: m.aligned,
      mismatched: m.mismatched,
      likedByMe: likedByMe.has(otherId),
      mutual,
      whatsappUrl,
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <MatchRealtimeSubscriber eventId={event.id} />
      <PageHeader
        title="Your Matches"
        subtitle={`Top matches for ${event.title}`}
      />

      {matches.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Once matching is run, your top matches will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <MatchCard
              key={m.otherProfileId}
              eventId={event.id}
              otherProfileId={m.otherProfileId}
              displayName={m.displayName}
              score={m.score}
              aligned={m.aligned}
              mismatched={m.mismatched}
              likedByMe={m.likedByMe}
              mutual={m.mutual}
              whatsappUrl={m.whatsappUrl}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/events"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}

