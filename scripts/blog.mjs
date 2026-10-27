// Blog da Halo: gera /blog/ (lista), /blog/<slug>/ (cada texto), /blog/feed.xml e acrescenta os textos ao sitemap.
// Uso: node scripts/blog.mjs           → publica os textos aprovados com data até hoje
//      node scripts/blog.mjs --previa  → também gera os rascunhos em _previa/ (fora do ar) para revisão
//      node scripts/blog.mjs --ate 2026-11-03 → publica também os aprovados com data até esse dia
//
// Fonte dos textos: _blog/<AAAA-MM-DD>-<slug>.md (pasta com _ não é publicada pelo GitHub Pages).
// Cabeçalho de cada arquivo:
//   ---
//   titulo: Quanto custa uma agência de marketing
//   descricao: frase para o Google (até 160 caracteres)
//   data: 2026-11-03
//   status: rascunho | aprovado
//   autor: Amanda Takahashi | Bianca Fortes | João Dini | Halo Company
//   tema: Marketing | Site | Vídeo | Tráfego | Redes | Comercial
//   resumo: a resposta curta, em 2 ou 3 frases (vai no topo do texto e ajuda as IAs a citarem)
//   ---
// Texto em Markdown simples: ## e ### para títulos, parágrafos, listas com - ou 1., **negrito**, *itálico*, [link](url), > citação.
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { casca, chamada, esc, empresa, SITE, raiz } from './paginas.mjs';

const PREVIA = process.argv.includes('--previa');
// --ate AAAA-MM-DD: publica textos com data até esse dia (o agente de segunda gera o texto de terça).
const iAte = process.argv.indexOf('--ate');
const HOJE = iAte > 0 ? process.argv[iAte + 1] : new Date().toISOString().slice(0, 10);
const AUTORES = {
  'Amanda Takahashi': 'Estratégia e growth',
  'Bianca Fortes': 'Arte, tráfego e receita',
  'João Dini': 'Site, tecnologia e automações',
  'Halo Company': 'Amanda, Bia e João'
};
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataBr = (d) => { const [a, m, dia] = d.split('-').map(Number); return `${dia} de ${MESES[m - 1]} de ${a}`; };

/* ---------- Markdown simples ---------- */
function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
      const ext = /^https?:/.test(href) && !href.startsWith(SITE);
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
    });
}
function markdown(md) {
  const linhas = md.replace(/\r\n/g, '\n').split('\n');
  const out = []; let para = [], lista = null, cit = [];
  const fechaPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const fechaLista = () => { if (lista) { out.push(`<${lista.tipo}>${lista.itens.map((i) => `<li>${inline(i)}</li>`).join('')}</${lista.tipo}>`); lista = null; } };
  const fechaCit = () => { if (cit.length) { out.push(`<blockquote><p>${inline(cit.join(' '))}</p></blockquote>`); cit = []; } };
  const fechaTudo = () => { fechaPara(); fechaLista(); fechaCit(); };
  const ids = new Set();
  for (const l of linhas) {
    let m;
    if (!l.trim()) { fechaTudo(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.+)/))) {
      fechaTudo();
      let id = m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      while (ids.has(id)) id += '-2'; ids.add(id);
      out.push(`<h${m[1].length} id="${id}">${inline(m[2])}</h${m[1].length}>`); continue;
    }
    if ((m = l.match(/^\s*[-*]\s+(.+)/)) || (m = l.match(/^\s*\d+[.)]\s+(.+)/))) {
      const tipo = /^\s*\d/.test(l) ? 'ol' : 'ul';
      fechaPara(); fechaCit();
      if (!lista || lista.tipo !== tipo) { fechaLista(); lista = { tipo, itens: [] }; }
      lista.itens.push(m[1]); continue;
    }
    if ((m = l.match(/^>\s?(.*)/))) { fechaPara(); fechaLista(); cit.push(m[1]); continue; }
    fechaLista(); fechaCit(); para.push(l.trim());
  }
  fechaTudo();
  return out.join('\n');
}

