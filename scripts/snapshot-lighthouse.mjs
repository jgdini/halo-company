// Mede cada site com o Lighthouse local (3 rodadas, mediana) e grava <pasta>/lighthouse.json.
// Plano B para quando o PageSpeed online está sem cota. Uso: node scripts/snapshot-lighthouse.mjs analise/<empresa>
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pasta = process.argv[2], RODADAS = 3;
const alvos = JSON.parse(await readFile(`${pasta}/alvos.json`, 'utf8'));
const lista = [['empresa', alvos.empresa], ...(alvos.concorrentes || []).map((c) => ['concorrente', c]), ...(alvos.modelo ? [['modelo', alvos.modelo]] : [])];
const mediana = (v) => { const s = v.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

function rodar(url, desktop) {
  const saida = join(tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const args = ['-y', 'lighthouse', url, '--quiet', '--chrome-flags=--headless=new', '--output=json', `--output-path=${saida}`, '--max-wait-for-load=60000'];
  if (desktop) args.push('--preset=desktop');
  return new Promise((ok) => execFile('npx', args, { shell: true, timeout: 240000 }, async () => {
    try {
      const r = JSON.parse(await readFile(saida, 'utf8')), a = r.audits, nota = (c) => Math.round(r.categories[c].score * 100);
      ok({ desempenho: nota('performance'), acessibilidade: nota('accessibility'), boasPraticas: nota('best-practices'), seo: nota('seo'),
        lcpSeg: a['largest-contentful-paint'].numericValue / 1000, fcpSeg: a['first-contentful-paint'].numericValue / 1000, tbtMs: a['total-blocking-time'].numericValue,
        cls: a['cumulative-layout-shift'].numericValue, pesoMB: a['total-byte-weight'].numericValue / 1048576, requisicoes: a['network-requests'].details.items.length,
        terceiros: new Set(a['network-requests'].details.items.map((i) => { try { return new URL(i.url).hostname; } catch { return ''; } }).filter((h) => h && !url.includes(h.replace(/^www\./, '')))).size });
    } catch { ok(null); }
  }));
}

async function medir(url, desktop) {
  const r = [];
  for (let i = 0; i < RODADAS; i++) { const x = await rodar(url, desktop); if (x) r.push(x); console.error(`   ${desktop ? 'computador' : 'celular'} ${i + 1}: ${x ? x.desempenho : 'falhou'}`); }
  if (!r.length) return null;
  const m = (k, casas = 0) => { const v = mediana(r.map((x) => x[k])); return v == null ? null : +v.toFixed(casas); };
  return { desempenho: m('desempenho'), acessibilidade: m('acessibilidade'), boasPraticas: m('boasPraticas'), seo: m('seo'), lcpSeg: m('lcpSeg', 1), fcpSeg: m('fcpSeg', 1), tbtMs: m('tbtMs'),
    cls: m('cls', 3), pesoMB: m('pesoMB', 1), requisicoes: m('requisicoes'), terceiros: m('terceiros'), rodadas: r.length, desempenhoRodadas: r.map((x) => x.desempenho), fonte: 'lighthouse local', medidoEm: new Date().toISOString() };
}

// Com nomes depois da pasta, mede só esses e mantém o resto do arquivo. Ex.: node scripts/snapshot-lighthouse.mjs analise/<empresa> "Modelo Halo"
const so = process.argv.slice(3);
let out = { medidoEm: new Date().toISOString(), itens: {} };
if (so.length) { try { out = JSON.parse(await readFile(`${pasta}/lighthouse.json`, 'utf8')); } catch {} }
for (const [papel, alvo] of lista) {
  if (so.length && !so.includes(alvo.nome)) continue;
  console.error(alvo.nome);
  out.itens[alvo.nome] = { celular: await medir(alvo.url, false) };
  // Computador para todos: comprador B2B costuma abrir no computador, e ali a ordem entre as empresas pode mudar.
  out.itens[alvo.nome].computador = await medir(alvo.url, true);
  await writeFile(`${pasta}/lighthouse.json`, JSON.stringify(out, null, 2));
}
console.log('ok');
