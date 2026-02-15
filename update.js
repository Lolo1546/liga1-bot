const fs = require("fs");
const puppeteer = require("puppeteer");

const URL = "https://pelotalibres.pe/en-vivo/liga-1-max";
const PATRON = "fubohd.com/liga1max/";
const ARCHIVO = "liga1.m3u";

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  let encontrado = null;

  page.on("request", req => {
    const url = req.url();
    if (url.includes(PATRON)) {
      encontrado = url;
      console.log("Detectado:", url);
    }
  });

  await page.goto(URL, { waitUntil: "networkidle2" });

  await new Promise(r => setTimeout(r, 15000));

  await browser.close();

  if (!encontrado) {
    console.log("No se encontró link.");
    process.exit(0);
  }

  let contenido = fs.readFileSync(ARCHIVO, "utf8").split("\n");

  let anterior = contenido.find(l => l.startsWith("http"));

  if (anterior === encontrado) {
    console.log("Sin cambios.");
    process.exit(0);
  }

  for (let i = contenido.length - 1; i >= 0; i--) {
    if (contenido[i].startsWith("http")) {
      contenido[i] = encontrado;
      break;
    }
  }

  fs.writeFileSync(ARCHIVO, contenido.join("\n"));
  console.log("Actualizado!");
}

run();
