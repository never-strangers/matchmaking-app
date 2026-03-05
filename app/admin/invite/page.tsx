"use client";

import { useState, useEffect, useRef } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import QRCode from "qrcode";

type InviteRow = {
  id: string;
  display_name: string;
  phone_e164: string;
  role: string;
  invite_url: string;
  invite_token: string;
  is_active: boolean;
};

type GeneratedUrl = {
  display_name: string;
  url: string;
};

function QRCell({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 64, margin: 1 });
    }
  }, [url]);
  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

export default function AdminInvitePage() {
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedUrl[]>([]);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [rows, setRows] = useState<InviteRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/invite/list")
      .then((r) => {
        if (r.status === 401) { redirect("/events"); }
        return r.json() as Promise<{ rows?: InviteRow[]; error?: string }>;
      })
      .then((d) => {
        if (d.error) setListError(d.error);
        else setRows(d.rows ?? []);
      })
      .catch(() => setListError("Failed to load invite links."))
      .finally(() => setListLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    setGenerated([]);
    try {
      const res = await fetch("/api/admin/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json() as { ok?: boolean; urls?: GeneratedUrl[]; error?: string };
      if (!res.ok || data.error) {
        setGenerateError(data.error || "Generation failed.");
      } else {
        setGenerated(data.urls ?? []);
        // Prepend to list
        const newRows: InviteRow[] = (data.urls ?? []).map((u) => ({
          id: Math.random().toString(),
          display_name: u.display_name,
          phone_e164: "",
          role: "user",
          invite_url: u.url,
          invite_token: u.url.split("/").pop() ?? "",
          is_active: true,
        }));
        setRows((prev) => [...newRows, ...prev]);
      }
    } catch {
      setGenerateError("Something went wrong.");
    }
    setGenerating(false);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const downloadAllQR = async () => {
    const canvases = await Promise.all(
      rows.map((row) =>
        new Promise<{ name: string; dataUrl: string }>((resolve) => {
          const canvas = document.createElement("canvas");
          QRCode.toCanvas(canvas, row.invite_url, { width: 200, margin: 2 }, () => {
            resolve({ name: row.display_name, dataUrl: canvas.toDataURL() });
          });
        })
      )
    );

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Never Strangers Invite QR Codes</title>
<style>body{font-family:sans-serif;background:#F3F1E8;padding:32px;}
h1{font-size:24px;margin-bottom:32px;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px;}
.card{background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}
.card img{width:200px;height:200px;}
.name{font-size:13px;font-weight:600;margin-top:8px;color:#080808;}
.url{font-size:10px;color:#6b6b60;word-break:break-all;margin-top:4px;}
</style></head><body>
<h1>Never Strangers — Invite QR Codes</h1>
<div class="grid">
${canvases.map((c) => `<div class="card"><img src="${c.dataUrl}"/><div class="name">${c.name}</div></div>`).join("")}
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <AdminShell>
      <PageHeader
        title="Invite Links & QR Codes"
        subtitle="Generate and manage invite tokens for new guests."
      />

      {/* Section A — Generate */}
      <Card className="mb-8">
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 20,
            color: "var(--text)",
            marginBottom: 16,
          }}
        >
          Generate new tokens
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label
              htmlFor="count"
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}
            >
              Number of invites
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{
                width: 100,
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                color: "var(--text)",
                backgroundColor: "var(--bg-panel)",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>
          <div style={{ paddingTop: 22 }}>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate Invite Links"}
            </Button>
          </div>
        </div>

        {generateError && (
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--danger)" }}>{generateError}</p>
        )}

        {generated.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              {generated.length} invite{generated.length !== 1 ? "s" : ""} created:
            </p>
            <div
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 16px",
                maxHeight: 240,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {generated.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 80 }}>{g.display_name}</span>
                  <code style={{ fontSize: 12, color: "var(--text)", flex: 1, wordBreak: "break-all" }}>{g.url}</code>
                  <button
                    onClick={() => copyUrl(g.url)}
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      border: "1px solid var(--border)",
                      borderRadius: 100,
                      cursor: "pointer",
                      backgroundColor: "var(--bg-panel)",
                      color: copied === g.url ? "var(--success)" : "var(--text)",
                      flexShrink: 0,
                    }}
                  >
                    {copied === g.url ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Section B — Existing */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 20,
            color: "var(--text)",
          }}
        >
          Existing invite links
        </h2>
        {rows.length > 0 && (
          <Button variant="secondary" size="sm" onClick={downloadAllQR}>
            Download all QR codes
          </Button>
        )}
      </div>

      {listLoading && (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading…</p>
      )}
      {listError && (
        <p style={{ fontSize: 14, color: "var(--danger)" }}>{listError}</p>
      )}

      {!listLoading && !listError && rows.length === 0 && (
        <Card>
          <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
            No invite links yet. Generate some above.
          </p>
        </Card>
      )}

      {!listLoading && rows.length > 0 && (
        <Card padding="none">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>
                  {["Name", "Phone", "Role", "Status", "QR", "Invite URL", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-subtle)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: i % 2 === 0 ? "var(--bg-panel)" : "var(--bg)",
                    }}
                  >
                    <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>
                      {row.display_name}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {row.phone_e164 || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {row.role}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: row.is_active ? "var(--success-light)" : "var(--bg-dark)",
                          color: row.is_active ? "var(--success)" : "var(--text-muted)",
                        }}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 16px" }}>
                      <QRCell url={row.invite_url} />
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: 260 }}>
                      <code
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          wordBreak: "break-all",
                          display: "block",
                        }}
                      >
                        {row.invite_url}
                      </code>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => copyUrl(row.invite_url)}
                        style={{
                          fontSize: 12,
                          padding: "4px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: 100,
                          cursor: "pointer",
                          backgroundColor: "var(--bg-panel)",
                          color: copied === row.invite_url ? "var(--success)" : "var(--text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copied === row.invite_url ? "Copied!" : "Copy URL"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
