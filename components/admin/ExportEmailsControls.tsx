"use client";

import { useState } from "react";

type Segment = "all" | "checked_in" | "paid" | "eligible";

const SEGMENT_LABELS: Record<Segment, string> = {
  all: "All attendees",
  checked_in: "Checked-in only",
  paid: "Paid only",
  eligible: "Eligible for matching",
};

type Props = {
  eventId: string;
  paymentRequired: boolean;
};

export function ExportEmailsControls({ eventId, paymentRequired }: Props) {
  const [segment, setSegment] = useState<Segment>("all");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "done">("idle");

  const apiBase = `/api/admin/events/${eventId}/export-emails`;

  const handleDownload = async () => {
    setDownloadState("loading");
    try {
      const res = await fetch(`${apiBase}?segment=${segment}&format=csv`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId.slice(0, 8)}-emails-${segment}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2500);
    } catch {
      setDownloadState("idle");
    }
  };

  const handleCopy = async () => {
    setCopyState("copying");
    try {
      const res = await fetch(`${apiBase}?segment=${segment}&format=txt`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      const emails = text
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean);
      if (emails.length === 0) {
        setCopyState("error");
        setTimeout(() => setCopyState("idle"), 2000);
        return;
      }
      await navigator.clipboard.writeText(emails.join(", "));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  // Only show segments relevant to event type
  const segments: Segment[] = paymentRequired
    ? ["all", "checked_in", "paid", "eligible"]
    : ["all", "checked_in", "eligible"];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ marginBottom: 16 }}
    >
      {/* Segment selector */}
      <select
        value={segment}
        onChange={(e) => setSegment(e.target.value as Segment)}
        data-testid="admin-export-emails-segment"
        style={{
          padding: "6px 10px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
        }}
      >
        {segments.map((s) => (
          <option key={s} value={s}>
            {SEGMENT_LABELS[s]}
          </option>
        ))}
      </select>

      {/* Export CSV */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloadState === "loading"}
        data-testid="admin-export-emails-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          cursor: downloadState === "loading" ? "not-allowed" : "pointer",
          opacity: downloadState === "loading" ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {downloadState === "loading" ? (
          "Exporting…"
        ) : downloadState === "done" ? (
          <>✓ Downloaded</>
        ) : (
          <>
            <DownloadIcon />
            Export CSV
          </>
        )}
      </button>

      {/* Copy emails */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={copyState === "copying"}
        data-testid="admin-copy-emails-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color:
            copyState === "copied"
              ? "#16a34a"
              : copyState === "error"
              ? "var(--danger)"
              : "var(--text)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          cursor: copyState === "copying" ? "not-allowed" : "pointer",
          opacity: copyState === "copying" ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {copyState === "copying" ? (
          "Copying…"
        ) : copyState === "copied" ? (
          "✓ Copied!"
        ) : copyState === "error" ? (
          "⚠ No emails"
        ) : (
          <>
            <CopyIcon />
            Copy emails
          </>
        )}
      </button>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
