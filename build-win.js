// build-win.js — Genera dist/teleprompter-pro-vX.Y.Z.exe con icono y metadatos
// Uso: pnpm build:win
const { execSync } = require("child_process");
const { version }  = require("./package.json");
const path = require("path"), fs = require("fs");
const { PNG }  = require("pngjs");
const toIco    = require("to-ico");
const rcedit   = require("rcedit");

const outName  = `teleprompter-pro-v${version}.exe`;
const outPath  = path.join(__dirname, "dist", outName);
const iconPath = path.join(__dirname, "dist", "teleprompter.ico");
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

async function main() {
  // 1. Compilar con pkg
  console.log(`\n📦  Compilando ${outName}...`);
  const pkgBin = path.join(__dirname, "node_modules", "pkg", "lib-es5", "bin.js");
  execSync(`node "${pkgBin}" . --compress GZip --output "${outPath}"`,
    { stdio: "inherit", cwd: __dirname });

  // 2. Generar icono .ico con múltiples tamaños
  console.log("\n🎨  Generando icono...");
  const pngs = await Promise.all([16, 32, 48, 64, 128, 256].map(makeIconPNG));
  fs.writeFileSync(iconPath, await toIco(pngs));

  // 3. Añadir metadatos e icono con rcedit
  console.log("\n🏷️   Añadiendo metadatos...");
  await rcedit(outPath, {
    icon: iconPath,
    "file-version":    `${version}.0`,
    "product-version": `${version}.0`,
    "version-string": {
      CompanyName:      "meettheexpert.tech",
      ProductName:      "Teleprónter PRO",
      FileDescription:  "Teleprónter PRO — Sistema profesional de teleprónter",
      OriginalFilename: outName,
      InternalName:     "teleprompter-pro",
      LegalCopyright:   `Copyright 2025 Sergio Marlop — meettheexpert.tech`,
      Comments:         "https://github.com/marlop-sergio/teleprompter",
    },
  });

  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  Listo: dist/${outName}  (${mb} MB)\n`);
}

// ── Generador de icono ────────────────────────────────────────────────────────
// Diseño: fondo oscuro redondeado + barras de texto blancas + línea foco dorada
function makeIconPNG(size) {
  return new Promise(resolve => {
    const png = new PNG({ width: size, height: size, filterType: -1 });
    const cx = size / 2, cy = size / 2;
    const r  = Math.floor(size * 0.44);
    const cr = Math.floor(size * 0.20);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (size * y + x) * 4;
        const adx = Math.abs(x - cx), ady = Math.abs(y - cy);
        const inside = adx <= r && ady <= r &&
          (adx <= r - cr || ady <= r - cr ||
           Math.hypot(adx - (r - cr), ady - (r - cr)) <= cr);

        if (!inside) { png.data[i + 3] = 0; continue; }

        // Fondo oscuro con degradado sutil
        const gy = y / size;
        png.data[i]   = Math.round(11 + 14 * gy);
        png.data[i+1] = Math.round(12 + 14 * gy);
        png.data[i+2] = Math.round(15 + 20 * gy);
        png.data[i+3] = 255;

        const ry  = y / size;
        const lp  = Math.round(size * 0.18);   // left padding
        const lh  = size < 48 ? 0.10 : 0.062;  // bar height

        // Barras de texto (blanco #f0ede8) sobre la línea de foco
        const barsTop = [{y:0.265,w:0.64},{y:0.355,w:0.49}];
        for (const b of barsTop) {
          if (Math.abs(ry - b.y) < lh / 2 && x >= lp && x < lp + Math.round(b.w * size)) {
            png.data[i] = 240; png.data[i+1] = 237; png.data[i+2] = 232; png.data[i+3] = 210;
          }
        }

        // Línea de foco (ámbar #b8a98a)
        const fl = size < 48 ? 0.055 : 0.023;
        if (Math.abs(ry - 0.475) < fl &&
            x >= Math.round(lp * 0.4) && x < size - Math.round(lp * 0.4)) {
          png.data[i] = 184; png.data[i+1] = 169; png.data[i+2] = 138; png.data[i+3] = 255;
        }

        // Barras de texto bajo la línea de foco (más tenues)
        const barsBot = [{y:0.595,w:0.58},{y:0.685,w:0.42}];
        for (const b of barsBot) {
          if (Math.abs(ry - b.y) < lh / 2 && x >= lp && x < lp + Math.round(b.w * size)) {
            png.data[i] = 240; png.data[i+1] = 237; png.data[i+2] = 232; png.data[i+3] = 110;
          }
        }
      }
    }
    resolve(PNG.sync.write(png));
  });
}

main().catch(e => { console.error(e); process.exit(1); });
