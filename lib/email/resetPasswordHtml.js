/**
 * Single source of truth for the password-reset email HTML.
 * Plain JS so it can be require()'d from CJS scripts and imported from TS.
 *
 * @param {string} resetUrl – the password-reset link (or Go template placeholder)
 * @param {object} [opts]
 * @param {string} [opts.appName]
 * @param {string} [opts.appUrl]
 * @param {string} [opts.logoUrl]
 * @returns {string} full HTML document
 */
function resetPasswordHtml(resetUrl, opts) {
  var appName = (opts && opts.appName) || "Never Strangers";
  var appUrl  = (opts && opts.appUrl)  || "https://app.thisisneverstrangers.com";
  var logoUrl = (opts && opts.logoUrl) || "https://thisisneverstrangers.com/wp-content/uploads/2026/02/Never-Stranger-Logo-Trans-copy.png";
  var appUrlDisplay = appUrl.replace(/^https?:\/\//, "");

  return '<!DOCTYPE html>\n\
<html lang="en">\n\
<head>\n\
<meta charset="UTF-8">\n\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
<title>Something new - ' + appName + '</title>\n\
</head>\n\
<body style="margin:0;padding:0;background-color:#F3F1E8;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;">\n\
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F1E8;padding:32px 16px 48px;">\n\
<tr><td align="center">\n\
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">\n\
\n\
  <!-- HERO -->\n\
  <tr><td style="background-color:#080808;border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;">\n\
    <img src="' + logoUrl + '" alt="' + appName + '" width="100" style="display:block;margin:0 auto 28px;">\n\
    <div style="display:inline-block;background-color:#B90F14;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 16px;border-radius:100px;margin-bottom:20px;">' + appName + ' 2.0 is here</div>\n\
    <h1 style="margin:0 0 8px;font-size:38px;font-weight:400;line-height:1.05;color:#ffffff;letter-spacing:-1px;font-family:Georgia,serif;">You just got</h1>\n\
    <h1 style="margin:0 0 24px;font-size:48px;font-weight:400;line-height:1.0;color:#f5c842;letter-spacing:-1px;font-style:italic;font-family:Georgia,serif;">an upgrade.</h1>\n\
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.6;">We&#39;ve been building something big and it&#39;s finally here. All we need is one small thing from you to get you in.</p>\n\
  </td></tr>\n\
\n\
  <!-- URGENCY BAR -->\n\
  <tr><td style="background-color:#B90F14;padding:14px 24px;text-align:center;">\n\
    <p style="margin:0;font-size:13px;color:#ffffff;font-weight:700;letter-spacing:.3px;">&#9888;&#65039; Your reset link expires in 24 hours and can only be used once.</p>\n\
  </td></tr>\n\
\n\
  <!-- BODY -->\n\
  <tr><td style="background-color:#ffffff;padding:40px 40px 32px;">\n\
\n\
    <p style="margin:0 0 24px;font-size:16px;color:#080808;line-height:1.75;">We&#39;re migrating to our own platform and we need you to reset your password to activate your account. This is a one-time thing, we promise.</p>\n\
\n\
    <!-- WHAT\'S NEW BLOCK -->\n\
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">\n\
      <tr><td style="background-color:#080808;border-radius:12px;padding:24px 26px;">\n\
        <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#B90F14;margin-bottom:14px;">What&#39;s new</div>\n\
        <table width="100%" cellpadding="0" cellspacing="0" border="0">\n\
          <tr>\n\
            <td valign="top" width="20" style="padding-top:2px;">\n\
              <div style="width:6px;height:6px;border-radius:50%;background-color:#f5c842;margin-top:6px;"></div>\n\
            </td>\n\
            <td style="padding-left:12px;padding-bottom:12px;">\n\
              <div style="font-size:14px;color:#ffffff;line-height:1.65;"><strong style="color:#f5c842;">Our own algorithm.</strong> Built from scratch by us, not a third-party tool. It&#39;s smarter, more personal, and gets better every event.</div>\n\
            </td>\n\
          </tr>\n\
          <tr>\n\
            <td valign="top" width="20" style="padding-top:2px;">\n\
              <div style="width:6px;height:6px;border-radius:50%;background-color:#f5c842;margin-top:6px;"></div>\n\
            </td>\n\
            <td style="padding-left:12px;padding-bottom:12px;">\n\
              <div style="font-size:14px;color:#ffffff;line-height:1.65;"><strong style="color:#f5c842;">Goodbye WhatsApp groups and OTPs.</strong> No more group chaos &mdash; built-in chat means you connect directly with the people you meet.</div>\n\
            </td>\n\
          </tr>\n\
          <tr>\n\
            <td valign="top" width="20" style="padding-top:2px;">\n\
              <div style="width:6px;height:6px;border-radius:50%;background-color:#f5c842;margin-top:6px;"></div>\n\
            </td>\n\
            <td style="padding-left:12px;padding-bottom:0;">\n\
              <div style="font-size:14px;color:#ffffff;line-height:1.65;"><strong style="color:#f5c842;">Book directly on the app.</strong> Events, spots, everything in one place.</div>\n\
            </td>\n\
          </tr>\n\
          <tr><td colspan="2" style="height:12px;"></td></tr>\n\
          <tr>\n\
            <td valign="top" width="20" style="padding-top:2px;">\n\
              <div style="width:6px;height:6px;border-radius:50%;background-color:#f5c842;margin-top:6px;"></div>\n\
            </td>\n\
            <td style="padding-left:12px;padding-bottom:0;">\n\
              <div style="font-size:14px;color:#ffffff;line-height:1.65;"><strong style="color:#f5c842;">More than just mixers.</strong> We&#39;re expanding into sports, lifestyle, experiences, and travel. There&#39;s a lot more coming your way.</div>\n\
            </td>\n\
          </tr>\n\
        </table>\n\
      </td></tr>\n\
    </table>\n\
\n\
    <!-- STEPS -->\n\
    <h2 style="margin:0 0 16px;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#B90F14;">Here&#39;s what to do</h2>\n\
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">\n\
      <tr>\n\
        <td width="32" valign="top" style="padding-top:2px;">\n\
          <div style="width:24px;height:24px;background-color:#080808;border-radius:50%;text-align:center;line-height:24px;font-size:11px;color:#ffffff;font-weight:800;">1</div>\n\
        </td>\n\
        <td style="padding-left:14px;padding-bottom:20px;border-bottom:1px solid #F3F1E8;">\n\
          <div style="font-size:15px;font-weight:700;color:#080808;margin-bottom:4px;">Click the button below to reset your password</div>\n\
          <div style="font-size:14px;color:#6b6b60;line-height:1.7;">This link is unique to you. Click it, set a new password, and your account is ready. Your old password cannot be transferred for security reasons &mdash; this is the only way in.</div>\n\
        </td>\n\
      </tr>\n\
      <tr><td colspan="2" style="height:16px;"></td></tr>\n\
      <tr>\n\
        <td width="32" valign="top" style="padding-top:2px;">\n\
          <div style="width:24px;height:24px;background-color:#080808;border-radius:50%;text-align:center;line-height:24px;font-size:11px;color:#ffffff;font-weight:800;">2</div>\n\
        </td>\n\
        <td style="padding-left:14px;padding-bottom:20px;border-bottom:1px solid #F3F1E8;">\n\
          <div style="font-size:15px;font-weight:700;color:#080808;margin-bottom:4px;">Log in and explore</div>\n\
          <div style="font-size:14px;color:#6b6b60;line-height:1.7;">Head to <a href="' + appUrl + '" style="color:#B90F14;font-weight:700;text-decoration:none;">' + appUrlDisplay + '</a>, sign in with your email and new password, and you&#39;re in.</div>\n\
        </td>\n\
      </tr>\n\
      <tr><td colspan="2" style="height:16px;"></td></tr>\n\
      <tr>\n\
        <td width="32" valign="top" style="padding-top:2px;">\n\
          <div style="width:24px;height:24px;background-color:#B90F14;border-radius:50%;text-align:center;line-height:24px;font-size:11px;color:#ffffff;font-weight:800;">3</div>\n\
        </td>\n\
        <td style="padding-left:14px;padding-bottom:0;">\n\
          <div style="font-size:15px;font-weight:700;color:#080808;margin-bottom:4px;">Find your city and book your next event</div>\n\
          <div style="font-size:14px;color:#6b6b60;line-height:1.7;">Everything is now on the app. Browse events in your city and book your spot directly.</div>\n\
        </td>\n\
      </tr>\n\
    </table>\n\
\n\
    <!-- CTA -->\n\
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">\n\
      <tr><td style="background-color:#080808;border-radius:12px;padding:24px;text-align:center;">\n\
        <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.6;">Tap below to reset your password and activate your account</p>\n\
        <a href="' + resetUrl + '" style="display:inline-block;background-color:#B90F14;color:#ffffff;font-size:15px;font-weight:800;padding:14px 36px;border-radius:100px;text-decoration:none;letter-spacing:0.3px;">Reset my password &nbsp;&#8594;</a>\n\
      </td></tr>\n\
    </table>\n\
\n\
    <!-- ONE TIME LINK WARNING -->\n\
    <table width="100%" cellpadding="0" cellspacing="0" border="0">\n\
      <tr><td style="background-color:#fff8e6;border-radius:10px;padding:16px 18px;border-left:3px solid #f5a623;">\n\
        <div style="font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#d97706;margin-bottom:6px;">&#9888; Important &mdash; one-time link</div>\n\
        <div style="font-size:13px;color:#6b6b60;line-height:1.7;">This link can only be clicked <strong style="color:#080808;">once</strong> and expires in <strong style="color:#080808;">24 hours</strong>. If it has already expired, you can request a new one yourself at any time by clicking <strong style="color:#080808;">Forgot Password</strong> at <a href="' + appUrl + '" style="color:#B90F14;font-weight:700;text-decoration:none;">' + appUrlDisplay + '</a>.</div>\n\
      </td></tr>\n\
    </table>\n\
\n\
  </td></tr>\n\
\n\
  <!-- SIGN OFF -->\n\
  <tr><td style="background-color:#080808;padding:36px 40px;text-align:center;border-radius:0 0 20px 20px;">\n\
    <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#ffffff;">This is just the beginning.</p>\n\
    <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.45);">Questions? DM us on Instagram <a href="https://instagram.com/thisisneverstrangers" style="color:#f5c842;text-decoration:none;font-weight:600;">@thisisneverstrangers</a></p>\n\
    <img src="' + logoUrl + '" alt="' + appName + '" width="80" style="display:block;margin:0 auto;opacity:0.7;">\n\
  </td></tr>\n\
\n\
</table>\n\
</td></tr>\n\
</table>\n\
</body>\n\
</html>';
}

module.exports = { resetPasswordHtml };
