import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { AdminEventEditForm } from "./AdminEventEditForm";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, description, start_at, end_at, city, category, whats_included, poster_path, price_cents, payment_required, max_males, max_females")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  const { data: ticketTypes } = await supabase
    .from("event_ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const posterPublicUrl =
    baseUrl && (event as { poster_path?: string | null }).poster_path
      ? `${baseUrl}/storage/v1/object/public/event-posters/${(event as { poster_path: string }).poster_path}`
      : null;

  return (
    <AdminEventEditForm
      eventId={eventId}
      event={{
        id: String(event.id),
        title: event.title,
        description: event.description ?? null,
        start_at: event.start_at ?? null,
        end_at: (event as { end_at?: string | null }).end_at ?? null,
        city: event.city ?? null,
        category: (event as { category?: string }).category ?? "friends",
        whats_included: (event as { whats_included?: string | null }).whats_included ?? null,
        poster_path: (event as { poster_path?: string | null }).poster_path ?? null,
        price_cents: Number((event as { price_cents?: number }).price_cents ?? 0),
        payment_required: (event as { payment_required?: boolean }).payment_required !== false,
        max_males: (event as { max_males?: number | null }).max_males ?? null,
        max_females: (event as { max_females?: number | null }).max_females ?? null,
      }}
      ticketTypes={(ticketTypes || []) as { id: string; event_id: string; code: string; name: string; price_cents: number; currency: string; cap: number; sold: number; is_active: boolean; sort_order: number }[]}
      posterPublicUrl={posterPublicUrl}
    />
  );
}