/* ---------- Leitura dos textos ---------- */
async function textos() {
  let arquivos = [];
  try { arquivos = (await readdir(raiz + '_blog')).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)); } catch {}
  const lista = [];
  for (const f of arquivos) {
    const bruto = (await readFile(raiz + '_blog/' + f, 'utf8')).replace(/\r\n/g, '\n');
    const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) { console.warn('sem cabeçalho:', f); continue; }
    const meta = Object.fromEntries(m[1].split('\n').filter((l) => l.includes(':')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
    const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    const palavras = m[2].split(/\s+/).filter(Boolean).length;
    const faltando = ['titulo', 'descricao', 'data', 'status', 'autor', 'resumo'].filter((k) => !meta[k]);
    if (faltando.length) { console.warn(f, 'faltando:', faltando.join(', ')); continue; }
    if (!AUTORES[meta.autor]) console.warn(f, 'autor desconhecido:', meta.autor);
    lista.push({ ...meta, slug, arquivo: f, html: markdown(m[2]), minutos: Math.max(2, Math.round(palavras / 200)) });
  }
  return lista.sort((a, b) => b.data.localeCompare(a.data));
}

/* ---------- Páginas ---------- */
function paginaTexto(t, relacionados, base) {
  const url = `${SITE}/blog/${t.slug}/`;
  const autorLd = t.autor === 'Halo Company' ? empresa : { '@type': 'Person', name: t.autor, jobTitle: AUTORES[t.autor], worksFor: empresa };
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Halo Company', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: t.titulo, item: url }] },
    { '@type': 'BlogPosting', '@id': url + '#texto', headline: t.titulo, description: t.descricao, abstract: t.resumo, datePublished: t.data, dateModified: t.atualizado || t.data,
      inLanguage: 'pt-BR', author: autorLd, publisher: empresa, mainEntityOfPage: url, articleSection: t.tema || 'Marketing' }
  ] };
  const main = `
  <article>
    <header class="pg-hero pg-hero--texto">
      <div class="wrap">
        <nav class="migalha" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><a href="${base}">Blog</a><span aria-hidden="true">/</span><span>${esc(t.tema || 'Marketing')}</span></nav>
        <h1 id="pg-titulo" class="pg-titulo pg-titulo--texto">${esc(t.titulo)}</h1>
        <p class="texto__meta"><span>${esc(t.autor)}</span><span aria-hidden="true">·</span><time datetime="${t.data}">${dataBr(t.data)}</time><span aria-hidden="true">·</span><span>${t.minutos} min de leitura</span></p>
      </div>
    </header>
    <div class="wrap texto">
      <aside class="texto__resumo" aria-label="Resposta curta"><b>Resposta curta</b><p>${esc(t.resumo)}</p></aside>
      <div class="texto__corpo">
${t.html}
      </div>
    </div>
  </article>
${chamada('Quer essa conversa sobre a sua empresa?', 'No diagnóstico, os três sócios olham redes, site, anúncios e atendimento e dizem por onde começar.')}
${relacionados.length ? `
  <section class="secao" aria-labelledby="mais-titulo">
    <div class="wrap">
      <h2 id="mais-titulo" class="titulo-2" style="margin-bottom:36px">Leia também</h2>
      <div class="cartoes">${relacionados.map((r) => cartao(r, base)).join('')}
      </div>
    </div>
  </section>` : ''}`;
  return casca({ titulo: `${t.titulo} | Halo Company`, descricao: t.descricao, url, ld, ativo: 'blog', ogType: 'article', main });
}

const cartao = (t, base) => `
        <a class="cartao" href="${base}${t.slug}/"><small>${esc(t.tema || 'Marketing')} · ${dataBr(t.data)}</small><h3>${esc(t.titulo)}</h3><p>${esc(t.descricao)}</p><span class="seta">Ler</span></a>`;

function paginaLista(lista, base) {
  const url = `${SITE}/blog/`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Blog', '@id': url + '#blog', name: 'Blog da Halo Company', url, publisher: empresa, inLanguage: 'pt-BR',
      blogPost: lista.map((t) => ({ '@type': 'BlogPosting', headline: t.titulo, url: `${SITE}/blog/${t.slug}/`, datePublished: t.data })) }] };
  const main = `
  <section class="pg-hero" aria-labelledby="pg-titulo">
    <div class="wrap">
      <nav class="migalha" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><span>Blog</span></nav>
      <h1 id="pg-titulo" class="pg-titulo">Respostas diretas para o que o empresário <em>pergunta</em>.</h1>
      <p class="pg-apoio">Quanto custa, quanto tempo leva, o que funciona. Um texto novo por semana, escrito pelos três sócios da Halo.</p>
    </div>
  </section>
  <section class="secao" aria-label="Textos">
    <div class="wrap">
      ${lista.length ? `<div class="cartoes">${lista.map((t) => cartao(t, base)).join('')}
      </div>` : '<p class="pg-apoio">O primeiro texto sai em breve.</p>'}
    </div>
  </section>
${chamada('Prefere conversar?', 'Aplique para um diagnóstico com os três sócios.')}`;
  return casca({ titulo: 'Blog da Halo Company: marketing, site, vídeo e tráfego', descricao: 'Textos semanais da Halo Company com respostas diretas sobre marketing para empresas: quanto custa, quanto tempo leva e o que funciona em site, vídeo, redes e tráfego pago.', url, ld, ativo: 'blog', main });
}

