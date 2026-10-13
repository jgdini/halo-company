// Monta a página e o PDF de uma análise (Intelligence Snapshot).
// Uso: node scripts/snapshot-gerar.mjs analise/minerthal
// Lê: alvos.json (quem é quem), coleta.json e lighthouse.json (números medidos), extras.json (estrutura, Instagram, buscas)
// e analise.json (a leitura feita por gente). Grava index.html e snapshot.pdf na mesma pasta. Estilo em analise/estilo.css.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const pasta = process.argv[2];
const ler = async (f) => JSON.parse(await readFile(`${pasta}/${f}`, 'utf8'));
const coleta = await ler('coleta.json'), an = await ler('analise.json');
// Quando o PageSpeed on-line está sem cota, as notas vêm de lighthouse.json (snapshot-lighthouse.mjs).
try { const lh = await ler('lighthouse.json'); for (const i of coleta.itens) { const m = lh.itens[i.nome]; if (m) { i.celular = i.celular ?? m.celular; i.computador = i.computador ?? m.computador; } } } catch {}
let ex = null; try { ex = await ler('extras.json'); } catch {}

const empresa = coleta.itens.find((i) => i.papel === 'empresa');
const concorrentes = coleta.itens.filter((i) => i.papel === 'concorrente');
const modelo = coleta.itens.find((i) => i.papel === 'modelo');
const todos = [empresa, ...concorrentes];

