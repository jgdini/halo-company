// Coleta os dados públicos de um Snapshot: PageSpeed (API do Google) e sinais da página inicial.
// Uso: node scripts/snapshot-coleta.mjs analise/minerthal
// Lê <pasta>/alvos.json ({ "empresa": {nome,url}, "concorrentes": [{nome,url}], "modelo": {nome,url} })
// e grava <pasta>/coleta.json. Nada aqui é interpretação: só o que qualquer pessoa consegue medir.
import { readFile, writeFile } from 'node:fs/promises';

const pasta = process.argv[2];
if (!pasta) { console.error('Informe a pasta do snapshot.'); process.exit(1); }
const alvos = JSON.parse(await readFile(`${pasta}/alvos.json`, 'utf8'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pagespeed(url, estrategia) {
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  api.searchParams.set('url', url); api.searchParams.set('strategy', estrategia); api.searchParams.set('locale', 'pt-BR');
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) api.searchParams.append('category', c);
  if (process.env.PSI_KEY) api.searchParams.set('key', process.env.PSI_KEY);
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(api, { signal: AbortSignal.timeout(120000) });
      const j = await r.json();
      if (j.error) throw new Error(`${j.error.code} ${j.error.message.slice(0, 120)}`);
      const lh = j.lighthouseResult, a = lh.audits, nota = (c) => Math.round(lh.categories[c].score * 100);
      return {
        desempenho: nota('performance'), acessibilidade: nota('accessibility'), boasPraticas: nota('best-practices'), seo: nota('seo'),
        lcpSeg: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(1),
        fcpSeg: +(a['first-contentful-paint'].numericValue / 1000).toFixed(1),
        tbtMs: Math.round(a['total-blocking-time'].numericValue),
        cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
        pesoMB: +(a['total-byte-weight'].numericValue / 1048576).toFixed(1),
        requisicoes: a['network-requests']?.details?.items?.length ?? null,
        respostaServidorSeg: a['server-response-time'] ? +(a['server-response-time'].numericValue / 1000).toFixed(1) : null,
        // Dados de usuários reais do Chrome (CrUX), quando o Google tem amostra suficiente.
        campo: j.loadingExperience?.metrics ? { geral: j.loadingExperience.overall_category, lcpMs: j.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null } : null,
        medidoEm: lh.fetchTime
      };
    } catch (e) {
      console.error(`  PageSpeed ${estrategia} tentativa ${tentativa}: ${e.message}`);
      await espera(8000 * tentativa);
    }
  }
  return null;
}

async function texto(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(40000) });
    return { status: r.status, tipo: r.headers.get('content-type') || '', final: r.url, corpo: await r.text() };
  } catch (e) { return { status: 0, tipo: '', final: url, corpo: '', erro: e.message }; }
}

async function sinais(url) {
  const t0 = Date.now();
  const p = await texto(url);
  const h = p.corpo, base = new URL(p.final || url).origin;
  const tag = (re) => (h.match(re) || [])[1]?.trim() ?? null;
  const tipos = new Set();
  for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*(?:"([^"]+)"|\[([^\]]+)\])/g)) (t[1] || t[2]).replace(/"/g, '').split(',').forEach((x) => tipos.add(x.trim()));
  }
  const arquivo = async (caminho, ehTexto) => { const r = await texto(base + caminho); return r.status === 200 && (!ehTexto || !/<html/i.test(r.corpo.slice(0, 600))) && r.corpo.trim().length > 0; };
  const robots = await texto(base + '/robots.txt');
  return {
    status: p.status, enderecoFinal: p.final, respostaHtmlSeg: +((Date.now() - t0) / 1000).toFixed(1), htmlKB: Math.round(h.length / 1024),
    titulo: tag(/<title[^>]*>([\s\S]*?)<\/title>/i),
    descricao: tag(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ?? tag(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    h1: [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 3),
    gerador: tag(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(h),
    dadosEstruturados: [...tipos],
    temFAQ: tipos.has('FAQPage'),
    llmsTxt: await arquivo('/llms.txt', true),
    sitemap: (await arquivo('/sitemap.xml', false)) || (await arquivo('/sitemap_index.xml', false)) || /sitemap:/i.test(robots.corpo),
    robotsTxt: robots.status === 200 && !/<html/i.test(robots.corpo.slice(0, 300)),
    elementor: (h.match(/elementor/gi) || []).length,
    jquery: /jquery/i.test(h),
    whatsapp: /wa\.me|api\.whatsapp\.com/i.test(h),
    formulario: /<form/i.test(h)
  };
}

const lista = [['empresa', alvos.empresa], ...(alvos.concorrentes || []).map((c) => ['concorrente', c]), ...(alvos.modelo ? [['modelo', alvos.modelo]] : [])];
const saida = { coletadoEm: new Date().toISOString(), itens: [] };
for (const [papel, alvo] of lista) {
  console.error(`${alvo.nome} (${alvo.url})`);
  const item = { papel, nome: alvo.nome, url: alvo.url, sinais: await sinais(alvo.url), celular: await pagespeed(alvo.url, 'mobile') };
  if (papel !== 'concorrente') item.computador = await pagespeed(alvo.url, 'desktop');
  saida.itens.push(item);
  await writeFile(`${pasta}/coleta.json`, JSON.stringify(saida, null, 2));
}
console.log('coleta gravada em', `${pasta}/coleta.json`);
