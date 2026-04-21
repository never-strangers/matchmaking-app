#!/usr/bin/env node
/**
 * Sync WP user data → Supabase profiles via ACP inline-values API.
 * Populates: gender, attracted_to, orientation (lookingFor), dob, city,
 *            instagram, reason, wp_user_id.
 * Only fills missing fields — never overwrites existing data (unless --overwrite).
 *
 * Usage:
 *   node scripts/update-profiles-from-wp.cjs \
 *     --cookies "wordpress_logged_in_xxx=VALUE; ..." \
 *     --nonce  "55dc7f4c03" \
 *     --emails-file /tmp/emails.txt \
 *     [--dry-run] [--overwrite]
 *
 *   # Or pass emails directly:
 *   node scripts/update-profiles-from-wp.cjs \
 *     --cookies "..." --nonce "..." foo@bar.com baz@qux.com
 *
 * Get cookies: WP admin → DevTools → any XHR request → Copy as cURL → grab -b "..." value
 * Get nonce:   from any working ACP AJAX request in DevTools → FormData → _ajax_nonce
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  for (const fname of ['.env.local', '.env']) {
    try {
      const lines = fs.readFileSync(path.join(__dirname, '..', fname), 'utf8').split('\n');
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq < 0) continue;
        env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return env;
}

const ENV         = loadEnv();
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = ENV.SUPABASE_SERVICE_ROLE_KEY;
const WP_AJAX_URL  = 'https://www.thisisneverstrangers.com/wp-admin/admin-ajax.php';
const ACP_LAYOUT   = '67610f8391ada';

// ACP column_name → Supabase field
const COL_MAP = {
  'a293b379eb8520': 'gender',
  '4e137a46ae147c': 'attracted_to',
  '3dfd2aefced916': 'looking_for',
  '21860f28bf7cee': 'dob',
  '2c5b35f4395810': 'country',
  '18454a9352b021': 'instagram',
  '3b52e4f9dced92': 'reason',
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const u    = new URL(urlStr);
    const data = body ? Buffer.from(body) : null;
    const req  = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { ...(data ? { 'Content-Length': data.length } : {}), ...headers },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Supabase helpers ──────────────────────────────────────────────────────────
const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function sbGet(path) {
  const r = await request('GET', `${SUPABASE_URL}/rest/v1/${path}`, SB_HEADERS);
  return JSON.parse(r.body);
}

async function sbPatch(path, body) {
  return request('PATCH', `${SUPABASE_URL}/rest/v1/${path}`,
    { ...SB_HEADERS, Prefer: 'return=minimal' }, JSON.stringify(body));
}

// ── ACP fetch (one user at a time to avoid 406) ───────────────────────────────
async function acpFetch(wpId, cookies, nonce) {
  const boundary = '----WebKitFormBoundaryBT48PyUmPm7nJuAy';
  const parts = [
    ['action',       'acp_editing_request'],
    ['method',       'inline-values'],
    ['ids[0]',       String(wpId)],
    ['list_screen',  'wp-users'],
    ['layout',       ACP_LAYOUT],
    ['_ajax_nonce',  nonce],
  ];
  const body = parts.map(([n, v]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`
  ).join('') + `--${boundary}--\r\n`;

  const r = await request('POST', WP_AJAX_URL, {
    Cookie:          cookies,
    'Content-Type':  `multipart/form-data; boundary=${boundary}`,
    'User-Agent':    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    Accept:          'application/json, text/plain, */*',
    Origin:          'https://thisisneverstrangers.com',
    Referer:         'https://thisisneverstrangers.com/wp-admin/users.php',
  }, body);

  const parsed = JSON.parse(r.body);
  if (!parsed.success) throw new Error(`ACP error: ${r.body.slice(0, 200)}`);

  // Convert editable_values array → { column_name: value }
  const row = {};
  for (const item of parsed.data?.editable_values || []) {
    row[item.column_name] = item.value;
  }
  return row;
}

// ── Value normalizers ─────────────────────────────────────────────────────────
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v) return [String(v)];
  return [];
}

function normalizeGender(v) {
  for (const x of toArr(v)) {
    const l = x.toLowerCase();
    if (l.includes('female')) return 'female';
    if (l.includes('male'))   return 'male';
  }
  return null;
}

function normalizeAttracted(v) {
  const out = [];
  for (const x of toArr(v)) {
    const l = x.toLowerCase();
    if (l.includes('women')) out.push('women');
    else if (l.includes('men')) out.push('men');
  }
  return out.length ? out.join(', ') : null;
}

function normalizeLooking(v) {
  const out = [];
  for (const x of toArr(v)) {
    const l = x.toLowerCase();
    if (l.includes('friend'))              out.push('Friends');
    else if (l.includes('date') || l.includes('dating')) out.push('Dating');
  }
  return out.length ? out : null;
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return null;
}

