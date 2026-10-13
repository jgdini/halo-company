// Coleta complementar de uma análise: estrutura do site, Instagram público, o que as pessoas buscam e capturas de tela.
// Uso: node scripts/snapshot-extras.mjs analise/minerthal
// Lê <pasta>/alvos.json (com "buscas": termos de partida do segmento) e grava <pasta>/extras.json e <pasta>/img/*.webp.
// Tudo aqui é público e sem login. Do Instagram só sai o que o perfil mostra a qualquer visitante.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const pasta = process.argv[2];
const alvos = JSON.parse(await readFile(`${pasta}/alvos.json`, 'utf8'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const pegar = async (url, opt = {}) => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': opt.ua || UA }, redirect: opt.manual ? 'manual' : 'follow', signal: AbortSignal.timeout(45000) });
    return { status: r.status, cab: Object.fromEntries(r.headers), final: r.url, corpo: opt.semCorpo ? '' : await r.text() };
  } catch (e) { return { status: 0, cab: {}, final: url, corpo: '', erro: e.cause?.code || e.message }; }
};
const limpa = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#?[a-z0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// Data do conteúdo mais recente (blog ou notícias). Um site pode guardar o blog em outro lugar que não o feed principal
// (a Premix tem um WordPress separado em /blog/; a Matsuda não usa WordPress), então olhamos várias fontes e ficamos com a data mais nova.
async function conteudoRecente(origem, home) {
  const hoje = Date.now() + 86400000, achados = [];
  const guarda = (d, fonte) => { const t = d instanceof Date ? d : new Date(d); if (!isNaN(t) && t.getTime() <= hoje && t.getFullYear() >= 2005) achados.push({ data: t, fonte }); };
  // Seções que o próprio site chama de blog, notícias ou artigos.
  const secoes = new Set(['']);
  for (const m of home.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    let caminho; try { const x = new URL(m[1], origem + '/'); if (x.origin !== origem) continue; caminho = x.pathname; } catch { continue; }
    const s = caminho.match(/^(\/(?:[^/]+\/)?(?:blog|noticias|not%C3%ADcias|artigos|novidades|conteudos?|imprensa))(?:\/|$)/i);
    if (s) secoes.add(s[1]);
  }
  for (const sec of [...secoes].slice(0, 5)) {
    const feed = await pegar(`${origem}${sec}/feed/`);
    if (feed.status === 200 && /<rss|<feed/i.test(feed.corpo.slice(0, 600))) for (const m of feed.corpo.matchAll(/<(?:pubDate|updated|published)>([^<]+)</g)) guarda(m[1], `${sec}/feed`);
    const api = await pegar(`${origem}${sec}/wp-json/wp/v2/posts?per_page=5&_fields=date`);
    try { for (const p of JSON.parse(api.corpo)) guarda(p.date, `${sec || '/'} (WordPress)`); } catch {}
    if (sec) {
      const pg = await pegar(origem + sec);
      for (const m of pg.corpo.matchAll(/datetime=["'](\d{4}-\d{2}-\d{2})/g)) guarda(m[1], sec);
      for (const m of pg.corpo.matchAll(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/g)) guarda(`${m[3]}-${m[2]}-${m[1]}`, sec);
    }
  }
  achados.sort((a, b) => b.data - a.data);
  return { ultimo: achados[0]?.data.toISOString().slice(0, 10) || null, fonte: achados[0]?.fonte || null, secoes: [...secoes].filter(Boolean) };
}

async function estrutura(url) {
  const u = new URL(url), raizDom = u.hostname.replace(/^www\./, '');
  const p = await pegar(url), h = p.corpo;
  const imgs = [...h.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
  const ext = {}; for (const i of imgs) { const e = (i.match(/src=["'][^"']*\.(jpe?g|png|webp|avif|gif|svg)/i) || [])[1]?.toLowerCase().replace('jpeg', 'jpg'); if (e) ext[e] = (ext[e] || 0) + 1; }
  const sm = await pegar(u.origin + '/sitemap.xml');
  const locs = [...sm.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const datas = [...sm.corpo.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]).sort();
  const blog = await conteudoRecente(u.origin, h);
  const semWww = await pegar(`https://${raizDom}/`, { semCorpo: true });
  const http = await pegar(`http://${u.hostname}/`, { manual: true, semCorpo: true });
  return {
    servidor: p.cab['server'] || null, linguagem: p.cab['x-powered-by'] || null, sistema: (h.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)/i) || [])[1] || null,
    semWwwAbre: semWww.status >= 200 && semWww.status < 400, semWwwErro: semWww.erro || null,
    httpRedirecionaParaHttps: http.status >= 300 && http.status < 400 && /^https:/i.test(http.cab.location || ''),
    scripts: (h.match(/<script/gi) || []).length, folhasDeEstilo: (h.match(/rel=["']stylesheet/gi) || []).length,
    plugins: [...new Set([...h.matchAll(/wp-content\/plugins\/([a-z0-9_-]+)/gi)].map((m) => m[1]))],
    tema: [...new Set([...h.matchAll(/wp-content\/themes\/([a-z0-9_-]+)/gi)].map((m) => m[1]))],
    imagens: imgs.length, imagensSemDescricao: imgs.filter((i) => !/alt=["'][^"']+/.test(i)).length, imagensPorFormato: ext,
    imagensComCarregamentoSobDemanda: imgs.filter((i) => /loading=["']lazy/i.test(i)).length,
    carrossel: /revslider|meteor-slides|owl-carousel|swiper|slick/i.test(h), jquery: /jquery/i.test(h),
    menu: [...new Set([...h.matchAll(/<li[^>]*menu-item[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => limpa(m[1])).filter(Boolean))].slice(0, 14),
    mapaDoSite: { enderecos: locs.length, emHttp: locs.filter((l) => l.startsWith('http://')).length, ultimaAtualizacao: datas.at(-1) || null, geradoPor: (sm.corpo.match(/created with ([^<\n]+?)\s*-->/i) || [])[1] || null },
    blog,
    redes: Object.fromEntries(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok'].map((r) => [r, (h.match(new RegExp(`(?:https?:)?(?://)?(?:www\\.)?${r}\\.com/[^"'\\s<>]+`, 'i')) || [])[0] || null])) // o link pode vir sem "https://"
  };
}

// Só o que o perfil mostra sem login: nome, bio, seguidores, seguindo e número de posts.
async function instagram(link) {
  const usuario = (link || '').match(/instagram\.com\/([A-Za-z0-9_.]+)/)?.[1];
  if (!usuario) return null;
  const p = await pegar(`https://www.instagram.com/${usuario}/`, { ua: 'facebookexternalhit/1.1' });
  const og = (k) => (p.corpo.match(new RegExp(`property="og:${k}" content="([^"]*)"`)) || [])[1]?.replace(/&amp;/g, '&').replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16))).replace(/&quot;/g, '"') || null;
  const d = og('description') || '';
  // O Instagram responde em inglês ("6,691 Followers", "37K") ou em português ("6.691 seguidores", "37 mil").
  const ingles = /Followers/i.test(d);
  const num = (re) => { const m = d.match(re); if (!m) return null; let v = parseFloat(ingles ? m[1].replace(/,/g, '') : m[1].replace(/\./g, '').replace(',', '.')); const s = (m[2] || '').toLowerCase(); if (s === 'mil' || s === 'k') v *= 1e3; if (s === 'mi' || s === 'm') v *= 1e6; return Math.round(v); };
  return { usuario, status: p.status, nome: og('title'), seguidores: num(/([\d.,]+)\s*(mil|mi|K|M)?\s+(?:seguidores|Followers)/i), seguindo: num(/([\d.,]+)\s*(mil|mi|K|M)?\s+(?:seguindo|Following)/i), posts: num(/([\d.,]+)\s*(mil|mi|K|M)?\s+(?:posts|publicações)/i), descricaoPublica: d.slice(0, 300) };
}

// O que o Google sugere quando alguém começa a digitar cada termo (sem volume de buscas).
async function sugestoes(termo) {
  const r = await pegar(`https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&ie=utf-8&oe=utf-8&q=${encodeURIComponent(termo)}`);
  try { return JSON.parse(r.corpo)[1] || []; } catch { return []; }
}

const empresas = [alvos.empresa, ...(alvos.concorrentes || [])];
// SO_CAPTURA=1 refaz só as capturas de tela e mantém o resto do extras.json.
const soCaptura = !!process.env.SO_CAPTURA;
let out = { coletadoEm: new Date().toISOString(), estrutura: {}, instagram: {}, buscas: [] };
if (soCaptura) out = JSON.parse(await readFile(`${pasta}/extras.json`, 'utf8'));
for (const e of soCaptura ? [] : empresas) {
  console.error('estrutura:', e.nome);
  out.estrutura[e.nome] = await estrutura(e.url);
  out.instagram[e.nome] = await instagram(e.instagram || out.estrutura[e.nome].redes.instagram);
}
const marcas = empresas.map((e) => e.nome.toLowerCase());
for (const termo of soCaptura ? [] : alvos.buscas || []) {
  const lista = await sugestoes(termo);
  out.buscas.push({ termo, sugestoes: lista, marcasQueAparecem: [...new Set(lista.flatMap((s) => marcas.filter((m) => s.toLowerCase().includes(m))))] });
}
if (!soCaptura) out.buscaPelaMarca = await sugestoes(alvos.empresa.nome.toLowerCase() + ' ');

// Capturas de tela da página inicial (computador e celular) da empresa e do modelo.
await mkdir(`${pasta}/img`, { recursive: true });
// SEM_CAPTURA=1 pula as capturas de tela (mantém as que já existem).
if (!process.env.SEM_CAPTURA) {
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
for (const [nome, alvo] of [['atual', alvos.empresa], ...(alvos.modelo ? [['modelo', alvos.modelo]] : [])]) {
  for (const [tipo, w, h] of [['computador', 1440, 900], ['celular', 390, 844]]) {
    const p = await b.newPage();
    try {
      await p.setViewport({ width: w, height: h, isMobile: tipo === 'celular', deviceScaleFactor: 1 });
      if (tipo === 'celular') await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
      await p.goto(alvo.url, { waitUntil: 'networkidle2', timeout: 90000 });
      await new Promise((r) => setTimeout(r, 2500));
      await sharp(await p.screenshot()).resize(tipo === 'celular' ? 390 : 1100).webp({ quality: 76 }).toFile(`${pasta}/img/${nome}-${tipo}.webp`);
      console.error('captura:', nome, tipo);
    } catch (e) { console.error('captura falhou:', nome, tipo, e.message.slice(0, 80)); }
    await p.close();
  }
}
await b.close();
}
await writeFile(`${pasta}/extras.json`, JSON.stringify(out, null, 2));
console.log('extras gravados');
