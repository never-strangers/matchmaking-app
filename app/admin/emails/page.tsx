"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type TemplateSummary = {
  key: string;
  label: string;
  hasOverride: boolean;
  enabled: boolean;
  vars: string[];
  requiredVars: string[];
  updatedAt: string | null;
  updatedBy: string | null;
  sentCount7d: number;
  errorCount7d: number;
  lastSentAt: string | null;
};

type TemplateDetail = {
  key: string;
  meta: TemplateSummary;
  override: { subject: string; body_html: string; updated_at: string } | null;
  codeDefault: { subject: string; body_html: string };
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex items-center rounded-full transition-colors focus:outline-none"
      style={{
        width: 40,
        height: 22,
        background: enabled ? "#16a34a" : "#d1d5db",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: enabled ? "translateX(20px)" : "translateX(3px)",
          transition: "transform 0.15s ease",
        }}
      />
    </button>
  );
}

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("Never Strangers");
  const [senderEmail, setSenderEmail] = useState("hello@thisisneverstrangers.com");
  const [senderSaving, setSenderSaving] = useState(false);
  const [senderMsg, setSenderMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<TemplateDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch("/api/admin/emails");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    if (data.sender) {
      setSenderName(data.sender.name);
      setSenderEmail(data.sender.email);
    }
    setLoading(false);
  }

  async function handleToggle(key: string, enabled: boolean) {
    setToggling(key);
    // Optimistic update
    setTemplates((prev) => prev.map((t) => t.key === key ? { ...t, enabled } : t));
    const res = await fetch(`/api/admin/emails/${key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      // Rollback on failure
      setTemplates((prev) => prev.map((t) => t.key === key ? { ...t, enabled: !enabled } : t));
    }
    setToggling(null);
  }

  async function handleSaveSender() {
    setSenderSaving(true);
    setSenderMsg(null);
    const res = await fetch("/api/admin/emails/_sender", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: senderName, email: senderEmail }),
    });
    const data = await res.json();
    setSenderSaving(false);
    setSenderMsg(res.ok ? "Saved." : (data.error ?? "Save failed"));
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function openEdit(key: string) {
    setDrawerLoading(true);
    setDrawerOpen(true);
    setEditing(null);
    setError(null);
    setSuccessMsg(null);
    setPreviewHtml(null);

    const res = await fetch(`/api/admin/emails/${key}`);
    const data: TemplateDetail = await res.json();
    setEditing(data);
    setSubject(data.override?.subject ?? data.codeDefault.subject);
    setBodyHtml(data.override?.body_html ?? data.codeDefault.body_html);
    setDrawerLoading(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    const res = await fetch(`/api/admin/emails/${editing.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body_html: bodyHtml }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Save failed"); return; }
    setSuccessMsg("Saved.");
    await fetchTemplates();
  }

  async function handleRestore() {
    if (!editing) return;
    if (!confirm("Restore default? Any saved override will be deleted.")) return;
    setRestoring(true);
    setError(null);
    if (editing.override) {
      await fetch(`/api/admin/emails/${editing.key}`, { method: "DELETE" });
    }
    setSubject(editing.codeDefault.subject);
    setBodyHtml(editing.codeDefault.body_html);
    setPreviewHtml(null);
    setRestoring(false);
    setSuccessMsg("Restored to default.");
    await fetchTemplates();
  }

  async function handleTest() {
    if (!editing) return;
    setTesting(true);
    setError(null);
    setSuccessMsg(null);
    const res = await fetch(`/api/admin/emails/${editing.key}/test`, { method: "POST" });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) { setError(data.error ?? "Test send failed"); return; }
    setSuccessMsg("Test email sent to your address.");
  }

  function handlePreview() {
    const wrapped = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6">
<tr><td align="center" style="padding:24px 16px">
${bodyHtml}
</td></tr>
</table>
</body></html>`;
    setPreviewHtml(wrapped);
  }

  function insertVar(v: string) {
    const el = bodyRef.current;
    if (!el) { setBodyHtml((b) => b + `{{${v}}}`); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = bodyHtml.slice(0, start) + `{{${v}}}` + bodyHtml.slice(end);
    setBodyHtml(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + v.length + 4, start + v.length + 4);
    }, 0);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm hover:underline py-2 inline-block" style={{ color: "var(--text-muted)" }}>
          ← Admin Dashboard
        </Link>
      </div>

      <PageHeader title="Email Templates" subtitle="Edit subject and full email HTML including header and footer." />

      {/* Sender config */}
      <Card padding="md" className="mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>From address</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Display name</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border, #ddd)", background: "var(--bg)", color: "var(--text)" }}
              value={senderName}
              onChange={(e) => { setSenderName(e.target.value); setSenderMsg(null); }}
              placeholder="Never Strangers"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Email address</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border, #ddd)", background: "var(--bg)", color: "var(--text)" }}
              value={senderEmail}
              onChange={(e) => { setSenderEmail(e.target.value); setSenderMsg(null); }}
              placeholder="hello@thisisneverstrangers.com"
            />
          </div>
          <Button onClick={handleSaveSender} disabled={senderSaving}>
            {senderSaving ? "Saving…" : "Save"}
          </Button>
        </div>
        {senderMsg && (
          <p className="text-xs mt-2 font-medium" style={{ color: senderMsg === "Saved." ? "#166534" : "#991b1b" }}>{senderMsg}</p>
        )}
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Preview: <span style={{ color: "var(--text)" }}>{senderName} &lt;{senderEmail}&gt;</span>
        </p>
      </Card>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #eee)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Template</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Sent (7d)</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Last updated</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.key}
                  style={{
                    borderBottom: "1px solid var(--border, #eee)",
                    opacity: t.enabled ? 1 : 0.5,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "var(--text)" }}>{t.label}</p>
                    <code className="text-xs" style={{ color: "var(--text-muted)" }}>{t.key}</code>
                  </td>
                  <td className="px-4 py-3">
                    {t.hasOverride ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>
                        ● custom
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>default</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(t.sentCount7d > 0 || t.errorCount7d > 0) ? (
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                          {t.sentCount7d} sent
                          {t.errorCount7d > 0 && (
                            <span className="ml-1.5 font-semibold" style={{ color: "#dc2626" }}>
                              · {Math.round((t.errorCount7d / (t.sentCount7d + t.errorCount7d)) * 100)}% err
                            </span>
                          )}
                        </p>
                        {t.lastSentAt && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>last {formatTimeAgo(t.lastSentAt)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.updatedAt ? (
                      <div>
                        <p className="text-xs" style={{ color: "var(--text)" }}>
                          {new Date(t.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {t.updatedBy && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.updatedBy}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center" style={{ opacity: toggling === t.key ? 0.5 : 1 }}>
                      <Toggle
                        enabled={t.enabled}
                        onChange={(v) => handleToggle(t.key, v)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(t.key)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={(e) => { if (e.target === e.currentTarget) { setDrawerOpen(false); setPreviewHtml(null); } }}>
          <div className="h-full overflow-y-auto flex flex-col" style={{ background: "var(--bg, #fff)", width: "min(680px, 100vw)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}>
            {drawerLoading || !editing ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border, #eee)" }}>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text)" }}>{editing.meta.label}</p>
                    <code className="text-xs" style={{ color: "var(--text-muted)" }}>{editing.key}</code>
                  </div>
                  <button onClick={() => { setDrawerOpen(false); setPreviewHtml(null); }} className="text-2xl leading-none" style={{ color: "var(--text-muted)" }}>×</button>
                </div>

                <div className="flex-1 px-6 py-5 space-y-5">
                  {error && (
                    <div className="rounded p-3 text-sm font-medium" style={{ background: "#fee2e2", color: "#991b1b" }}>{error}</div>
                  )}
                  {successMsg && (
                    <div className="rounded p-3 text-sm font-medium" style={{ background: "#dcfce7", color: "#166534" }}>{successMsg}</div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Subject</label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--border, #ddd)", background: "var(--bg)", color: "var(--text)" }}
                      value={subject}
                      onChange={(e) => { setSubject(e.target.value); setSuccessMsg(null); }}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Available variables <span className="normal-case font-normal">(click to insert at cursor)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {editing.meta.vars.map((v) => (
                        <button
                          key={v}
                          onClick={() => insertVar(v)}
                          className="text-xs px-2 py-0.5 rounded font-mono border hover:opacity-75"
                          style={{ borderColor: "var(--border, #ddd)", color: "var(--text-muted)", background: "var(--bg-muted, #f9f9f9)" }}
                        >
                          {`{{${v}}}`}
                          {editing.meta.requiredVars.includes(v) && (
                            <span style={{ color: "#dc2626" }} title="required"> *</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Body HTML</label>
                    <textarea
                      ref={bodyRef}
                      className="w-full rounded border px-3 py-2 text-xs font-mono"
                      style={{ borderColor: "var(--border, #ddd)", background: "var(--bg)", color: "var(--text)", minHeight: 300, resize: "vertical" }}
                      value={bodyHtml}
                      onChange={(e) => { setBodyHtml(e.target.value); setSuccessMsg(null); setPreviewHtml(null); }}
                    />
                  </div>

                  {previewHtml && (
                    <div>
                      <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Preview</p>
                      <div className="rounded border overflow-hidden" style={{ borderColor: "var(--border, #ddd)" }}>
                        <iframe
                          srcDoc={previewHtml}
                          style={{ width: "100%", height: 480, border: "none" }}
                          title="Email preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 px-6 py-4 border-t flex flex-wrap gap-2 items-center justify-between" style={{ borderColor: "var(--border, #eee)", background: "var(--bg, #fff)" }}>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="secondary" onClick={handlePreview}>Preview</Button>
                    <Button variant="secondary" onClick={handleTest} disabled={testing}>
                      {testing ? "Sending…" : "Send test to me"}
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={handleRestore} disabled={restoring}>
                    {restoring ? "Restoring…" : "Restore default"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
