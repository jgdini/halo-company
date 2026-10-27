// Logo quadrado e capa para o Perfil da Empresa no Google.
// O Google mostra o logo recortado em círculo: tudo fica dentro do miolo.
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pasta = raiz + 'identidade/google/';
await mkdir(pasta, { recursive: true });

const BORDO = '#3A0D18', FUNDO = '#2A0811', OFF = '#F5EFE6', CEREJA = '#E0506F', CHAMP = '#E7C493', PEROLA = '#F8F3EB';
const TRIO = [CEREJA, CHAMP, PEROLA];

function anel(cx, cy, r, cores, lw) {
  const c = 2 * Math.PI * r, seg = c * 0.286, gap = c * 0.714;
  return cores.map((cor, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-dasharray="${seg} ${gap}" stroke-dashoffset="${-i * c / 3}" transform="rotate(-90 ${cx} ${cy})"/>`).join('');
}
const simbolo = tam => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${tam}" height="${tam}">${anel(16, 16, 11, TRIO, 3)}</svg>`;
const marca = (tamSimbolo, tamTexto) => `<div class="marca">${simbolo(tamSimbolo)}<div class="nome" style="font-size:${tamTexto}px">halo<small>company</small></div></div>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url("../../assets/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
body { margin: 0; }
.quadro { display: grid; place-items: center; background: radial-gradient(circle at 50% 42%, ${BORDO} 0%, ${FUNDO} 75%); }
#logo { width: 1080px; height: 1080px; }
#capa { width: 1920px; height: 1080px; }
.marca { display: flex; flex-direction: column; align-items: center; color: ${OFF}; font-family: "Archivo", sans-serif; }
.nome { display: flex; flex-direction: column; align-items: center; font-weight: 750; font-stretch: 118%; letter-spacing: -.03em; line-height: .9; }
.nome small { margin-top: .32em; font-size: .3em; font-weight: 600; font-stretch: 82%; letter-spacing: .42em; text-transform: uppercase; opacity: .85; padding-left: .42em; }
</style></head><body>
<div class="quadro" id="logo">${marca(400, 150)}</div>
<div class="quadro" id="capa">${marca(420, 160)}</div>
</body></html>`;
await writeFile(pasta + 'google.html', html);

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 2000, height: 2300, deviceScaleFactor: 1 });
await pagina.goto(pathToFileURL(pasta + 'google.html').href, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await (await pagina.$('#logo')).screenshot({ path: pasta + 'logo-google-1080.png' });
await (await pagina.$('#capa')).screenshot({ path: pasta + 'capa-google-1920x1080.png' });
await navegador.close();
console.log('ok');
