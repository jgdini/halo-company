// Exporta os logos da Halo Company: PNG transparente, SVG do símbolo e avatar para o Instagram.
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pasta = raiz + 'identidade/logos/';
await mkdir(pasta, { recursive: true });

const BORDO = '#3A0D18', OFF = '#F5EFE6', CEREJA = '#E0506F', CHAMP = '#E7C493', PEROLA = '#F8F3EB', BEGE = '#B9825A';
const TRIO = [CEREJA, CHAMP, PEROLA];
// Sobre fundo claro, a pérola e o champanhe somem: usa-se bege no lugar.
const TRIO_CLARO = [CEREJA, BEGE, BORDO];

// Mesma geometria do site: três arcos no anel.
function anel(cx, cy, r, cores, lw) {
  const c = 2 * Math.PI * r, seg = c * 0.286, gap = c * 0.714;
  return cores.map((cor, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-dasharray="${seg} ${gap}" stroke-dashoffset="${-i * c / 3}" transform="rotate(-90 ${cx} ${cy})"/>`).join('');
}
const simbolo = (cores, tam) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${tam}" height="${tam}">${anel(16, 16, 11, cores, 3)}</svg>`;
const logo = (texto, cores, tam) => `<div class="logo" style="color:${texto}">${simbolo(cores, tam * 0.85)}<span>halo<small>company</small></span></div>`;

// SVG do símbolo (arquivos vetoriais, sem fonte)
await writeFile(pasta + 'simbolo-cores.svg', simbolo(TRIO, 512));
await writeFile(pasta + 'simbolo-monocromatico-bordo.svg', simbolo([BORDO, BORDO, BORDO], 512));
await writeFile(pasta + 'simbolo-monocromatico-off-white.svg', simbolo([OFF, OFF, OFF], 512));

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url("../../assets/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
body { margin: 0; background: transparent; }
.logo { display: inline-flex; align-items: center; gap: .25em; font-family: "Archivo", sans-serif; font-weight: 750; font-stretch: 118%; letter-spacing: -.03em; line-height: 1; font-size: 120px; padding: 40px; }
.logo small { margin-left: .4em; font-size: .46em; font-weight: 600; font-stretch: 82%; letter-spacing: .24em; text-transform: uppercase; opacity: .85; }
.bloco { display: inline-block; }
#avatar { width: 1080px; height: 1080px; background: ${BORDO}; display: grid; place-items: center; }
</style></head><body>
<div class="bloco" id="logo-claro">${logo(OFF, TRIO, 120)}</div>
<div class="bloco" id="logo-escuro">${logo(BORDO, TRIO_CLARO, 120)}</div>
<div class="bloco" id="simbolo-cores">${simbolo(TRIO, 800)}</div>
<div class="bloco" id="simbolo-bordo">${simbolo([BORDO, BORDO, BORDO], 800)}</div>
<div class="bloco" id="simbolo-claro">${simbolo([OFF, OFF, OFF], 800)}</div>
<div id="avatar">${simbolo(TRIO, 620)}</div>
</body></html>`;
await writeFile(pasta + 'logos.html', html);

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1400, height: 1400, deviceScaleFactor: 2 });
await pagina.goto(pathToFileURL(pasta + 'logos.html').href, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);

const alvos = [
  ['#logo-claro', 'logo-off-white-fundo-transparente.png', true],
  ['#logo-escuro', 'logo-bordo-fundo-transparente.png', true],
  ['#simbolo-cores', 'simbolo-cores-fundo-transparente.png', true],
  ['#simbolo-bordo', 'simbolo-bordo-fundo-transparente.png', true],
  ['#simbolo-claro', 'simbolo-off-white-fundo-transparente.png', true],
  ['#avatar', 'avatar-instagram-1080.png', false]
];
for (const [seletor, arquivo, transparente] of alvos) {
  const el = await pagina.$(seletor);
  await el.screenshot({ path: pasta + arquivo, omitBackground: transparente });
}
await navegador.close();
console.log('ok');
