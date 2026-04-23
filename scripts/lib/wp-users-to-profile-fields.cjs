/**
 * Shared: `public."wp-users"` row (REST/CSV shape) → `profiles` field mapping.
 * Handles PHP-serialized meta:gender / meta:Looking / meta:submitted (php-serialize).
 * Used by migrate-wp-users.cjs and update-profiles-from-wp.cjs.
 */
const { unserialize, isSerialized } = require("php-serialize");

function normalizeGender(v) {
  if (!v) return null;
  const l = String(v).toLowerCase().trim();
  if (l === "female" || l === "f") return "female";
  if (l === "male" || l === "m") return "male";
  return null;
}

function normalizeAttractedTo(v) {
  if (!v) return null;
  return String(v)
    .toLowerCase()
    .replace(/[;,]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s === "men" || s === "women")
    .join(",") || null;
}

function parseLookingFor(v) {
  if (!v) return [];
  return String(v)
    .toLowerCase()
    .replace(/[;,]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      if (s.includes("friend")) return "friends";
      if (s.includes("date") || s.includes("dating")) return "date";
      return null;
    })
    .filter(Boolean);
}

function mapCity(country, billingCity) {
  const v = String(country || billingCity || "").toLowerCase().trim();
  if (v.includes("singapore") || v === "sg") return "sg";
  if (v.includes("thailand") || v.includes("bangkok") || v === "th") return "th";
  if (v.includes("vietnam") || v.includes("ho chi") || v.includes("hanoi") || v === "vn") return "vn";
  if (v.includes("hong kong") || v === "hk") return "hk";
  if (v.includes("malaysia") || v.includes("kuala") || v === "my") return "my";
  if (v.includes("indonesia") || v.includes("jakarta") || v === "id") return "id";
  if (v.includes("japan") || v.includes("tokyo") || v === "jp") return "jp";
  if (v.includes("korea") || v.includes("seoul") || v === "kr") return "kr";
  if (v.includes("australia") || v === "au") return "au";
  if (v.includes("united kingdom") || v === "uk" || v === "gb") return "uk";
  if (v.includes("united states") || v === "us") return "us";
  return v ? v.slice(0, 20) : "sg";
}

function mapStatus(accountStatus) {
  const s = String(accountStatus || "").toLowerCase().trim();
  if (s === "approved") return "approved";
  if (s === "inactive" || s === "rejected" || s === "banned") return "rejected";
  return "pending_verification";
}

function mapRole(roles) {
  const r = String(roles || "").toLowerCase();
  if (r.includes("administrator")) return "admin";
  if (r.includes("host") || r.includes("editor")) return "host";
  return "user";
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function g(user, key) {
  return user[key] ?? user[`meta:${key}`] ?? null;
}

function readWpStringField(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (isSerialized(t)) {
    try {
      const o = unserialize(t);
      return phpValueToJoinedString(o);
    } catch {
      return null;
    }
  }
  return t;
}

function readWpFirstScalar(raw) {
  const joined = readWpStringField(raw);
  if (!joined) return null;
  const first = String(joined).split(",")[0].trim();
  return first || null;
}

function phpValueToJoinedString(v) {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    const strs = v.filter((x) => typeof x === "string" || typeof x === "number").map((x) => String(x));
    return strs.length ? strs.join(", ") : null;
  }
  return null;
}

