// Capturas por seção num Chrome real (animações rodando). Uso: node scripts/shots.mjs [largura] [altura]
import puppeteer from 'puppeteer-core';
const [w = 1440, h = 900] = process.argv.slice(2).map(Number);
const out = process.env.SHOTS || 'shots';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto('http://localhost:5610/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2800));
const alvos = await page.evaluate(() => {
  const y = (s, d = 0) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY + d : 0; };
  const solt = document.querySelector('.soltos');
  return [
    ['01-hero', 0], ['02-nomes', y('.nomes', -200)], ...[0, 1, 2, 3, 4, 5].map((i) => { const c = document.querySelector('.cenas'); return ['02c-cena' + (i + 1), y('.cenas') + (c.offsetHeight - innerHeight) * ((i + .55) / 6)]; }), ['03-provas', y('#provas')], ['04-depo', y('.depo', -120)], ['05-selo', y('.selo', -200)],
    ['06-soltos-a', y('.soltos') + solt.offsetHeight * .05], ['07-soltos-b', y('.soltos') + solt.offsetHeight * .35], ['08-soltos-c', y('.soltos') + solt.offsetHeight * .62],
    ['09-time', y('#time')], ['10-pessoas', y('.pessoas', -80)], ['11-metodo', y('.passos', -300)], ['12-case', y('#case')], ['12b-projetos', y('#projetos')], ['12c-projetos', y('.projetos__lista', -100)], ['13-perfil', y('.perfil')],
    ['14-faq', y('#perguntas')], ['15-aplicar', y('#aplicar')], ['16-rodape', document.body.scrollHeight]
  ];
});
for (const [nome, alvo] of alvos) {
  // Rola em passos para o ScrollTrigger acompanhar.
  const atual = await page.evaluate(() => scrollY);
  const passos = 8;
  for (let i = 1; i <= passos; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), atual + (alvo - atual) * i / passos);
    await new Promise((r) => setTimeout(r, 60));
  }
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${out}/${w}-${nome}.png` });
}
console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'sem erros');
await browser.close();