function feed(lista) {
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Blog da Halo Company</title><link>${SITE}/blog/</link><description>Marketing, site, vídeo e tráfego para empresas.</description><language>pt-BR</language>
${lista.map((t) => `<item><title>${x(t.titulo)}</title><link>${SITE}/blog/${t.slug}/</link><guid>${SITE}/blog/${t.slug}/</guid><pubDate>${new Date(t.data + 'T12:00:00-03:00').toUTCString()}</pubDate><description>${x(t.resumo)}</description></item>`).join('\n')}
</channel></rss>
`;
}

/* ---------- Revisão (rascunhos com voto de Amanda, Bia e João) ---------- */
// Endereço escondido (/revisao/<slug>-<código>/), fora do sitemap, com noindex e bloqueado no robots.txt.
// Os votos vão para o Apps Script da Halo (aba "Revisões do blog" + e-mail para o João).
const APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbxoCRJXmJVA2KGLaE7OzkgMrnydWBkSmXOimTmV5oo7kqEpx9ASDLq8Ms9eD9aPBYo/exec';
const codigo = (slug) => createHash('sha256').update('halo-revisao:' + slug).digest('hex').slice(0, 8);
const caminhoRevisao = (t) => `revisao/${t.slug}-${codigo(t.slug)}`;

function paginaRevisao(t) {
  const aviso = `
    <div class="revisao__aviso"><div class="wrap"><b>Rascunho para revisão.</b> Este texto ainda não está publicado. Leia e vote no fim da página. <a href="#revisar">Ir para o voto</a></div></div>`;
  const form = `
      <section class="revisao" id="revisar" aria-labelledby="revisar-titulo">
        <h2 id="revisar-titulo">Sua revisão</h2>
        <p>Previsto para ${dataBr(t.data)}. O texto só vai ao ar com a aprovação.</p>
        <form class="revisao__form" id="form-revisao" data-slug="${esc(t.slug)}" data-titulo="${esc(t.titulo)}">
          <fieldset><legend>Quem está revisando</legend>
            <div class="chips">${['Amanda', 'Bia', 'João'].map((n) => `<label><input type="radio" name="quem" value="${n}" required><span>${n}</span></label>`).join('')}</div>
          </fieldset>
          <label class="revisao__comentario">Comentário (obrigatório para pedir ajuste)
            <textarea name="comentario" rows="4" placeholder="O que mudar, cortar ou acrescentar"></textarea>
          </label>
          <p class="revisao__erro" id="revisao-erro" role="alert"></p>
          <div class="revisao__botoes">
            <button type="submit" class="botao" value="aprovado">Aprovar</button>
            <button type="submit" class="botao botao--linha" value="ajuste">Pedir ajuste</button>
          </div>
          <p class="revisao__ok" id="revisao-ok" hidden tabindex="-1"></p>
        </form>
      </section>`;
  const script = `
<script>
(function () {
  var f = document.getElementById('form-revisao'), erro = document.getElementById('revisao-erro'), ok = document.getElementById('revisao-ok');
  var chave = 'halo-revisao-' + f.dataset.slug;
  try { var antes = JSON.parse(localStorage.getItem(chave) || 'null'); if (antes) mostrar(antes); } catch (e) {}
  function mostrar(v) { ok.hidden = false; ok.textContent = 'Voto registrado: ' + v.quem + ' ' + (v.decisao === 'aprovado' ? 'aprovou' : 'pediu ajuste') + '. Se mudar de ideia, é só votar de novo.'; }
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var decisao = ev.submitter && ev.submitter.value, quem = (f.querySelector('input[name=quem]:checked') || {}).value, comentario = f.comentario.value.trim();
    erro.textContent = '';
    if (!quem) { erro.textContent = 'Escolha quem está revisando.'; return; }
    if (decisao === 'ajuste' && !comentario) { erro.textContent = 'Escreva o que precisa mudar.'; f.comentario.focus(); return; }
    var botoes = f.querySelectorAll('button'); botoes.forEach(function (b) { b.disabled = true; });
    var dados = { tipo: 'revisao', slug: f.dataset.slug, titulo: f.dataset.titulo, quem: quem, decisao: decisao, comentario: comentario };
    fetch('${APPS_SCRIPT}', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) })
      .then(function () { try { localStorage.setItem(chave, JSON.stringify(dados)); } catch (e) {} mostrar(dados); ok.focus(); })
      .catch(function () { erro.textContent = 'Não foi possível enviar. Verifique a internet e tente de novo.'; })
      .finally(function () { botoes.forEach(function (b) { b.disabled = false; }); });
  });
})();
</script>`;
  return paginaTexto(t, [], '/blog/')
    .replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">')
    .replace('<body class="pg">', '<body class="pg pg--revisao">')
    .replace('<article>', '<article>' + aviso)
    .replace('</article>', form + '\n  </article>')
    .replace('</body>', script + '\n</body>');
}

/* ---------- Gerar ---------- */
const todos = await textos();
const publicados = todos.filter((t) => t.status === 'aprovado' && t.data <= HOJE);
const relacionados = (t, lista) => lista.filter((r) => r.slug !== t.slug).sort((a, b) => (b.tema === t.tema) - (a.tema === t.tema) || b.data.localeCompare(a.data)).slice(0, 3);

// Limpa textos que saíram do ar (ficam só as pastas dos publicados).
await mkdir(raiz + 'blog', { recursive: true });
for (const d of await readdir(raiz + 'blog', { withFileTypes: true })) {
  if (d.isDirectory() && !publicados.some((t) => t.slug === d.name)) await rm(raiz + 'blog/' + d.name, { recursive: true, force: true });
}
for (const t of publicados) {
  await mkdir(raiz + `blog/${t.slug}`, { recursive: true });
  await writeFile(raiz + `blog/${t.slug}/index.html`, paginaTexto(t, relacionados(t, publicados), '/blog/'));
}
await writeFile(raiz + 'blog/index.html', paginaLista(publicados, '/blog/'));
await writeFile(raiz + 'blog/feed.xml', feed(publicados));

// Sitemap: tira os textos antigos do blog e coloca os atuais.
let sm = (await readFile(raiz + 'sitemap.xml', 'utf8')).replace(/\r\n/g, '\n');
sm = sm.split('\n').filter((l) => !/\/blog\/[^<]+\/<\/loc>/.test(l)).join('\n');
const linhas = publicados.map((t) => `  <url><loc>${SITE}/blog/${t.slug}/</loc><lastmod>${t.atualizado || t.data}</lastmod></url>`).join('\n');
if (linhas) sm = sm.replace('</urlset>', linhas + '\n</urlset>');
await writeFile(raiz + 'sitemap.xml', sm);

// Páginas de revisão: uma para cada texto ainda não publicado (rascunho ou com data futura).
await rm(raiz + 'revisao', { recursive: true, force: true });
const pendentes = todos.filter((t) => !publicados.includes(t));
for (const t of pendentes) {
  await mkdir(raiz + caminhoRevisao(t), { recursive: true });
  await writeFile(raiz + caminhoRevisao(t) + '/index.html', paginaRevisao(t));
}
if (pendentes.length) console.log('revisão:', pendentes.map((t) => `${SITE}/${caminhoRevisao(t)}/`).join('\n         '));

// Prévia dos rascunhos (pasta _previa/, fora do ar e fora do git).
if (PREVIA) {
  await rm(raiz + '_previa', { recursive: true, force: true });
  for (const t of todos) {
    await mkdir(raiz + `_previa/${t.slug}`, { recursive: true });
    await writeFile(raiz + `_previa/${t.slug}/index.html`, paginaTexto(t, [], '/blog/').replace('<head>', '<head>\n<meta name="robots" content="noindex">'));
  }
  console.log('prévia:', todos.map((t) => `http://localhost:5610/_previa/${t.slug}/ (${t.status}, ${t.data})`).join('\n        '));
}
console.log(`blog: ${publicados.length} publicado(s), ${todos.length - publicados.length} aguardando (rascunho ou data futura)`);
