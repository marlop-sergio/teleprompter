// Downloads Google Fonts to /public/fonts/ at install time
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const FONTS_DIR = path.join(__dirname, "public", "fonts");
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

// Subset URLs for the two families we need
const FILES = [
  {
    url: "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOxE7fSWoO3xl7Q.woff2",
    file: "Lora-Regular.woff2",
    family: "Lora", style: "normal", weight: "400"
  },
  {
    url: "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOxE7fSWoO3wl_Q.woff2",
    file: "Lora-SemiBold.woff2",
    family: "Lora", style: "normal", weight: "600"
  },
  {
    url: "https://fonts.gstatic.com/s/lora/v35/0QI8MX1D_JOxE7fSWoO30l3Q.woff2",
    file: "Lora-Italic.woff2",
    family: "Lora", style: "italic", weight: "400"
  },
  {
    url: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2",
    file: "DMSans-Regular.woff2",
    family: "DM Sans", style: "normal", weight: "400"
  },
  {
    url: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6-K4.woff2",
    file: "DMSans-Light.woff2",
    family: "DM Sans", style: "normal", weight: "300"
  },
  {
    url: "https://fonts.gstatic.com/s/figtree/v5/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5ewkEU4HTy.woff2",
    file: "Figtree-Regular.woff2",
    family: "Figtree", style: "normal", weight: "400"
  },
  {
    url: "https://fonts.gstatic.com/s/figtree/v5/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5ewkEU6nTy.woff2",
    file: "Figtree-SemiBold.woff2",
    family: "Figtree", style: "normal", weight: "600"
  },
  {
    url: "https://fonts.gstatic.com/s/figtree/v5/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5ewkEU5HTy.woff2",
    file: "Figtree-Bold.woff2",
    family: "Figtree", style: "normal", weight: "700"
  },
  {
    url: "https://fonts.gstatic.com/s/figtree/v5/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5ewkEU4nTy.woff2",
    file: "Figtree-ExtraBold.woff2",
    family: "Figtree", style: "normal", weight: "800"
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(); return; }
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", err => { fs.unlinkSync(dest); reject(err); });
  });
}

async function main() {
  console.log("📥 Descargando fuentes locales…");
  for (const f of FILES) {
    const dest = path.join(FONTS_DIR, f.file);
    try {
      await download(f.url, dest);
      console.log(`   ✓ ${f.file}`);
    } catch (e) {
      console.warn(`   ⚠ ${f.file} – error: ${e.message} (se usará fallback)`);
    }
  }

  // Generate fonts.css
  const css = FILES.map(f =>
    `@font-face {\n  font-family: '${f.family}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url('/fonts/${f.file}') format('woff2');\n}`
  ).join("\n\n");

  fs.writeFileSync(path.join(FONTS_DIR, "fonts.css"), css);
  console.log("   ✓ fonts.css generado");
  console.log("✅ Fuentes listas\n");
}

main().catch(e => {
  console.warn("⚠ No se pudieron descargar las fuentes (se usarán fuentes del sistema):", e.message);
});
