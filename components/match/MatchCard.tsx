"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type MatchCardProps = {
  eventId: string;
  otherProfileId: string;
  displayName: string;
  score: number;
  aligned: string[];
  mismatched: string[];
  likedByMe: boolean;
  mutual: boolean;
  whatsappUrl?: string | null;
};

export function MatchCard({
  eventId,
  otherProfileId,
  displayName,
  score,
  aligned,
  mismatched,
  likedByMe,
  mutual,
  whatsappUrl,
}: MatchCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [justMutual, setJustMutual] = useState<boolean | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(
    mutual && whatsappUrl ? whatsappUrl : null
  );

  const handleExpressInterest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_profile_id: otherProfileId }),
      });
      if (!res.ok) throw new Error("Failed to record like");
      const data = (await res.json()) as { mutual?: boolean; whatsapp_url?: string };
      setJustMutual(!!data.mutual);
      if (data.whatsapp_url) setWhatsappLink(data.whatsapp_url);
      router.refresh();
    } catch {
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const showWhatsApp = mutual || justMutual;
  const link = whatsappLink || whatsappUrl;

  return (
    <Card variant="elevated" padding="md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text)" }}
          >
            {displayName}
          </h3>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Profile: {otherProfileId}
          </p>
          <div className="mt-3">
            <span
              className="text-3xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              {score}%
            </span>
            <span
              className="text-sm ml-2"
              style={{ color: "var(--text-muted)" }}
            >
              Compatibility
            </span>
          </div>
          {(aligned.length > 0 || mismatched.length > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Top Aligned
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {aligned.slice(0, 3).map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Top Mismatch
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {mismatched[0] || "No notable mismatches"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {showWhatsApp && link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-medium px-4 py-2.5 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: "var(--success)",
                color: "var(--success-foreground)",
              }}
            >
              Chat on WhatsApp
            </a>
          ) : !likedByMe ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleExpressInterest}
              disabled={loading}
            >
              {loading ? "Sending…" : "Send like"}
            </Button>
          ) : (
            <span
              className="text-sm py-2"
              style={{ color: "var(--text-muted)" }}
            >
              Like sent
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
