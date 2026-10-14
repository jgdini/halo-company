// Lê as notas na página oficial do PageSpeed (pagespeed.web.dev) e grava em <pasta>/coleta.json.
// Usado quando a API pública está sem cota. Uso: node scripts/snapshot-psi.mjs analise/<empresa> [nome...]
import { readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const [pasta, ...so] = process.argv.slice(2);
const arq = `${pasta}/coleta.json`;
const coleta = JSON.parse(await readFile(arq, 'utf8'));
const num = (s) => { const m = String(s || '').replace(/\./g, '').replace(',', '.').match(/[\d.]+/); return m ? +m[0] : null; };

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--lang=pt-BR'] });
for (const item of coleta.itens) {
  if (so.length && !so.includes(item.nome)) continue;
  const p = await b.newPage();
  await p.setViewport({ width: 1300, height: 1000 });
  console.error(item.nome, '…');
  try {
    await p.goto('https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(item.url) + '&form_factor=mobile', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction(() => document.querySelectorAll('.lh-gauge__percentage, .lh-exp-gauge__percentage').length >= 8 || /Ocorreu um erro|An error occurred|não foi possível/i.test(document.body.innerText), { timeout: 240000, polling: 2000 });
    const dados = await p.evaluate(() => {
      const paineis = [...document.querySelectorAll('[role="tabpanel"]')].filter((el) => el.querySelector('.lh-gauge__percentage, .lh-exp-gauge__percentage'));
      return paineis.map((el) => {
        const notas = {};
        el.querySelectorAll('a.lh-gauge__wrapper, a.lh-fraction__wrapper').forEach((a) => { const k = (a.getAttribute('href') || '').replace('#', ''); const v = a.querySelector('.lh-gauge__percentage'); if (k && v && !(k in notas)) notas[k] = v.textContent.trim(); });
        const metricas = {};
        el.querySelectorAll('.lh-metric').forEach((m) => { const t = m.querySelector('.lh-metric__title')?.textContent.trim(); const v = m.querySelector('.lh-metric__value')?.textContent.trim(); if (t && v && !(t in metricas)) metricas[t] = v; });
        const audit = (id) => el.querySelector(`#${id} .lh-audit__display-text`)?.textContent.trim() ?? null;
        return { rotulo: el.getAttribute('aria-labelledby'), notas, metricas, peso: audit('total-byte-weight'), servidor: audit('server-response-time') ?? audit('document-latency-insight'), hora: el.querySelector('.lh-meta__items, .lh-env__description')?.textContent.slice(0, 80) ?? null };
      });
    });
    for (const d of dados) {
      const chave = /desktop/i.test(d.rotulo || '') ? 'computador' : 'celular';
      const m = d.metricas, acha = (re) => { const k = Object.keys(m).find((x) => re.test(x)); return k ? m[k] : null; };
      const pesoKiB = num(d.peso);
      item[chave] = {
        desempenho: num(d.notas.performance), acessibilidade: num(d.notas.accessibility), boasPraticas: num(d.notas['best-practices']), seo: num(d.notas.seo),
        lcpSeg: num(acha(/Largest Contentful Paint/i)), fcpSeg: num(acha(/First Contentful Paint/i)),
        tbtMs: num(acha(/Total Blocking Time/i)), cls: num(acha(/Cumulative Layout Shift/i)), indiceVelocidadeSeg: num(acha(/Speed Index/i)),
        pesoMB: pesoKiB ? +(pesoKiB / 1024).toFixed(1) : null, pesoTexto: d.peso, fonte: 'pagespeed.web.dev', medidoEm: new Date().toISOString()
      };
    }
    console.error('  ', JSON.stringify({ celular: item.celular, computador: item.computador }).slice(0, 400));
    if (!dados.length) console.error('   sem painéis:', (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300));
  } catch (e) { console.error('   falhou:', e.message.slice(0, 200)); }
  await writeFile(arq, JSON.stringify(coleta, null, 2));
  await p.close();
}
await b.close();
