// Monta a página e o PDF de uma análise (Intelligence Snapshot), em formato de apresentação: pouco texto, muito gráfico.
// Uso: node scripts/snapshot-gerar.mjs analise/minerthal
// Lê: coleta.json e lighthouse.json (números medidos), extras.json (estrutura, Instagram, buscas) e analise.json (a leitura feita por gente).
// Grava index.html e snapshot.pdf na mesma pasta ("pdf": false em analise.json deixa a análise só on-line, sem PDF). O estilo base fica em analise/estilo.css.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const pasta = process.argv[2];
const ler = async (f) => JSON.parse(await readFile(`${pasta}/${f}`, 'utf8'));
const coleta = await ler('coleta.json'), an = await ler('analise.json');
// As notas vêm de lighthouse.json quando o PageSpeed on-line está sem cota.
try { const lh = await ler('lighthouse.json'); for (const i of coleta.itens) { const m = lh.itens[i.nome]; if (m) { i.celular = i.celular ?? m.celular; i.computador = i.computador ?? m.computador; } } } catch {}
let ex = null; try { ex = await ler('extras.json'); } catch {}

const empresa = coleta.itens.find((i) => i.papel === 'empresa');
if (empresa.sinais.falhou) { console.error('A leitura do site da empresa falhou. Rode a coleta de novo antes de gerar.'); process.exit(1); }
const concorrentes = coleta.itens.filter((i) => i.papel === 'concorrente');
const modelo = coleta.itens.find((i) => i.papel === 'modelo');
const todos = [empresa, ...concorrentes];

