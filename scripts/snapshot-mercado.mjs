// Mapa do que o mercado pesquisa e do que o site da empresa publica.
// Uso: node scripts/snapshot-mercado.mjs analise/<empresa>
// Lê <pasta>/alvos.json → "mercado": { "sementes": [...], "marcas": [...], "epoca": "regex" } e grava <pasta>/mercado.json.
// Buscas: sugestões do Google ao digitar (Brasil), expandidas com perguntas, comparações e letras. Mostram que a busca existe e é
// comum; não dizem quantas pessoas buscam. Conteúdo: títulos dos textos e páginas do site, lidos pela API do WordPress ou pelo mapa do site.
import { readFile, writeFile } from 'node:fs/promises';

const pasta = process.argv[2];
const alvos = JSON.parse(await readFile(`${pasta}/alvos.json`, 'utf8'));
const cfg = alvos.mercado || {};
const sementes = cfg.sementes || (alvos.buscas || []).map((b) => b.replace(/ (para|de)$/, ''));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Buscas ---------- */
const ANTES = ['como', 'qual', 'quanto', 'quando', 'melhor', 'o que e'];
const DEPOIS = ['', 'para', 'na', 'ou', 'preço', 'como usar', ...'abcdefghijlmnopqrstuv'.split('')];
async function sugestoes(q) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { await espera(20000 * (t + 1)); continue; }
      return JSON.parse(await r.text())[1] || [];
    } catch { await espera(3000); }
  }
  return null;
}
const buscas = new Map(); let falhas = 0;
for (const s of sementes) {
  const consultas = [...DEPOIS.map((d) => (d ? `${s} ${d}` : s)), ...ANTES.map((a) => `${a} ${s}`)];
  for (const q of consultas) {
    const lista = await sugestoes(q);
    if (!lista) { falhas++; continue; }
    lista.forEach((termo, pos) => { const v = buscas.get(termo) || { termo, semente: s, vezes: 0, pos: 99 }; v.vezes++; v.pos = Math.min(v.pos, pos); buscas.set(termo, v); });
    await espera(250);
  }
  console.error(`${s}: ${buscas.size} buscas até aqui`);
}

// Intenção de cada busca. Uma busca pode cair em mais de um grupo.
const epoca = new RegExp(cfg.epoca || 'seca|aguas|inverno|verao|chuva|frio|calor|safra|entressafra', 'i');
const grupos = {
  pergunta: (t) => /^(como|qual|quais|quanto|quantos|quando|onde|o que|por que|porque|pode|e bom)\b|\b(serve|funciona|faz mal|diferenca)\b/.test(t),
  comparacao: (t) => /\b(ou|vs|x|versus)\b|diferenca/.test(t),
  compra: (t) => /preco|valor|comprar|onde (comprar|encontrar)|venda|loja|barato|saco|kg\b/.test(t),
  epoca: (t) => epoca.test(t)
};
const lista = [...buscas.values()].map((b) => { const t = sem(b.termo); return { ...b, grupos: Object.keys(grupos).filter((g) => grupos[g](t)) }; }).sort((a, b) => b.vezes - a.vezes || a.pos - b.pos);
const marcas = [...new Set([alvos.empresa.nome, ...(alvos.concorrentes || []).map((c) => c.nome), ...(cfg.marcas || [])])];
const porMarca = Object.fromEntries(marcas.map((m) => [m, lista.filter((b) => new RegExp(`\\b${sem(m)}\\b`).test(sem(b.termo))).map((b) => b.termo)]));

/* ---------- Conteúdo do site da empresa ---------- */
async function json(url) { try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); return r.ok ? await r.json() : null; } catch { return null; } }
const limpa = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&#8211;|&#8212;/g, '-').replace(/&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();
const base = new URL(alvos.empresa.url).origin;
const conteudo = { textos: [], paginas: [], fonte: [] };
for (const raiz of [base, `${base}/blog`]) {
  for (let pag = 1; pag <= 10; pag++) {
    const posts = await json(`${raiz}/wp-json/wp/v2/posts?per_page=100&page=${pag}&_fields=date,link,title,categories`);
    if (!Array.isArray(posts) || !posts.length) break;
    if (pag === 1) conteudo.fonte.push(`${raiz}/wp-json (textos)`);
    let cats = {};
    if (pag === 1) { const c = await json(`${raiz}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`); if (Array.isArray(c)) cats = Object.fromEntries(c.map((x) => [x.id, limpa(x.name)])); conteudo._cats = { ...(conteudo._cats || {}), ...cats }; }
    for (const p of posts) if (!conteudo.textos.some((x) => x.link === p.link)) conteudo.textos.push({ data: p.date.slice(0, 10), titulo: limpa(p.title.rendered), link: p.link, categorias: (p.categories || []).map((id) => conteudo._cats?.[id] || id) });
    if (posts.length < 100) break;
  }
  const pags = await json(`${raiz}/wp-json/wp/v2/pages?per_page=100&_fields=link,title`);
  if (Array.isArray(pags)) { conteudo.fonte.push(`${raiz}/wp-json (páginas)`); for (const p of pags) if (!conteudo.paginas.some((x) => x.link === p.link)) conteudo.paginas.push({ titulo: limpa(p.title.rendered), link: p.link }); }
}
delete conteudo._cats;
conteudo.textos.sort((a, b) => b.data.localeCompare(a.data));
if (!conteudo.textos.length && !conteudo.paginas.length) conteudo.fonte.push('sem API do WordPress: preencher à mão a partir do mapa do site');

const saida = {
  coletadoEm: new Date().toISOString(), sementes, consultasSemResposta: falhas,
  total: lista.length, contagem: Object.fromEntries(Object.keys(grupos).map((g) => [g, lista.filter((b) => b.grupos.includes(g)).length])),
  porMarca: Object.fromEntries(Object.entries(porMarca).map(([m, l]) => [m, l.length])), exemplosPorMarca: porMarca,
  buscas: lista, conteudo
};
await writeFile(`${pasta}/mercado.json`, JSON.stringify(saida, null, 1));
console.log(`mercado: ${lista.length} buscas`, saida.contagem, '| marcas', saida.porMarca, `| textos ${conteudo.textos.length}, páginas ${conteudo.paginas.length}`, falhas ? `| ${falhas} consultas sem resposta` : '');