function extractSubmittedMeta(user) {
  const raw = g(user, "submitted");
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t || !isSerialized(t)) return null;
  try {
    const o = unserialize(t);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return {
        country: o.country,
        gender: o.gender,
        attracted: o.attracted,
        looking: o.looking,
        Why: o.Why ?? o.why,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function resolveStringField(user, sub, keys) {
  for (const key of keys) {
    const raw = g(user, key);
    if (raw == null) continue;
    const s = readWpStringField(raw);
    if (s) return s;
  }
  if (sub) {
    for (const k of keys) {
      const subKey = k === "Why" || k === "why" ? "Why" : k;
      const v = sub[subKey] ?? sub[k];
      if (v == null) continue;
      if (Array.isArray(v)) {
        const j = phpValueToJoinedString(v);
        if (j) return j;
      } else {
        const s = readWpStringField(String(v)) || String(v).trim();
        if (s) return s;
      }
    }
  }
  return null;
}

function resolveLookingFor(user, sub) {
  const raw = g(user, "Looking") || g(user, "looking_for") || g(user, "looking");
  if (raw != null) {
    if (Array.isArray(raw)) {
      return parseLookingFor(phpValueToJoinedString(raw) || "");
    }
    const s = readWpStringField(raw) || String(raw).trim();
    if (s) return parseLookingFor(s);
  }
  if (sub?.looking != null) {
    if (Array.isArray(sub.looking)) {
      return parseLookingFor(phpValueToJoinedString(sub.looking) || "");
    }
    const s = readWpStringField(String(sub.looking)) || String(sub.looking).trim();
    if (s) return parseLookingFor(s);
  }
  return [];
}

/**
 * @param {Record<string, unknown>} user  Row from public."wp-users" (incl. meta:* keys)
 * @param {string} authUuid  auth.users id (profiles.id)
 */
function mapWpUserToProfile(user, authUuid) {
  const sub = extractSubmittedMeta(user);

  const firstName = String(
    user.first_name || (g(user, "full_name") && String(g(user, "full_name")).split(" ")[0]) || user.display_name || ""
  ).trim();
  const lastName = String(user.last_name || "").trim();
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    user.display_name ||
    user.user_nicename ||
    (user.user_login && String(user.user_login).split("@")[0]) ||
    "User";

  const lookingForArr = resolveLookingFor(user, sub);
  const attractedTo = normalizeAttractedTo(
    resolveStringField(user, sub, ["attracted", "attracted_to"])
  );
  const gender = normalizeGender(
    readWpFirstScalar(g(user, "gender")) ||
      (sub?.gender != null ? readWpFirstScalar(String(sub.gender)) : null)
  );
  const dob = normalizeDob(g(user, "birth_date") || g(user, "dob"));
  const countryHint =
    resolveStringField(user, sub, ["country"]) ||
    (sub?.country != null ? readWpStringField(String(sub.country)) || String(sub.country).trim() : null);
  const city = mapCity(countryHint, user.billing_city);
  const status = mapStatus(g(user, "account_status"));
  const role = mapRole(user.roles);
  const phone = (user.billing_phone || g(user, "phone") || "").replace(/\s+/g, "").trim() || null;
  const instagram = (g(user, "instagram") || "").trim().replace(/^@/, "") || null;
  const reasonRaw = resolveStringField(user, sub, ["Why", "reason"]);
  const reason = reasonRaw ? String(reasonRaw).trim() || null : null;
  const profilePhoto = g(user, "profile_photo") || g(user, "Photo") || g(user, "register_profile_photo") || null;
  const emailRaw = String(user.user_email || user.email || "")
    .trim()
    .toLowerCase();
  const wpId = user.ID != null ? user.ID : user.id;

  return {
    id: authUuid,
    name: fullName.slice(0, 100),
    display_name: fullName.slice(0, 100),
    full_name: fullName.slice(0, 100),
    email: emailRaw,
    city,
    status,
    role,
    gender,
    attracted_to: attractedTo,
    orientation: lookingForArr.length > 0 ? { lookingFor: lookingForArr } : null,
    dob: dob || null,
    instagram,
    reason,
    phone_e164: phone,
    profile_photo_url: profilePhoto,
    wp_user_id: wpId != null ? Number(wpId) : null,
    wp_user_login: user.user_login,
    wp_registered_at: user.user_registered || null,
    wp_source: {
      roles: user.roles,
      display_name: user.display_name,
      account_status: g(user, "account_status"),
    },
    email_verified: true,
    created_at: user.user_registered || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Fields to PATCH on profiles when re-syncing from a stored `wp-users` row (no live WP / ACP). */
function extractBackfillFromWpUserRow(user) {
  const m = mapWpUserToProfile(user, "00000000-0000-0000-0000-000000000000");
  return {
    gender: m.gender,
    attracted_to: m.attracted_to,
    orientation: m.orientation,
    dob: m.dob,
    city: m.city,
    instagram: m.instagram,
    reason: m.reason,
    profile_photo_url: m.profile_photo_url,
    phone_e164: m.phone_e164,
  };
}

module.exports = {
  mapWpUserToProfile,
  extractBackfillFromWpUserRow,
};
