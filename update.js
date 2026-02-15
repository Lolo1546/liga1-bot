const fs = require("fs");
const puppeteer = require("puppeteer");
const https = require("https");

const URL = "https://pelotalibres.pe/en-vivo/liga-1-max";
const PATRON = "mono.m3u8";
const ARCHIVO = "liga1.m3u8".replace(".m3u8",".m3u"); // por seguridad

function probarLink(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log("status:", res.statusCode);
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  let bueno = null;

  page.on("request", async (req) => {
    const url = req.url();

    if (bueno) return;

    if (url.includes(PATRON)) {
      console.log("Detectado:", url);
      console.log("Probando...");

      const ok = await probarLink(url);

      if (ok) {
        console.log("FUNCIONA!");
        bueno = url;
      } else {
        console.log("No sirve, esperando otro...");
      }
    }
  });

  await page.goto(URL, { waitUntil: "networkidle2" });

  // tiempo máximo de espera
  for (let i = 0; i < 20; i++) {
    if (bueno) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  if (!bueno) {
    console.log("No se encontró ninguno válido.");
    process.exit(0);
  }

  let contenido = fs.readFileSync("liga1.m3u", "utf8").split("\n");
  let anterior = contenido.find(l => l.startsWith("http"));

  if (anterior === bueno) {
    console.log("Sin cambios.");
    process.exit(0);
  }

  for (let i = contenido.length - 1; i >= 0; i--) {
    if (contenido[i].startsWith("http")) {
      contenido[i] = bueno;
      break;
    }
  }

  fs.writeFileSync("liga1.m3u", contenido.join("\n"));
  console.log("Actualizado!");
}

run();