const n = (v, casas = 0) => (v == null ? 's/d' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const quando = new Date(coleta.coletadoEm), data = quando.toLocaleDateString('pt-BR');
const img = (arq, alt) => (existsSync(`${pasta}/img/${arq}`) ? `<img src="img/${arq}" alt="${esc(alt)}" loading="lazy">` : '');
const est = (i) => ex?.estrutura?.[i.nome] ?? null;
const ig = ex?.instagram || {};
const c = empresa.celular, eE = est(empresa), fl = an.flags || {};
const levePct = (e) => { if (!e) return null; const f = e.imagensPorFormato, leve = (f.webp || 0) + (f.avif || 0), tot = leve + (f.png || 0) + (f.jpg || 0); return tot ? leve / tot : null; };
const meses = (iso) => (iso ? (quando - new Date(iso)) / 2629800000 : null);
let secao = 0; const num = () => ++secao;
const leitura = (t) => (t ? `<p class="leitura">${t}</p>` : '');

/* ---------- Gráficos ---------- */
// Uma barra por empresa. A empresa analisada vai em destaque.
function barras(titulo, nota, valor, formato, maximo) {
  const max = maximo ?? Math.max(...todos.map((i) => valor(i) ?? 0)) * 1.1;
  return `<div class="chart">
      <div class="chart__head"><div class="chart__title">${titulo}</div><div class="legend"><span>${nota}</span></div></div>
      ${todos.map((i) => { const v = valor(i); return `<div class="cmp-row${i === empresa ? ' foco' : ''}"><div class="cmp-label">${esc(i.nome)}</div><div class="bars"><div class="bar ${i === empresa ? 'new' : 'old'}"><div class="bar__track"><span class="bar__fill" style="width:${v == null ? 0 : Math.max(1.5, Math.min(100, (v / max) * 100)).toFixed(1)}%"></span></div><span class="bar__val">${formato(v, i)}</span></div></div></div>`; }).join('\n      ')}
    </div>`;
}
// Duas barras por linha (por exemplo, celular e computador).
function pares(titulo, linhas, rotuloA, rotuloB, formato = (v) => n(v), maximo = 100) {
  return `<div class="chart">
      <div class="chart__head"><div class="chart__title">${titulo}</div><div class="legend"><span class="l-old"><i></i>${rotuloA}</span><span class="l-new"><i></i>${rotuloB}</span></div></div>
      ${linhas.map(([r, a, b, foco]) => `<div class="cmp-row${foco ? ' foco' : ''}"><div class="cmp-label">${esc(r)}</div><div class="bars">
        <div class="bar old"><div class="bar__track"><span class="bar__fill" style="width:${a == null ? 0 : Math.min(100, (a / maximo) * 100)}%"></span></div><span class="bar__val">${formato(a)}</span></div>
        <div class="bar new"><div class="bar__track"><span class="bar__fill" style="width:${b == null ? 0 : Math.min(100, (b / maximo) * 100)}%"></span></div><span class="bar__val">${formato(b)}</span></div></div></div>`).join('\n      ')}
    </div>`;
}
// Rosca do placar: quantos itens atendidos.
function rosca(ok, total) {
  const r = 44, cir = 2 * Math.PI * r, parte = total ? (ok / total) * cir : 0;
  return `<svg class="rosca" viewBox="0 0 110 110" role="img" aria-label="${ok} de ${total}"><circle cx="55" cy="55" r="${r}" class="rosca__fundo"/>${ok ? `<circle cx="55" cy="55" r="${r}" class="rosca__ok" stroke-dasharray="${parte.toFixed(1)} ${(cir - parte).toFixed(1)}" transform="rotate(-90 55 55)"/>` : ''}<text x="55" y="53" class="rosca__n">${ok}</text><text x="55" y="72" class="rosca__de">de ${total}</text></svg>`;
}

/* ---------- Placar ---------- */
// Itens objetivos, atendidos ou não. O que não dá para ler de fora vem de analise.json ("flags").
const wp = (eE?.sistema || empresa.sinais.gerador || '').match(/WordPress (\d+)\.(\d+)/);
const php = (eE?.linguagem || '').match(/PHP\/(\d+)\.(\d+)/);
const pilares = [
  ['Base técnica', [
    ['Velocidade no celular ≥ 50', c.desempenho >= 50],
    ['Conteúdo em até 2,5 s', c.lcpSeg <= 2.5],
    ['Endereço sem “www” abre', eE ? eE.semWwwAbre : null],
    ['http leva para https', eE ? eE.httpRedirecionaParaHttps : null],
    ['Sistema atualizado', wp ? +wp[1] >= 6 : null],
    ['Servidor com suporte', php ? +php[1] > 8 || (+php[1] === 8 && +php[2] >= 2) : null],
    ['Imagens leves', levePct(eE) == null ? null : levePct(eE) >= 0.5]
  ]],
  ['Ser encontrado', [
    ['Título diz o que faz', fl.tituloDizOQueFaz ?? null],
    ['Descrição no Google', !!empresa.sinais.descricao],
    ['Dados da empresa', empresa.sinais.dadosEstruturados.some((t) => /Organization|LocalBusiness|Corporation/.test(t))],
    ['Perguntas e respostas', empresa.sinais.temFAQ],
    ['Arquivo para IAs', empresa.sinais.llmsTxt],
    ['Mapa do site em dia', eE?.mapaDoSite?.ultimaAtualizacao ? meses(eE.mapaDoSite.ultimaAtualizacao) <= 12 : eE ? false : null],
    ['Blog em dia', eE?.blog?.ultimo ? meses(eE.blog.ultimo) <= 3 : eE ? false : null]
  ]],
  ['Converter', [
    ['WhatsApp na página inicial', empresa.sinais.whatsapp],
    ['Formulário de contato', empresa.sinais.formulario],
    ['Contato em cada produto', fl.botaoDeContatoNoProduto ?? null],
    ['Onde comprar', fl.ondeComprar ?? null],
    ['Formulário que qualifica', fl.formularioQualifica ?? null]
  ]]
].map(([nome, itens]) => { const v = itens.filter((i) => i[1] != null); return { nome, itens: v, ok: v.filter((i) => i[1]).length }; });

// Desenha um placar. Cada item é [texto, estado]: true (atendido), false (falta) ou 'depois' (só se resolve na migração).
// A rosca conta só o que já dá para medir.
function placarHtml(lista) {
  return `<div class="placar">
      ${lista.map((p) => { const medidos = p.itens.filter((i) => i[1] !== 'depois'), ok = medidos.filter((i) => i[1] === true).length; return `<div class="pilar"><h3>${p.nome}</h3>${rosca(ok, medidos.length)}<ul class="itens">${p.itens.map(([t, e]) => `<li class="${e === 'depois' ? 'depois' : e ? 'ok' : 'falta'}">${t}</li>`).join('')}</ul></div>`; }).join('\n      ')}
    </div>`;
}

/* ---------- Sinais (matriz) ---------- */
const marca = (v) => (v == null ? '<span class="m m--sd" title="sem dado">·</span>' : v ? '<span class="m m--ok" title="Sim">✓</span>' : '<span class="m m--nao" title="Não">✕</span>');
const linhaSinal = (rotulo, f) => `<tr><td>${rotulo}</td>${todos.map((i) => `<td>${marca(i.sinais.falhou ? null : f(i.sinais, est(i), i))}</td>`).join('')}</tr>`;
const manuais = (an.sinaisManuais || []).map(([rotulo, vals]) => `<tr><td>${rotulo}</td>${todos.map((_, k) => `<td>${marca(vals[k] ?? null)}</td>`).join('')}</tr>`).join('\n        ');

/* ---------- Buscas ---------- */
const marcasConhecidas = [...todos.map((i) => i.nome.toLowerCase()), ...(an.outrasMarcas || [])];
const destaca = (s) => { let t = esc(s); for (const m of marcasConhecidas) t = t.replace(new RegExp(`\\b${m}\\b`, 'i'), (x) => `<mark class="${m === empresa.nome.toLowerCase() ? 'nossa' : ''}">${x}</mark>`); return t; };
const buscas = (ex?.buscas || []).filter((b) => !an.buscasMostrar || an.buscasMostrar.includes(b.termo));

const temIg = todos.some((i) => ig[i.nome]?.seguidores);
const mesAno = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

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
section{ margin-bottom:60px; }
.sub{ margin-bottom:16px; }
.leitura{ margin:14px 0 0; padding:14px 18px; border-left:4px solid var(--gold); background:var(--white); border-radius:3px; font-size:15px; line-height:1.55; color:var(--steel); }
.leitura b{ color:var(--ink); }
.cmp-row.foco .cmp-label{ color:var(--gold); }
.chart .legend span:only-child{ text-transform:none; letter-spacing:0; font-size:11.5px; }
.linha-negocio{ display:flex; flex-wrap:wrap; gap:10px; margin:-18px 0 44px; }
.linha-negocio span{ background:var(--white); border:1px solid var(--line); border-radius:999px; padding:7px 14px; font-size:13px; color:var(--steel); }
.linha-negocio b{ color:var(--ink); margin-right:6px; }
.placar{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.pilar{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:18px; text-align:center; }
.pilar h3{ margin:0 0 6px; font-size:15px; }
.rosca{ width:118px; height:118px; display:block; margin:0 auto 10px; }
.rosca__fundo{ fill:none; stroke:var(--track); stroke-width:11; }
.rosca__ok{ fill:none; stroke:var(--gold); stroke-width:11; stroke-linecap:round; }
.rosca__n{ font-size:30px; font-weight:800; text-anchor:middle; fill:var(--ink); font-family:var(--font-display); }
.rosca__de{ font-size:11px; font-weight:600; text-anchor:middle; fill:var(--steel); font-family:var(--font-display); }
.itens{ list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; justify-content:center; gap:5px; }
.itens li{ font-size:11.5px; line-height:1.2; padding:5px 9px; border-radius:999px; }
.itens li.ok{ background:var(--ok-bg); color:var(--ok); font-weight:600; }
.itens li.falta{ background:var(--paper-2); color:var(--steel); }
.itens li::before{ font-weight:800; margin-right:5px; }
.itens li.ok::before{ content:"✓"; }
.itens li.falta::before{ content:"✕"; color:var(--bad); }
.itens li.depois{ border:1px dashed var(--steel-light); color:var(--steel); }
.itens li.depois::before{ content:"→"; color:var(--steel); }
.legenda-placar{ display:flex; flex-wrap:wrap; gap:6px 16px; margin:10px 0 0; font-size:12px; color:var(--steel); }
.legenda-placar b{ font-weight:800; margin-right:4px; }
h3.sub-titulo{ font-size:15px; margin:22px 0 10px; }
.kpis{ margin-top:12px; }
.telas{ display:grid; grid-template-columns:1fr auto; gap:12px; align-items:start; margin-bottom:14px; }
.telas figure{ margin:0; }
.telas img{ display:block; width:100%; height:auto; border:1px solid var(--line); border-radius:3px; background:var(--white); }
.telas .cel img{ width:168px; }
.telas figcaption{ font-size:11px; color:var(--steel-light); margin-top:6px; font-stretch:84%; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
.achados{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.achado{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:14px 16px 14px 44px; position:relative; }
.achado::before{ content:"✕"; position:absolute; left:16px; top:13px; font-weight:800; color:var(--bad); }
.achado b{ display:block; font-size:14.5px; margin-bottom:2px; }
.achado span{ font-size:13px; line-height:1.45; color:var(--steel); }
table.cmp.troca td{ width:auto; font-weight:400; } table.cmp.troca td:first-child{ width:18%; font-weight:700; } table.cmp.troca td:nth-child(2){ color:var(--steel); } table.cmp.troca td:last-child{ font-weight:600; }
.dupla{ display:grid; grid-template-columns:1fr 1fr; gap:12px; } .dupla .chart{ margin-bottom:0; }
table.cmp.matriz{ min-width:0; } table.cmp.matriz td, table.cmp.matriz th{ text-align:center; padding:9px 10px; } table.cmp.matriz td:first-child, table.cmp.matriz th:first-child{ text-align:left; width:46%; font-weight:600; }
.m{ display:inline-grid; place-items:center; width:24px; height:24px; border-radius:50%; font-size:13px; font-weight:800; }
.m--ok{ background:var(--ok-bg); color:var(--ok); } .m--nao{ background:var(--paper-2); color:var(--bad); } .m--sd{ color:var(--steel-light); }
.buscas{ display:grid; gap:10px; }
.busca{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:12px 16px; display:grid; grid-template-columns:200px 1fr; gap:14px; align-items:baseline; }
.busca b{ font-size:14px; }
.busca div{ display:flex; flex-wrap:wrap; gap:5px; }
.busca span{ font-size:12px; padding:4px 9px; border-radius:999px; background:var(--paper-2); color:var(--steel); }
.busca mark{ background:none; color:var(--bad); font-weight:700; } .busca mark.nossa{ color:var(--ok); }
.opps{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.opp{ background:var(--white); border:1px solid var(--line); border-top:4px solid var(--gold); border-radius:3px; padding:18px; display:flex; flex-direction:column; gap:8px; }
.opp__n{ font-size:30px; font-weight:800; font-stretch:110%; color:var(--gold); line-height:1; }
.opp h3{ margin:0; font-size:16.5px; line-height:1.25; }
.opp p{ margin:0; font-size:13.5px; line-height:1.5; color:var(--steel); flex:1; }
.opp__meta{ display:flex; flex-wrap:wrap; gap:6px; }
.perguntas{ list-style:none; margin:0; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.perguntas li{ background:var(--white); border:1px solid var(--line); border-radius:3px; padding:14px 16px; font-size:14.5px; font-weight:600; }
.metodo{ font-size:12.5px; line-height:1.6; color:var(--steel); }
.metodo summary{ cursor:pointer; font-weight:700; color:var(--ink); font-size:13px; }
.metodo ul{ padding-left:18px; margin:10px 0 0; } .metodo li{ margin-bottom:5px; }
.cta{ background:var(--ink); color:var(--paper); border-radius:4px; padding:26px 28px; }
.cta h3{ margin:0 0 8px; font-size:22px; font-stretch:108%; }
.cta p{ margin:0; font-size:14.5px; line-height:1.6; opacity:.85; max-width:60ch; }
:root[data-theme="dark"] .cta{ background:#1E050B; color:#F5EFE6; }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) .cta{ background:#1E050B; color:#F5EFE6; } }
@media (max-width:700px){ .placar, .opps, .achados, .dupla, .perguntas{ grid-template-columns:1fr; } .telas{ grid-template-columns:1fr; } .telas .cel img{ width:150px; } .busca{ grid-template-columns:1fr; gap:8px; } }
@media print{ section{ margin-bottom:34px; } .opp, .cta, .pilar, .achado, .telas figure, .chart, .busca, .perguntas li{ break-inside:avoid; } .placar, .opps{ grid-template-columns:repeat(3,1fr); } .achados, .dupla, .perguntas{ grid-template-columns:1fr 1fr; } h2{ break-after:avoid; } }
</style>
</head>
<body>
<div class="wrap">

  <div class="top">
    <a class="halo" href="../../"><svg viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-90 16 16)"><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--aclaris)" stroke-dasharray="86 214"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--gold)" stroke-dasharray="86 214" stroke-dashoffset="-100"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--ink)" stroke-dasharray="86 214" stroke-dashoffset="-200"/></g></svg><span>halo <small>company</small></span></a>
${an.pdf === false ? '' : `    <a class="pdf-link no-print" href="snapshot.pdf">Baixar em PDF ↓</a>
`}    <span class="date-tag">INTELLIGENCE SNAPSHOT · ${esc(an.mes)}</span>
  </div>

  <div class="brands"><span>Para</span><b>${esc(empresa.nome.toUpperCase())}</b></div>
  <h1>${an.titulo}</h1>
  <p class="lede">${an.lede}</p>
  ${an.negocio ? `<div class="linha-negocio">${an.negocio.map((p) => `<span><b>${p[0]}</b>${p[1]}</span>`).join('')}</div>` : ''}

  <section>
    <h2>O placar</h2>
    ${placarHtml(pilares)}
    <div class="kpis">
      ${an.resumo.map((k) => `<div class="kpi"><div class="kpi__label">${k.rotulo}</div><div class="kpi__flow"><span class="kpi__new">${k.valor}</span></div><div class="kpi__note">${k.nota}</div></div>`).join('\n      ')}
    </div>
  </section>

  <section>
    <h2>${num()} · Como a ${esc(empresa.nome)} aparece hoje</h2>
    <div class="telas">
      <figure>${img('atual-computador.webp', `Página inicial atual da ${empresa.nome} no computador`)}<figcaption>Site atual · computador</figcaption></figure>
      <figure class="cel">${img('atual-celular.webp', `Página inicial atual da ${empresa.nome} no celular`)}<figcaption>Celular</figcaption></figure>
    </div>
    <div class="achados">
      ${an.achados.map((a) => `<div class="achado"><b>${a[0]}</b><span>${a[1]}</span></div>`).join('\n      ')}
    </div>
  </section>

  <section>
    <h2>${num()} · Velocidade</h2>
    <div class="dupla">
      ${pares('Nota do Google, de 0 a 100', todos.map((i) => [i.nome, i.celular?.desempenho ?? null, i.computador?.desempenho ?? null, i === empresa]), 'Celular', 'Computador')}
      ${barras('Até o conteúdo aparecer', 'No celular. Bom: até 2,5 s', (i) => i.celular?.lcpSeg, (v) => (v == null ? 's/d' : n(v, 1) + ' s'))}
    </div>
    ${leitura(an.leituras?.velocidade)}
  </section>

  <section>
    <h2>${num()} · Conteúdo e redes</h2>
    <div class="dupla">
      ${barras('Último texto publicado', 'Meses sem publicar', (i) => { const m = meses(est(i)?.blog?.ultimo); return m == null ? null : Math.max(m, 0.2); }, (v, i) => { const u = est(i)?.blog?.ultimo; return u ? mesAno(u) : 's/d'; })}
      ${temIg ? barras('Seguidores no Instagram', 'Número público do perfil', (i) => ig[i.nome]?.seguidores ?? null, (v) => (v == null ? 's/d' : v >= 10000 ? n(v / 1000, 0) + ' mil' : n(v))) : ''}
    </div>
    ${leitura(an.leituras?.conteudo)}
  </section>

  <section>
    <h2>${num()} · O que o Google e as IAs leem</h2>
    <div class="table-wrap"><table class="cmp matriz">
      <thead><tr><th></th>${todos.map((i) => `<th>${esc(i.nome)}</th>`).join('')}</tr></thead>
      <tbody>
        ${manuais}
        ${linhaSinal('Descrição da página', (s) => !!s.descricao)}
        ${linhaSinal('Dados estruturados da empresa', (s) => s.dadosEstruturados.some((t) => /Organization|LocalBusiness|Corporation/.test(t)))}
        ${linhaSinal('Perguntas e respostas marcadas', (s) => s.temFAQ)}
        ${linhaSinal('Arquivo para assistentes de IA', (s) => s.llmsTxt)}
        ${linhaSinal('Endereço sem “www” abre', (s, e) => (e ? e.semWwwAbre : null))}
        ${linhaSinal('http leva para https', (s, e) => (e ? e.httpRedirecionaParaHttps : null))}
        ${linhaSinal('Imagens em formato leve', (s, e) => (levePct(e) == null ? null : levePct(e) >= 0.5))}
        ${linhaSinal(`Texto novo em ${quando.getFullYear()}`, (s, e) => (e ? (e.blog?.ultimo || '').startsWith(String(quando.getFullYear())) : null))}
      </tbody>
    </table></div>
    ${leitura(an.leituras?.sinais)}
  </section>
${buscas.length ? `
  <section>
    <h2>${num()} · O que o mercado pesquisa</h2>
    <div class="buscas">
      ${buscas.map((b) => `<div class="busca"><b>${esc(b.termo)}…</b><div>${b.sugestoes.filter((s) => s !== b.termo).slice(0, 9).map((s) => `<span>${destaca(s)}</span>`).join('')}</div></div>`).join('\n      ')}
    </div>
    ${leitura(an.leituras?.buscas)}
  </section>
` : ''}
  <section>
    <h2>${num()} · O que modernizar</h2>
    <div class="table-wrap"><table class="cmp troca">
      <thead><tr><th></th><th>Hoje</th><th>Proposta</th></tr></thead>
      <tbody>
        ${an.modernizar.map((m) => `<tr><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join('\n        ')}
      </tbody>
    </table></div>
  </section>

  <section>
    <h2>${num()} · Três oportunidades</h2>
    <div class="opps">
      ${an.oportunidades.map((o, i) => `<div class="opp"><div class="opp__n">${i + 1}</div><h3>${o.titulo}</h3><p>${o.fazer}</p><div class="opp__meta"><span class="status next"><i></i>Impacto ${o.impacto}</span><span class="status done"><i></i>Esforço ${o.esforco}</span></div></div>`).join('\n      ')}
    </div>
  </section>
${modelo && an.modelo ? `
  <section>
    <h2>${num()} · O que já preparamos</h2>
    <p class="sub">${an.modelo.intro}</p>
    <div class="telas">
      <figure>${img('modelo-computador.webp', `Modelo da nova página inicial da ${empresa.nome} no computador`)}<figcaption>Modelo · computador</figcaption></figure>
      <figure class="cel">${img('modelo-celular.webp', `Modelo da nova página inicial da ${empresa.nome} no celular`)}<figcaption>Celular</figcaption></figure>
    </div>
    ${an.modelo.placar ? `<h3 class="sub-titulo">O mesmo placar, com o modelo</h3>
    ${placarHtml(an.modelo.placar)}
    <p class="legenda-placar"><span><b style="color:var(--ok)">✓</b>atendido</span><span><b style="color:var(--bad)">✕</b>falta</span><span><b>→</b>resolvido na migração para o servidor de vocês</span></p>
    ${leitura(an.modelo.leitura)}
    <div style="height:14px"></div>` : ''}
    ${pares('Notas do Google no celular', [['Velocidade', c.desempenho, modelo.celular.desempenho], ['Acessibilidade', c.acessibilidade, modelo.celular.acessibilidade], ['Boas práticas', c.boasPraticas, modelo.celular.boasPraticas], ['SEO técnico', c.seo, modelo.celular.seo]], 'Site atual', 'Modelo')}
    <div class="kpis">
      ${an.modelo.resumo.map((k) => `<div class="kpi"><div class="kpi__label">${k.rotulo}</div><div class="kpi__flow"><span class="kpi__old">${k.antes}</span><span class="kpi__new">${k.depois}</span></div><div class="kpi__note">${k.nota}</div></div>`).join('\n      ')}
    </div>
  </section>
` : ''}
  <section>
    <h2>O que só os dados de vocês respondem</h2>
    <ul class="perguntas">
      ${an.perguntas.map((p) => `<li>${p}</li>`).join('\n      ')}
    </ul>
  </section>

  <section>
    <div class="cta"><h3>${an.proximo.titulo}</h3><p>${an.proximo.texto}</p></div>
  </section>

  <section>
    <details class="metodo">
      <summary>Como medimos e os limites desta análise</summary>
      <ul>
        ${an.metodo.map((l) => `<li>${l}</li>`).join('\n        ')}
      </ul>
    </details>
  </section>

  <footer>
    <p>Intelligence Snapshot preparado pela Halo Company para a ${esc(empresa.nome)}. Dados públicos coletados em ${data}.</p>
  </footer>

</div>
</body>
</html>
`;
await writeFile(`${pasta}/index.html`, html);

if (an.pdf === false) { await rm(`${pasta}/snapshot.pdf`, { force: true }); console.log('gerado:', `${pasta}/index.html`, '(sem PDF) |', pilares.map((x) => `${x.nome} ${x.ok}/${x.itens.length}`).join(' · ')); process.exit(0); }

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await p.goto(pathToFileURL(resolve(pasta, 'index.html')).href, { waitUntil: 'load' });
// No PDF, as imagens carregam todas e o bloco de método fica aberto.
await p.evaluate(async () => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); document.querySelectorAll('img[loading]').forEach((i) => i.removeAttribute('loading')); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await document.fonts.ready; });
await p.pdf({ path: `${pasta}/snapshot.pdf`, printBackground: true, preferCSSPageSize: true });
await b.close();
console.log('gerado:', `${pasta}/index.html`, 'e snapshot.pdf |', pilares.map((x) => `${x.nome} ${x.ok}/${x.itens.length}`).join(' · '));