const n = (v, casas = 0) => (v == null ? 's/d' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const data = new Date(coleta.coletadoEm).toLocaleDateString('pt-BR');
const sim = '<span class="yes">Sim</span>', nao = '<span class="no">Não</span>', sd = '<span class="tag" style="display:inline">s/d</span>';
const img = (arq, alt, cls = '') => (existsSync(`${pasta}/img/${arq}`) ? `<img class="${cls}" src="img/${arq}" alt="${esc(alt)}" loading="lazy">` : '');
let secao = 0; const num = () => ++secao;

// Uma barra por empresa; a empresa analisada em destaque, os concorrentes em cinza.
function barras(titulo, sub, valor, formato, maximo) {
  const max = maximo ?? Math.max(...todos.map((i) => valor(i) ?? 0)) * 1.08;
  return `<div class="chart">
      <div class="chart__head"><div class="chart__title">${titulo}</div><div class="legend"><span class="l-new"><i></i>${esc(empresa.nome)}</span><span class="l-old"><i></i>Concorrentes</span></div></div>
      ${todos.map((i) => { const v = valor(i); return `<div class="cmp-row"><div class="cmp-label">${esc(i.nome)}</div><div class="bars"><div class="bar ${i === empresa ? 'new' : 'old'}"><div class="bar__track"><span class="bar__fill" style="width:${v == null ? 0 : Math.max(2, Math.min(100, (v / max) * 100)).toFixed(1)}%"></span></div><span class="bar__val">${formato(v)}</span></div></div></div>`; }).join('\n      ')}
      ${sub ? `<p class="method">${sub}</p>` : ''}
    </div>`;
}
const quatroNotas = [['Velocidade', 'desempenho'], ['Acessibilidade', 'acessibilidade'], ['Boas práticas', 'boasPraticas'], ['SEO técnico', 'seo']];
function duasBarras(titulo, a, b, rotuloA, rotuloB) {
  return `<div class="chart">
      <div class="chart__head"><div class="chart__title">${titulo}</div><div class="legend"><span class="l-old"><i></i>${rotuloA}</span><span class="l-new"><i></i>${rotuloB}</span></div></div>
      ${quatroNotas.map(([r, k]) => `<div class="cmp-row"><div class="cmp-label">${r}</div><div class="bars">
        <div class="bar old"><div class="bar__track"><span class="bar__fill" style="width:${a[k]}%"></span></div><span class="bar__val">${a[k]}</span></div>
        <div class="bar new"><div class="bar__track"><span class="bar__fill" style="width:${b[k]}%"></span></div><span class="bar__val">${b[k]}</span></div></div></div>`).join('\n      ')}
    </div>`;
}

const c = empresa.celular, pc = empresa.computador;
const est = (i) => ex?.estrutura?.[i.nome] ?? null;
const sinal = (rotulo, f) => `<tr><td>${rotulo}</td>${todos.map((i) => { const v = f(i.sinais, est(i)); return `<td>${v == null ? sd : v ? sim : nao}</td>`; }).join('')}</tr>`;
const levePct = (e) => { if (!e) return null; const f = e.imagensPorFormato, leve = (f.webp || 0) + (f.avif || 0), tot = leve + (f.png || 0) + (f.jpg || 0); return tot ? leve / tot : null; };
const mesesDesde = (iso) => (iso ? (new Date(coleta.coletadoEm) - new Date(iso)) / 2629800000 : null);

// Placar: itens objetivos, atendidos ou não. O que não dá para ler de fora vem de analise.json ("flags").
const eE = est(empresa), fl = an.flags || {};
const wp = (eE?.sistema || empresa.sinais.gerador || '').match(/WordPress (\d+)\.(\d+)/);
const php = (eE?.linguagem || '').match(/PHP\/(\d+)\.(\d+)/);
const pilares = [
  ['Base técnica', [
    ['Nota de velocidade no celular de 50 ou mais', c.desempenho >= 50],
    ['Conteúdo na tela em até 2,5 segundos', c.lcpSeg <= 2.5],
    ['O endereço sem “www” abre', eE ? eE.semWwwAbre : null],
    ['O endereço http leva para o https', eE ? eE.httpRedirecionaParaHttps : null],
    ['Sistema do site em versão atual', wp ? +wp[1] >= 6 : null],
    ['Linguagem do servidor com suporte de segurança', php ? +php[1] > 8 || (+php[1] === 8 && +php[2] >= 2) : null],
    ['Imagens em formato leve (WebP ou AVIF)', levePct(eE) == null ? null : levePct(eE) >= 0.5]
  ]],
  ['Ser encontrado', [
    ['O título no Google diz o que a empresa faz', fl.tituloDizOQueFaz ?? null],
    ['A página inicial tem descrição para o Google', !!empresa.sinais.descricao],
    ['Dados estruturados da empresa', empresa.sinais.dadosEstruturados.some((t) => /Organization|LocalBusiness|Corporation/.test(t))],
    ['Perguntas e respostas marcadas', empresa.sinais.temFAQ],
    ['Arquivo para assistentes de IA (llms.txt)', empresa.sinais.llmsTxt],
    ['Mapa do site atualizado nos últimos 12 meses', eE?.mapaDoSite?.ultimaAtualizacao ? mesesDesde(eE.mapaDoSite.ultimaAtualizacao) <= 12 : eE ? false : null],
    ['Blog com texto novo nos últimos 3 meses', eE?.blog?.ultimo ? mesesDesde(eE.blog.ultimo) <= 3 : eE ? false : null]
  ]],
  ['Converter', [
    ['WhatsApp na página inicial', empresa.sinais.whatsapp],
    ['Formulário de contato', empresa.sinais.formulario],
    ['Botão de contato nas páginas de produto', fl.botaoDeContatoNoProduto ?? null],
    ['Página de “onde comprar” ou de representantes', fl.ondeComprar ?? null],
    ['Formulário que pergunta o que o cliente precisa', fl.formularioQualifica ?? null]
  ]]
].map(([nome, itens]) => { const v = itens.filter((i) => i[1] != null); return { nome, itens: v, ok: v.filter((i) => i[1]).length }; });

const placar = `<div class="placar">
      ${pilares.map((p) => `<div class="pilar"><div class="pilar__topo"><b>${p.nome}</b><span class="pilar__nota">${p.ok}<small> de ${p.itens.length}</small></span></div><ul>${p.itens.map(([t, ok]) => `<li class="${ok ? 'ok' : 'falta'}">${t}</li>`).join('')}</ul></div>`).join('\n      ')}
    </div>`;

// Estrutura do site: fatos lidos do código público.
const fatosEstrutura = eE ? [
  ['Sistema e linguagem', [eE.sistema, eE.linguagem?.split(',')[0]].filter(Boolean).join(' · ') || 'Não informado'],
  ['Peças carregadas na página inicial', `${eE.scripts} scripts e ${eE.folhasDeEstilo} folhas de estilo`],
  ['Extensões instaladas (plugins)', eE.plugins.length ? `${eE.plugins.length}: ${eE.plugins.join(', ')}` : 'Nenhuma visível'],
  ['Imagens', `${eE.imagens} na página inicial: ${Object.entries(eE.imagensPorFormato).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(', ')}. ${eE.imagensComCarregamentoSobDemanda} carregam só quando aparecem na tela.`],
  ['Mapa do site', eE.mapaDoSite.enderecos ? `${eE.mapaDoSite.enderecos} endereços${eE.mapaDoSite.emHttp ? `, ${eE.mapaDoSite.emHttp === eE.mapaDoSite.enderecos ? 'todos' : eE.mapaDoSite.emHttp} em http` : ''}. Última atualização: ${eE.mapaDoSite.ultimaAtualizacao ? new Date(eE.mapaDoSite.ultimaAtualizacao).toLocaleDateString('pt-BR') : 'sem data'}.${eE.mapaDoSite.geradoPor ? ' Gerado por uma ferramenta on-line gratuita.' : ''}` : 'Não encontrado'],
  ['Menu principal', eE.menu.join(' · ') || 'Não identificado']
] : [];

const ig = ex?.instagram || {};
const temIg = todos.some((i) => ig[i.nome]?.seguidores);

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Intelligence Snapshot · ${esc(empresa.nome)} · Halo Company</title>
<meta name="description" content="Leitura da presença digital pública da ${esc(empresa.nome)}, com comparação entre concorrentes e três oportunidades.">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#3A0D18">
<link rel="stylesheet" href="../estilo.css">
<style>
.placar{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:12px; }
.pilar{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:16px 18px; }
.pilar__topo{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid var(--line); }
.pilar__topo b{ font-size:15px; }
.pilar__nota{ font-size:26px; font-weight:800; font-stretch:110%; color:var(--gold); white-space:nowrap; }
.pilar__nota small{ font-size:12px; font-weight:600; color:var(--steel); }
.pilar ul{ list-style:none; margin:0; padding:0; display:grid; gap:7px; }
.pilar li{ position:relative; padding-left:22px; font-size:13px; line-height:1.4; color:var(--steel); }
.pilar li::before{ position:absolute; left:0; top:0; font-weight:700; }
.pilar li.ok::before{ content:"✓"; color:var(--ok); }
.pilar li.falta::before{ content:"✕"; color:var(--bad); }
.pilar li.ok{ color:var(--ink); }
.telas{ display:grid; grid-template-columns:1fr auto; gap:12px; align-items:start; margin-bottom:14px; }
.telas figure{ margin:0; }
.telas img{ display:block; width:100%; height:auto; border:1px solid var(--line); border-radius:3px; background:var(--white); }
.telas .cel img{ width:170px; }
.telas figcaption{ font-size:11.5px; color:var(--steel-light); margin-top:6px; font-stretch:84%; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
.moderno{ display:grid; gap:10px; }
.moderno div{ background:var(--white); border:1px solid var(--line); border-left:4px solid var(--gold); border-radius:3px; padding:14px 18px; }
.moderno b{ display:block; font-size:14.5px; margin-bottom:3px; }
.moderno p{ margin:0; font-size:13.5px; line-height:1.55; color:var(--steel); }
.moderno p span{ color:var(--ink); font-weight:600; }
.opp{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:20px 22px; margin-bottom:12px; display:grid; grid-template-columns:auto 1fr; gap:6px 18px; }
.opp__n{ grid-row:span 4; font-size:34px; font-weight:800; font-stretch:110%; color:var(--gold); line-height:1; }
.opp > :not(.opp__n){ grid-column:2; }
.opp h3{ margin:0; font-size:17px; font-weight:700; }
.opp p{ margin:0; font-size:14px; line-height:1.6; color:var(--steel); }
.opp p b{ color:var(--ink); }
.opp__meta{ display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
table.cmp.sinais td:first-child{ width:34%; } table.cmp.sinais td, table.cmp.sinais th{ text-align:center; } table.cmp.sinais td:first-child, table.cmp.sinais th:first-child{ text-align:left; }
table.cmp.buscas td:first-child{ width:24%; } table.cmp.buscas td:last-child{ width:20%; }
.limites{ font-size:13px; line-height:1.65; color:var(--steel); padding-left:18px; margin:0; }
.limites li{ margin-bottom:6px; }
.cta{ background:var(--ink); color:var(--paper); border-radius:4px; padding:26px 28px; }
.cta h3{ margin:0 0 8px; font-size:22px; font-stretch:108%; }
.cta p{ margin:0; font-size:14.5px; line-height:1.6; opacity:.85; max-width:60ch; }
:root[data-theme="dark"] .cta{ background:#1E050B; color:#F5EFE6; }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) .cta{ background:#1E050B; color:#F5EFE6; } }
@media (max-width:700px){ .placar{ grid-template-columns:1fr; } .telas{ grid-template-columns:1fr; } .telas .cel img{ width:150px; } }
@media print{ .opp, .cta, .pilar, .moderno div, .telas figure{ break-inside:avoid; } .placar{ grid-template-columns:repeat(3,1fr); } }
</style>
</head>
<body>
<div class="wrap">

  <div class="top">
    <a class="halo" href="../../"><svg viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-90 16 16)"><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--aclaris)" stroke-dasharray="86 214"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--gold)" stroke-dasharray="86 214" stroke-dashoffset="-100"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--ink)" stroke-dasharray="86 214" stroke-dashoffset="-200"/></g></svg><span>halo <small>company</small></span></a>
    <a class="pdf-link no-print" href="snapshot.pdf">Baixar em PDF ↓</a>
    <span class="date-tag">INTELLIGENCE SNAPSHOT · ${esc(an.mes)}</span>
  </div>

  <div class="brands"><span>Para</span><b>${esc(empresa.nome.toUpperCase())}</b></div>
  <h1>${an.titulo}</h1>
  <p class="lede">${an.lede}</p>
${an.negocio ? `
  <section>
    <h2>O que entendemos do negócio</h2>
    <div class="why">
      ${an.negocio.map((p) => `<div><b>${p[0]}</b><p>${p[1]}</p></div>`).join('\n      ')}
    </div>
    <p class="method">Leitura feita a partir do que o próprio site diz. Se algo estiver errado, corrigimos.</p>
  </section>
` : ''}
  <section>
    <h2>O resumo em quatro números</h2>
    <div class="kpis">
      ${an.resumo.map((k) => `<div class="kpi"><div class="kpi__label">${k.rotulo}</div><div class="kpi__flow"><span class="kpi__new">${k.valor}</span></div><div class="kpi__note">${k.nota}</div></div>`).join('\n      ')}
    </div>
    ${placar}
    <p class="method">Placar: itens objetivos, que qualquer pessoa pode conferir no site. Não é uma nota de qualidade da empresa.</p>
  </section>

  <section>
    <h2>${num()} · Como a ${esc(empresa.nome)} aparece hoje</h2>
    <p class="sub">${an.pegada.intro}</p>
    <div class="table-wrap"><table class="cmp">
      <thead><tr><th>O que olhamos</th><th>O que encontramos</th><th>Por que importa</th></tr></thead>
      <tbody>
        ${an.pegada.linhas.map((l) => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('\n        ')}
      </tbody>
    </table></div>
    <div style="height:14px"></div>
    ${duasBarras('Notas do Google para o site atual', c, pc, 'Celular', 'Computador')}
    <p class="method">${an.pegada.metodoNotas}</p>
  </section>
${an.estrutura ? `
  <section>
    <h2>${num()} · Estrutura do site e o que modernizar</h2>
    <p class="sub">${an.estrutura.intro}</p>
    <div class="telas">
      <figure>${img('atual-computador.webp', `Página inicial atual da ${empresa.nome} no computador`)}<figcaption>Site atual · computador</figcaption></figure>
      <figure class="cel">${img('atual-celular.webp', `Página inicial atual da ${empresa.nome} no celular`)}<figcaption>Celular</figcaption></figure>
    </div>
    <div class="table-wrap"><table class="cmp">
      <thead><tr><th>Por dentro</th><th>O que o código mostra</th></tr></thead>
      <tbody>
        ${fatosEstrutura.map((l) => `<tr><td>${l[0]}</td><td>${esc(l[1])}</td></tr>`).join('\n        ')}
      </tbody>
    </table></div>
    <div style="height:14px"></div>
    <div class="moderno">
      ${an.estrutura.modernizar.map((m) => `<div><b>${m[0]}</b><p><span>Hoje:</span> ${m[1]}</p><p><span>Proposta:</span> ${m[2]}</p></div>`).join('\n      ')}
    </div>
  </section>
` : ''}${an.buscas && ex?.buscas?.length ? `
  <section>
    <h2>${num()} · O que o mercado pesquisa</h2>
    <p class="sub">${an.buscas.intro}</p>
    <div class="table-wrap"><table class="cmp buscas">
      <thead><tr><th>Quando alguém digita</th><th>O Google sugere</th><th>Marcas que aparecem</th></tr></thead>
      <tbody>
        ${ex.buscas.filter((b) => b.sugestoes.length > 1).map((b) => `<tr><td>${esc(b.termo)}…</td><td>${b.sugestoes.filter((s) => s !== b.termo).slice(0, 9).map(esc).join(' · ')}</td><td>${b.marcasQueAparecem.length ? b.marcasQueAparecem.map((m) => `<span class="${m === empresa.nome.toLowerCase() ? 'yes' : 'no'}">${esc(m[0].toUpperCase() + m.slice(1))}</span>`).join(', ') : '—'}</td></tr>`).join('\n        ')}
      </tbody>
    </table></div>
    <p class="method">${an.buscas.metodo}</p>
    <div class="answer" style="margin-top:14px">${an.buscas.leitura}</div>
  </section>
` : ''}
  <section>
    <h2>${num()} · Radar competitivo</h2>
    <p class="sub">${an.radar.intro}</p>
    ${barras('Nota de velocidade no celular', 'De 0 a 100. Quanto maior, melhor.', (i) => i.celular?.desempenho, (v) => n(v), 100)}
    ${barras('Tempo até o conteúdo principal aparecer, no celular', 'Em segundos. Quanto menor, melhor. O Google considera bom até 2,5 s.', (i) => i.celular?.lcpSeg, (v) => (v == null ? 's/d' : n(v, 1) + ' s'))}
    ${barras('Nota de SEO técnico no celular', 'De 0 a 100. Mede se a página está preparada para o Google ler: título, descrição, links e textos alternativos.', (i) => i.celular?.seo, (v) => n(v), 100)}
    ${barras('Peso da página inicial', 'Em megabytes. Quanto menor, mais rápido abre em 4G.', (i) => i.celular?.pesoMB, (v) => (v == null ? 's/d' : n(v, 1) + ' MB'))}
    <div class="table-wrap"><table class="cmp sinais">
      <thead><tr><th>Sinais lidos em cada site</th>${todos.map((i) => `<th>${esc(i.nome)}</th>`).join('')}</tr></thead>
      <tbody>
        ${sinal('O endereço sem “www” abre', (s, e) => (e ? e.semWwwAbre : null))}
        ${sinal('O http leva para o https', (s, e) => (e ? e.httpRedirecionaParaHttps : null))}
        ${sinal('Imagens em formato leve', (s, e) => (levePct(e) == null ? null : levePct(e) >= 0.5))}
        ${sinal('Descrição da página para o Google', (s) => !!s.descricao)}
        ${sinal('Dados estruturados da empresa', (s) => s.dadosEstruturados.some((t) => /Organization|LocalBusiness|Corporation/.test(t)))}
        ${sinal('Perguntas e respostas marcadas (FAQ)', (s) => s.temFAQ)}
        ${sinal('Arquivo llms.txt para assistentes de IA', (s) => s.llmsTxt)}
        ${sinal('Blog com texto novo em 2026', (s, e) => (e ? (e.blog.ultimo || '').startsWith(String(new Date(coleta.coletadoEm).getFullYear())) : null))}
        ${sinal('WhatsApp na página inicial', (s) => s.whatsapp)}
      </tbody>
    </table></div>
    <p class="method">${an.radar.metodo}</p>
    <div class="answer" style="margin-top:14px">${an.radar.leitura}</div>
  </section>
${an.redes && temIg ? `
  <section>
    <h2>${num()} · Redes sociais</h2>
    <p class="sub">${an.redes.intro}</p>
    <div class="table-wrap"><table class="cmp sinais">
      <thead><tr><th>Instagram</th>${todos.map((i) => `<th>${esc(i.nome)}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Perfil</td>${todos.map((i) => `<td>${ig[i.nome]?.usuario ? '@' + esc(ig[i.nome].usuario) : sd}</td>`).join('')}</tr>
        <tr><td>Seguidores</td>${todos.map((i) => `<td>${ig[i.nome]?.seguidores ? `<b>${n(ig[i.nome].seguidores)}</b>` : sd}</td>`).join('')}</tr>
        <tr><td>Publicações</td>${todos.map((i) => `<td>${ig[i.nome]?.posts ? n(ig[i.nome].posts) : sd}</td>`).join('')}</tr>
        <tr><td>Seguidores por publicação</td>${todos.map((i) => `<td>${ig[i.nome]?.seguidores && ig[i.nome]?.posts ? n(ig[i.nome].seguidores / ig[i.nome].posts, 1) : sd}</td>`).join('')}</tr>
      </tbody>
    </table></div>
    <p class="method">${an.redes.metodo}</p>
    <div class="answer" style="margin-top:14px">${an.redes.leitura}</div>
  </section>
` : ''}
  <section>
    <h2>${num()} · Três oportunidades</h2>
    <p class="sub">${an.oportunidades.intro}</p>
    ${an.oportunidades.itens.map((o, i) => `<div class="opp"><div class="opp__n">${i + 1}</div><h3>${o.titulo}</h3><p><b>Evidência:</b> ${o.evidencia}</p><p><b>O que fazer:</b> ${o.acao}</p><div class="opp__meta"><span class="status next"><i></i>Impacto ${o.impacto}</span><span class="status done"><i></i>Esforço ${o.esforco}</span></div></div>`).join('\n    ')}
  </section>
${modelo && an.modelo ? `
  <section>
    <h2>O que já preparamos</h2>
    <p class="sub">${an.modelo.intro}</p>
    <div class="telas">
      <figure>${img('modelo-computador.webp', `Modelo da nova página inicial da ${empresa.nome} no computador`)}<figcaption>Modelo · computador</figcaption></figure>
      <figure class="cel">${img('modelo-celular.webp', `Modelo da nova página inicial da ${empresa.nome} no celular`)}<figcaption>Celular</figcaption></figure>
    </div>
    ${duasBarras('Notas do Google no celular', c, modelo.celular, 'Site atual', 'Modelo')}
    <div class="kpis">
      ${an.modelo.resumo.map((k) => `<div class="kpi"><div class="kpi__label">${k.rotulo}</div><div class="kpi__flow"><span class="kpi__old">${k.antes}</span><span class="kpi__new">${k.depois}</span></div><div class="kpi__note">${k.nota}</div></div>`).join('\n      ')}
    </div>
    <p class="method">${an.modelo.metodo}</p>
  </section>
` : ''}
  <section>
    <h2>O que só os dados de vocês respondem</h2>
    <p class="sub">${an.ponte.intro}</p>
    <div class="why">
      ${an.ponte.perguntas.map((p) => `<div><b>${p[0]}</b><p>${p[1]}</p></div>`).join('\n      ')}
    </div>
  </section>

  <section>
    <h2>Limites desta análise</h2>
    <ul class="limites">
      ${an.limites.map((l) => `<li>${l}</li>`).join('\n      ')}
    </ul>
  </section>

  <section>
    <div class="cta"><h3>${an.proximo.titulo}</h3><p>${an.proximo.texto}</p></div>
  </section>

  <footer>
    <p>Intelligence Snapshot preparado pela Halo Company para a ${esc(empresa.nome)}. Dados públicos coletados em ${data}.</p>
  </footer>

</div>
</body>
</html>
`;
await writeFile(`${pasta}/index.html`, html);

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await p.goto(pathToFileURL(resolve(pasta, 'index.html')).href, { waitUntil: 'load' });
await p.evaluate(async () => { document.querySelectorAll('img[loading]').forEach((i) => i.removeAttribute('loading')); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await document.fonts.ready; });
await p.pdf({ path: `${pasta}/snapshot.pdf`, printBackground: true, preferCSSPageSize: true });
await b.close();
console.log('gerado:', `${pasta}/index.html`, 'e snapshot.pdf |', pilares.map((x) => `${x.nome} ${x.ok}/${x.itens.length}`).join(' · '));
