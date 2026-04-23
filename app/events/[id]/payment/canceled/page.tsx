import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentCanceledPage(props: Props) {
  const session = await requireApprovedUser();
  const { id: eventId } = await props.params;

  const supabase = getServiceSupabaseClient();

  // Reset payment status only — keep ticket_type_id so the user returns
  // directly to "Pay to confirm" for their already-selected tier, not the
  // full tier selector.
  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("id")
    .eq("event_id", eventId)
    .eq("profile_id", session.profile_id)
    .maybeSingle();

  if (attendee) {
    await supabase
      .from("event_attendees")
      .update({
        payment_status: "unpaid",
        stripe_checkout_session_id: null,
      })
      .eq("id", attendee.id);
  }

  redirect(`/events/${eventId}`);
}
