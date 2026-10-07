// Gera os WebP do case (Arquivos/*.png) e captura os sites dos outros projetos.
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const img = `${raiz}assets/img/`;
await mkdir(img, { recursive: true });

// Antes e depois da Hanaoka
for (const nome of ['antigo-desktop-topo', 'novo-desktop-topo']) {
  for (const w of [720, 1200]) await sharp(`${raiz}Arquivos/${nome}.png`).resize(w).webp({ quality: 74 }).toFile(`${img}hanaoka-${nome}-${w}.webp`);
}
for (const nome of ['antigo-celular-topo', 'novo-celular-topo']) {
  await sharp(`${raiz}Arquivos/${nome}.png`).resize(390).webp({ quality: 74 }).toFile(`${img}hanaoka-${nome}.webp`);
}

// Capturas longas dos sites (a imagem rola dentro do cartão ao passar o mouse)
const sites = {
  'veiculo-judicial': 'https://veiculojudicial.com.br/',
  'marcelo-lusardo': 'https://jgdini.github.io/nosofaraway/new/index.html',
  'marcelo-lusardo-landing': 'https://jgdini.github.io/nosofaraway/new/ecossistema-australia-blocks.html',
  drlsys: 'https://drlsys.com/'
};
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
for (const [nome, url] of Object.entries(sites)) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  // Fecha avisos de entrada (o Veículo Judicial abre um aviso antes de mostrar os anúncios).
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /li e entendi/i.test(b.textContent))?.click());
  // Rola até o fim e volta, para carregar imagens preguiçosas e disparar revelações.
  await p.evaluate(async () => { for (let y = 0; y < 3200; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 1500));
  const png = await p.screenshot({ fullPage: true, captureBeyondViewport: true });
  const meta = await sharp(png).metadata();
  await sharp(png).extract({ left: 0, top: 0, width: 1440, height: Math.min(meta.height, 3240) }).resize(720).webp({ quality: 70 }).toFile(`${img}projeto-${nome}.webp`);
  console.log(nome, meta.height);
  await p.close();
}
await b.close();
