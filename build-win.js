// build-win.js — Genera dist/teleprompter-pro-vX.Y.Z.exe con metadatos de empresa
// El icono personalizado se incluye como teleprompter.ico para crear accesos directos;
// incrustarlo en el PE de pkg corrompe el bootstrap — limitación conocida de pkg.
const { execSync }  = require("child_process");
const { version }   = require("./package.json");
const path = require("path"), fs = require("fs");
const { PNG }  = require("pngjs");
const toIco    = require("to-ico");
const {
  NtExecutable, NtExecutableResource,
  Resource: { VersionInfo },
} = require("resedit");

const outName  = `teleprompter-pro-v${version}.exe`;
const outPath  = path.join(__dirname, "dist", outName);
const iconPath = path.join(__dirname, "dist", "teleprompter.ico");
const pkgBin   = path.join(__dirname, "node_modules", "pkg", "lib-es5", "bin.js");
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

async function main() {
  // 1. Compilar con pkg
  console.log(`\n📦  Compilando ${outName}...`);
  execSync(`node "${pkgBin}" . --compress GZip --output "${outPath}"`,
    { stdio: "inherit", cwd: __dirname });

  // 2. Aplicar metadatos de versión (reemplaza VS_VERSION_INFO existente — no mueve secciones)
  console.log("\n🏷️   Añadiendo metadatos de empresa y versión...");
  try {
    const exeBuf = fs.readFileSync(outPath).buffer;
    const exe    = NtExecutable.from(exeBuf);
    const res    = NtExecutableResource.from(exe);
    const [vi]   = VersionInfo.fromEntries(res.entries);
    if (vi) {
      const vp = version.split(".").map(Number); while (vp.length < 4) vp.push(0);
      vi.setFileVersion(...vp);
      vi.setProductVersion(...vp);
      vi.setStringValues({ lang: 1033, codepage: 1200 }, {
        CompanyName:     "meettheexpert.tech",
        ProductName:     "Teleprónter PRO",
        FileDescription: "Teleprónter PRO — Sistema profesional de teleprónter",
        OriginalFilename: outName,
        InternalName:    "teleprompter-pro",
        LegalCopyright:  "Copyright 2025 Sergio Marlop — meettheexpert.tech",
        Comments:        "https://github.com/marlop-sergio/teleprompter",
      });
      vi.outputToResourceEntries(res.entries);
      res.outputResource(exe);
      fs.writeFileSync(outPath, Buffer.from(exe.generate({ autoAddRelocationTable: true })));
      console.log("   ↳ Metadatos aplicados ✓");
    }
  } catch (e) {
    console.warn("   ⚠ Metadatos omitidos:", e.message);
  }

  // 3. Generar teleprompter.ico para accesos directos
  console.log("\n🎨  Generando teleprompter.ico...");
  const pngs = await Promise.all([16, 32, 48, 64, 128, 256].map(makeIconPNG));
  fs.writeFileSync(iconPath, await toIco(pngs));
  console.log("   ↳ Usa el .ico para el acceso directo en el escritorio");

  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  Listo: dist/${outName}  (${mb} MB)`);
  console.log(`   📄 dist/teleprompter.ico — asignar al acceso directo del escritorio\n`);
}

// ── Generador de icono ────────────────────────────────────────────────────────
function makeIconPNG(size) {
  return new Promise(resolve => {
    const png = new PNG({ width: size, height: size, filterType: -1 });
    const cx=size/2, cy=size/2, r=Math.floor(size*0.44), cr=Math.floor(size*0.20);
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      const i=(size*y+x)*4, adx=Math.abs(x-cx), ady=Math.abs(y-cy);
      const inside=adx<=r&&ady<=r&&(adx<=r-cr||ady<=r-cr||Math.hypot(adx-(r-cr),ady-(r-cr))<=cr);
      if(!inside){png.data[i+3]=0;continue;}
      const gy=y/size;
      png.data[i]=Math.round(11+14*gy); png.data[i+1]=Math.round(12+14*gy);
      png.data[i+2]=Math.round(15+20*gy); png.data[i+3]=255;
      const ry=y/size, lp=Math.round(size*0.18), lh=size<48?0.10:0.062;
      for(const b of [{y:0.265,w:0.64},{y:0.355,w:0.49}])
        if(Math.abs(ry-b.y)<lh/2&&x>=lp&&x<lp+Math.round(b.w*size))
          {png.data[i]=240;png.data[i+1]=237;png.data[i+2]=232;png.data[i+3]=210;}
      const fl=size<48?0.055:0.023;
      if(Math.abs(ry-0.475)<fl&&x>=Math.round(lp*0.4)&&x<size-Math.round(lp*0.4))
        {png.data[i]=184;png.data[i+1]=169;png.data[i+2]=138;png.data[i+3]=255;}
      for(const b of [{y:0.595,w:0.58},{y:0.685,w:0.42}])
        if(Math.abs(ry-b.y)<lh/2&&x>=lp&&x<lp+Math.round(b.w*size))
          {png.data[i]=240;png.data[i+1]=237;png.data[i+2]=232;png.data[i+3]=110;}
    }
    resolve(PNG.sync.write(png));
  });
}

main().catch(e => { console.error(e); process.exit(1); });
