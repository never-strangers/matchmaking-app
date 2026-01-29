// Generate QR code for invite URL. Usage: node scripts/generate-qr.cjs [url]
// Default URL: https://app.thisisneverstrangers.com/invite/public

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const defaultUrl = "https://app.thisisneverstrangers.com/invite/public";
const url = process.argv[2] || defaultUrl;

const outDir = path.join(__dirname, "..", "public");
const outFile = path.join(outDir, "qr-invite-public.png");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

QRCode.toFile(outFile, url, { width: 400, margin: 2 }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("QR code saved to:", outFile);
  console.log("URL:", url);
});
