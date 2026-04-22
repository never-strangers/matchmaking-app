import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentCanceledPage(props: Props) {
  const session = await requireApprovedUser();
  const { id: eventId } = await props.params;

  const supabase = getServiceSupabaseClient();

  // Clear the ticket reservation so the user can start fresh
  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("id, ticket_type_id")
    .eq("event_id", eventId)
    .eq("profile_id", session.profile_id)
    .maybeSingle();

  if (attendee) {
    // Decrement sold count if a ticket type was held
    if (attendee.ticket_type_id) {
      const { data: tt } = await supabase
        .from("event_ticket_types")
        .select("sold")
        .eq("id", attendee.ticket_type_id)
        .single();
      if (tt) {
        await supabase
          .from("event_ticket_types")
          .update({ sold: Math.max(0, (tt.sold || 0) - 1) })
          .eq("id", attendee.ticket_type_id);
      }
    }

    await supabase
      .from("event_attendees")
      .update({
        ticket_type_id: null,
        payment_status: "unpaid",
        stripe_checkout_session_id: null,
      })
      .eq("id", attendee.id);
  }

  redirect(`/events/${eventId}`);
}
