// Gera o PDF da proposta (propostaclaris/proposta-comercial.pdf) a partir da página. Precisa do servidor local na porta 5610.
import puppeteer from 'puppeteer-core';
const out = process.env.SHOTS;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(e.message)); p.on('requestfailed', (r) => erros.push('falhou ' + r.url()));
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await p.setViewport({ width: 1100, height: 900 });
await p.goto('http://localhost:5610/propostaclaris/', { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: 'propostaclaris/proposta-comercial.pdf', printBackground: true, preferCSSPageSize: true });
if (out) {
  await p.screenshot({ path: out + '/claro.png' });
  await p.evaluate(() => document.querySelector('.invest-card').scrollIntoView({ block: 'start' }));
  await p.screenshot({ path: out + '/investimento.png' });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await p.evaluate(() => scrollTo(0, 0));
  await p.screenshot({ path: out + '/escuro.png' });
  await p.setViewport({ width: 412, height: 915, isMobile: true });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await p.reload({ waitUntil: 'networkidle0' });
  await p.screenshot({ path: out + '/celular.png' });
  console.log('rolagem lateral no celular:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
}
console.log(erros.length ? 'ERROS: ' + erros.join(' | ') : 'sem erros');
await b.close();
