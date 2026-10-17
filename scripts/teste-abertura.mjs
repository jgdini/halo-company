// Testa a abertura em vídeo: tela cheia na 1ª visita, encolhe no fim/rolagem/pular, card nas visitas seguintes.
// Uso: node scripts/teste-abertura.mjs [pasta-para-prints]  (servidor "trama" na porta 5610)
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5610/', PASTA = process.argv[2] || '.';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => console.log(c ? '✓' : '✕', m);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const estado = (p) => p.evaluate(() => {
  const v = document.getElementById('abertura-video'), r = v.getBoundingClientRect(), c = { width: document.getElementById('abertura-card').clientWidth, top: document.getElementById('abertura-card').getBoundingClientRect().top };
  let vista = null; try { vista = localStorage.getItem('halo-abertura'); } catch {}
  return { intro: !document.getElementById('intro').hidden, voando: v.classList.contains('voando'), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), cardW: Math.round(c.width), cardY: Math.round(c.top), tocando: !v.paused, mudo: v.muted, loop: v.loop, t: +v.currentTime.toFixed(1), vista };
});

async function pagina(w, h) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage(); await p.setViewport({ width: w, height: h });
  const erros = []; p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  return { p, erros, ctx };
}

// 1. Computador: toca até o fim e encolhe sozinho.
{
  const { p, erros, ctx } = await pagina(1440, 900);
  await espera(1500);
  let e = await estado(p);
  ok(e.intro && e.voando && e.w === 1440 && e.tocando && e.mudo, `abre em tela cheia, mudo e tocando (${e.w}x${e.h}, t=${e.t}s)`);
  await p.screenshot({ path: `${PASTA}/abertura-1-tela-cheia.png` });
  await p.waitForFunction(() => document.getElementById('abertura-video').ended || !document.getElementById('abertura-video').classList.contains('voando'), { timeout: 15000 });
  await espera(500);
  await p.screenshot({ path: `${PASTA}/abertura-2-voando.png` });
  await espera(1200);
  e = await estado(p);
  ok(!e.intro && !e.voando && e.w === e.cardW && e.loop && e.vista === '1', `no fim encolhe para o card (${e.w}px = card ${e.cardW}px) e marca a visita`);
  await p.evaluate(() => document.getElementById('abertura').scrollIntoView()); await espera(800);
  e = await estado(p);
  ok(e.tocando && e.mudo, 'no card segue tocando, mudo, em repetição');
  await p.screenshot({ path: `${PASTA}/abertura-3-card.png` });
  // 2. Volta ao site: sem abertura.
  await p.evaluate(() => scrollTo(0, 0)); await p.reload({ waitUntil: 'domcontentloaded' }); await espera(1200);
  e = await estado(p);
  ok(!e.intro && !e.voando, 'na segunda visita entra direto, sem abertura');
  ok(erros.length === 0, `console sem erros ${erros.join(' | ')}`);
  await ctx.close();
}

// 3. Celular: a rolagem encolhe antes do fim; botão de som.
{
  const { p, erros, ctx } = await pagina(390, 844);
  await espera(1500);
  let e = await estado(p);
  ok(e.intro && e.voando && e.w === 390 && Math.abs(e.h - 219) <= 1, `no celular abre como faixa 16:9 no meio (${e.w}x${e.h} em y=${e.y})`);
  await p.click('#intro-som'); await espera(200);
  e = await estado(p); ok(!e.mudo, 'botão "Ligar som" liga o som');
  await p.screenshot({ path: `${PASTA}/abertura-4-celular.png` });
  await p.mouse.move(195, 600); await p.mouse.wheel({ deltaY: 300 }); await espera(1600);
  e = await estado(p);
  ok(!e.intro && !e.voando && e.w === e.cardW && e.t < 9, `rolar encolhe antes do fim (t=${e.t}s) e o vídeo cai no card`);
  ok(e.mudo, 'no card volta a ficar mudo');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, `sem rolagem lateral (${sw}px)`);
  ok(erros.length === 0, `console sem erros ${erros.join(' | ')}`);
  await ctx.close();
}

// 4. Pular e movimento reduzido.
{
  const { p, erros, ctx } = await pagina(1280, 800);
  await espera(1200); await p.click('#intro-pular'); await espera(1500);
  let e = await estado(p); ok(!e.intro && !e.voando, '"Pular" encolhe na hora');
  await ctx.close();
  const c2 = await b.createBrowserContext(); const p2 = await c2.newPage();
  await p2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p2.goto(URL, { waitUntil: 'domcontentloaded' }); await espera(1200);
  e = await estado(p2);
  ok(!e.intro && !e.tocando && await p2.$eval('#abertura-video', (v) => v.controls), 'com movimento reduzido: sem abertura, card com controles');
  await c2.close();
}
await b.close();
