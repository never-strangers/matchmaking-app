"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect /messages/[id] to /messages?c=[id] so both URLs open the same thread.
 */
export default function ConversationRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const conversationId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";

  useEffect(() => {
    if (conversationId) {
      router.replace(`/messages?c=${conversationId}`);
    } else {
      router.replace("/messages");
    }
  }, [conversationId, router]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <p style={{ color: "var(--text-muted)" }}>Opening conversation…</p>
    </div>
  );
}