function normalizeCity(country) {
  if (!country) return null;
  const v = String(country).toLowerCase();
  if (v.includes('singapore') || v === 'sg') return 'sg';
  if (v.includes('hong kong') || v === 'hk') return 'hk';
  if (v.includes('kuala') || v.includes('malaysia')) return 'kl';
  if (v.includes('jakarta') || v.includes('indonesia')) return 'jakarta';
  if (v.includes('bangkok') || v.includes('thailand')) return 'bangkok';
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args      = process.argv.slice(2);
  const DRY_RUN   = args.includes('--dry-run');
  const OVERWRITE = args.includes('--overwrite');

  const cookieIdx = args.indexOf('--cookies');
  const nonceIdx  = args.indexOf('--nonce');
  const fileIdx   = args.indexOf('--emails-file');

  if (cookieIdx < 0) { console.error('Missing --cookies'); process.exit(1); }
  if (nonceIdx  < 0) { console.error('Missing --nonce');   process.exit(1); }

  const cookies = args[cookieIdx + 1];
  const nonce   = args[nonceIdx  + 1];

  let emails = [];
  if (fileIdx >= 0) {
    emails = fs.readFileSync(args[fileIdx + 1], 'utf8')
      .split('\n').map(l => l.trim()).filter(Boolean);
  }
  for (const a of args) {
    if (a.includes('@') && !a.startsWith('-')) emails.push(a.trim());
  }
  emails = [...new Set(emails.map(e => e.toLowerCase()))];

  if (!emails.length) { console.error('No emails provided'); process.exit(1); }

  console.log(`\n🔄  WP → Supabase profile sync`);
  console.log(`    emails:    ${emails.length}`);
  console.log(`    dry-run:   ${DRY_RUN}`);
  console.log(`    overwrite: ${OVERWRITE}\n`);

  // Fetch profiles from Supabase
  const filter   = '(' + emails.map(e => `"${e}"`).join(',') + ')';
  const profiles = await sbGet(
    `profiles?email=in.${filter}&select=id,email,wp_user_id,gender,attracted_to,orientation,dob,city,instagram,reason&limit=200`
  );
  const byEmail  = Object.fromEntries(profiles.map(p => [p.email.toLowerCase(), p]));

  const noWpId = profiles.filter(p => !p.wp_user_id);
  if (noWpId.length) {
    console.warn(`⚠️  No wp_user_id for ${noWpId.length} profile(s) — skipping:`);
    noWpId.forEach(p => console.warn(`   ${p.email}`));
    console.log();
  }

  const toFetch = profiles.filter(p => p.wp_user_id);
  if (!toFetch.length) { console.log('Nothing to fetch.'); return; }

  let updated = 0, skipped = 0;

  for (const profile of toFetch) {
    let row;
    try {
      row = await acpFetch(profile.wp_user_id, cookies, nonce);
    } catch (e) {
      console.log(`  ❌ ${profile.email}: ${e.message}`);
      skipped++;
      await sleep(500);
      continue;
    }

    const patch = {};

    // gender
    const gender = normalizeGender(row['a293b379eb8520']);
    if (gender && (OVERWRITE || !profile.gender)) patch.gender = gender;

    // attracted_to
    const attracted = normalizeAttracted(row['4e137a46ae147c']);
    if (attracted && (OVERWRITE || !profile.attracted_to)) patch.attracted_to = attracted;

    // orientation / looking_for
    const looking = normalizeLooking(row['3dfd2aefced916']);
    if (looking && (OVERWRITE || !profile.orientation)) patch.orientation = { lookingFor: looking };

    // dob
    const dob = normalizeDob(row['21860f28bf7cee']);
    if (dob && (OVERWRITE || !profile.dob)) patch.dob = dob;

    // city (from country)
    const city = normalizeCity(row['2c5b35f4395810']);
    if (city && (OVERWRITE || !profile.city)) patch.city = city;

    // instagram
    const instagram = row['18454a9352b021'] ? String(row['18454a9352b021']).trim() : null;
    if (instagram && (OVERWRITE || !profile.instagram)) patch.instagram = instagram;

    // reason
    const reason = row['3b52e4f9dced92'] ? String(row['3b52e4f9dced92']).trim() : null;
    if (reason && (OVERWRITE || !profile.reason)) patch.reason = reason;

    if (!Object.keys(patch).length) {
      console.log(`  ✓  ${profile.email} — nothing new`);
      skipped++;
      await sleep(300);
      continue;
    }

    const summary = Object.entries(patch).map(([k, v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${k}=${val.slice(0, 40)}`;
    }).join(' | ');

    if (DRY_RUN) {
      console.log(`  [dry] ${profile.email}`);
      console.log(`        ${summary}`);
      updated++;
    } else {
      const r = await sbPatch(`profiles?id=eq.${profile.id}`, patch);
      if (r.status === 204) {
        console.log(`  ✅ ${profile.email}`);
        console.log(`     ${summary}`);
        updated++;
      } else {
        console.log(`  ❌ ${profile.email}: HTTP ${r.status} ${r.body.slice(0, 100)}`);
        skipped++;
      }
    }

    await sleep(300);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅ ${DRY_RUN ? 'would update' : 'updated'}: ${updated}`);
  console.log(`⏭  skipped:  ${skipped}`);
  if (DRY_RUN) console.log('\nRemove --dry-run to apply.');
  console.log();
}

main().catch(e => { console.error(e.message); process.exit(1); });
