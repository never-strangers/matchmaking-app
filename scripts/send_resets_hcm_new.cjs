
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.thisisneverstrangers.com";
const { resetPasswordHtml } = require("../lib/email/resetPasswordHtml.js");

const EMAILS = [
  ["tynnguyen1905@gmail.com",   "ĐA LÊ NHƯ"],
  ["Thao110401@gmail.com",       "Thao"],
  ["Le.hien3108@gmail.com",      "Hiền"],
  ["linh@newcampus.com",         "Linh"],
  ["dadahomemadefood@gmail.com", "Ngoc"],
  ["itsbiuliee@gmail.com",       "biu"],
  ["nghuyentrang0201@gmail.com", "Trang"],
  ["wannawannasoe634@gmail.com", "Thiha"],
];


async function main() {
  let sent = 0;
  for (const [email, name] of EMAILS) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: email.toLowerCase(),
        options: { redirectTo: `${APP_URL}/login` }
      });
      if (error) throw new Error(error.message);
      const resetUrl = data?.properties?.action_link;
      if (!resetUrl) throw new Error("no action_link");
      await resend.emails.send({
        from: "Never Strangers <hello@thisisneverstrangers.com>",
        to: email,
        subject: "Reset your Never Strangers password",
        html: resetPasswordHtml(resetUrl, { appUrl: APP_URL }),
      });
      console.log(`  OK ${email} (${name})`);
      sent++;
    } catch(e) {
      console.log(`  FAIL ${email}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log(`\nSent: ${sent}/8`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
