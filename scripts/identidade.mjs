// Gera os fundos de post (PNG) e o PDF da identidade visual da Halo Company.
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pasta = raiz + 'identidade/';
const fundos = pasta + 'fundos/';
await mkdir(fundos, { recursive: true });

const BORDO = '#3A0D18', BORDO_FUNDO = '#2A0811', BORDO_CLARO = '#5A1A2C';
const OFF = '#F5EFE6', OFF_2 = '#EADFD3', CEREJA = '#E0506F', CHAMP = '#E7C493', PEROLA = '#F8F3EB';
const BEGE = '#B9825A';

// Três anéis formando o símbolo do logo (mesma geometria do site).
function anel(cx, cy, r, cores, lw) {
  const c = 2 * Math.PI * r, seg = c * 0.286, gap = c * 0.714;
  return cores.map((cor, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-dasharray="${seg} ${gap}" stroke-dashoffset="${-i * c / 3}" transform="rotate(-90 ${cx} ${cy})"/>`).join('');
}

// Três fios que se trançam, como na página.
function fios(w, h, cores, { lw = 12, amp = 0.1, ph = 0 } = {}) {
  const cy = h / 2, A = h * amp, k = (2 * Math.PI) / (w * 0.55);
  return cores.map((cor, i) => {
    const off = (i * 2 * Math.PI) / 3, pts = [];
    for (let x = -20; x <= w + 20; x += 6) pts.push(x.toFixed(1) + ',' + (cy + A * Math.sin(k * x + ph + off)).toFixed(1));
    const d = 'M' + pts.join(' L');
    return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${lw * 3}" stroke-linecap="round" opacity="0.45" filter="url(#brilho)"/><path d="${d}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-linecap="round"/>`;
  }).join('');
}

const blob = (x, y, r, cor, op) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}" opacity="${op}" filter="url(#nuvem)"/>`;

function svg(w, h, [topo, base], corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${topo}"/><stop offset="1" stop-color="${base}"/></radialGradient>
<filter id="brilho" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="nuvem" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="90"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>${corpo}</svg>`;
}

const lista = [
  ['feed-bordo-fios.png', 1080, 1350, [BORDO_CLARO, BORDO_FUNDO], `${blob(900, 300, 380, CEREJA, 0.28)}${fios(1080, 1350, [CEREJA, CHAMP, PEROLA])}`],
  ['feed-offwhite-fios.png', 1080, 1350, [OFF, OFF_2], fios(1080, 1350, [CEREJA, BORDO, BEGE])],
  ['quadrado-glow.png', 1080, 1080, [BORDO_CLARO, BORDO_FUNDO], `${blob(860, 200, 300, CEREJA, 0.35)}${blob(120, 980, 220, CHAMP, 0.12)}${anel(160, 900, 70, [CEREJA, CHAMP, PEROLA], 9)}`],
  ['stories-halo.png', 1080, 1920, [BORDO_CLARO, BORDO_FUNDO], `${blob(540, 960, 520, CEREJA, 0.22)}${anel(540, 960, 330, [CEREJA, CHAMP, PEROLA], 34)}`],
  ['quadrado-offwhite-halo.png', 1080, 1080, [OFF, OFF_2], anel(540, 540, 300, [CEREJA, BORDO, BEGE], 30)]
];
for (const [nome, w, h, cores, corpo] of lista) {
  await sharp(Buffer.from(svg(w, h, cores, corpo))).png().toFile(fundos + nome);
}

// ---------- PDF ----------
const logo = (cor, tam, nome = true) => `<div class="logo" style="color:${cor};font-size:${tam}px"><svg viewBox="0 0 32 32" style="width:${tam * 0.85}px;height:${tam * 0.85}px">${anel(16, 16, 11, [CEREJA, CHAMP, PEROLA], 3)}</svg>${nome ? '<span>halo<small>company</small></span>' : ''}</div>`;

const css = `
@font-face { font-family: "Archivo"; src: url("../assets/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "Newsreader"; src: url("../assets/fonts/newsreader-italic.woff2") format("woff2"); font-style: italic; font-weight: 400; }
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Archivo", sans-serif; color: #F5EFE6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pag { width: 297mm; height: 210mm; position: relative; overflow: hidden; padding: 16mm 20mm; page-break-after: always; background: #3A0D18; }
.pag.claro { background: #F5EFE6; color: #3A0D18; }
.rot { font-size: 9pt; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; opacity: .7; }
h1 { font-size: 38pt; font-weight: 750; font-stretch: 110%; letter-spacing: -.03em; line-height: 1; margin: 8px 0 14px; }
.it { font-family: "Newsreader", serif; font-style: italic; font-weight: 400; color: #E7C493; letter-spacing: -.01em; }
.claro .it { color: #B8394F; }
p { font-size: 11pt; line-height: 1.55; max-width: 165mm; margin: 0; }
.logo { display: inline-flex; align-items: center; gap: .25em; font-weight: 750; font-stretch: 118%; letter-spacing: -.03em; line-height: 1; }
.logo svg { display: block; flex: none; }
.logo small { margin-left: .4em; font-size: .46em; font-weight: 600; font-stretch: 82%; letter-spacing: .24em; text-transform: uppercase; opacity: .7; }
.grade { display: flex; gap: 6mm; margin-top: 8mm; }
.cartao { flex: 1; border-radius: 4mm; padding: 6mm; }
.sw { height: 46mm; border-radius: 4mm; padding: 5mm; display: flex; flex-direction: column; justify-content: flex-end; font-size: 9pt; line-height: 1.5; }
.sw b { font-size: 13pt; font-weight: 700; display: block; margin-bottom: 2mm; }
.linhas { list-style: none; padding: 0; margin: 6mm 0 0; font-size: 10.5pt; line-height: 1.5; }
.linhas li { padding: 2.5mm 0; border-bottom: 1px solid rgba(245,239,230,.18); }
.claro .linhas li { border-color: rgba(58,13,24,.18); }
.duas { display: flex; gap: 10mm; margin-top: 8mm; }
.duas > div { flex: 1; }
.duas h3 { font-size: 12pt; margin: 0 0 4mm; font-weight: 700; }
.amostra { position: relative; border-radius: 3mm; overflow: hidden; background-size: cover; background-position: center; }
.amostra .txt { position: absolute; left: 5mm; right: 5mm; bottom: 6mm; font-size: 13pt; font-weight: 700; font-stretch: 108%; line-height: 1.1; letter-spacing: -.02em; }
.amostra .txt .it { font-size: 1.05em; }
.legenda { font-size: 8.5pt; margin-top: 2.5mm; opacity: .75; }
`;

const paginas = `
<section class="pag" style="background-image:url('fundos/feed-bordo-fios.png');background-size:cover;background-position:center">
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(58,13,24,.92) 0%,rgba(58,13,24,.55) 55%,rgba(58,13,24,.2) 100%)"></div>
  <div style="position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between">
    <div class="rot">Guia de marca · 2026</div>
    <div>
      ${logo('#F5EFE6', 110)}
      <h1 style="font-size:54pt;margin-top:14mm">Identidade <span class="it">visual</span></h1>
      <p>Cores, logo, tipografia e direção para fotos, roupas e posts.</p>
    </div>
    <div class="rot">Amanda Takahashi · Bianca Fortes · João Dini</div>
  </div>
</section>

<section class="pag">
  <div class="rot">01 · O nome</div>
  <h1>Halo, o <span class="it">efeito</span> que a gente cria.</h1>
  <p>Em 1920, o psicólogo Edward Thorndike mostrou que uma boa impressão em um ponto se espalha para todo o resto. Uma autoridade falando da Amanda, um vídeo bem feito e um site rápido fazem o cliente confiar na empresa antes da primeira conversa.</p>
  <div class="grade">
    <div class="cartao" style="background:#4A1424"><div style="width:16mm;height:16mm;border-radius:50%;background:#E0506F;margin-bottom:6mm"></div><b style="font-size:13pt">Amanda Takahashi</b><p style="font-size:10pt;margin-top:2mm">Estratégia e growth. A cereja é a cor da estratégia.</p></div>
    <div class="cartao" style="background:#4A1424"><div style="width:16mm;height:16mm;border-radius:50%;background:#E7C493;margin-bottom:6mm"></div><b style="font-size:13pt">Bianca Fortes</b><p style="font-size:10pt;margin-top:2mm">Arte, tráfego e receita. O champanhe é a cor da imagem.</p></div>
    <div class="cartao" style="background:#4A1424"><div style="width:16mm;height:16mm;border-radius:50%;background:#F8F3EB;margin-bottom:6mm"></div><b style="font-size:13pt">João Dini</b><p style="font-size:10pt;margin-top:2mm">Site, tecnologia e automações. A pérola é a cor do site.</p></div>
  </div>
</section>

<section class="pag claro">
  <div class="rot">02 · Logo</div>
  <h1>O símbolo são <span class="it">três fios</span>.</h1>
  <div class="grade" style="margin-top:6mm">
    <div class="cartao" style="background:#3A0D18;height:70mm;display:flex;align-items:center;justify-content:center">${logo('#F5EFE6', 46)}</div>
    <div class="cartao" style="background:#F5EFE6;border:1px solid rgba(58,13,24,.2);height:70mm;display:flex;align-items:center;justify-content:center">${logo('#3A0D18', 46)}</div>
  </div>
  <div class="duas">
    <div><h3>Espaço livre</h3><p style="font-size:10pt">Deixe em volta do símbolo um espaço igual à altura de um dos anéis.</p></div>
    <div><h3>Tamanho mínimo</h3><p style="font-size:10pt">24 px na tela e 8 mm impresso. Abaixo disso, use só o símbolo.</p></div>
    <div><h3>Não faça</h3><p style="font-size:10pt">Não estique, não gire o logo, não troque as cores dos anéis e não coloque sobre fundo cereja.</p></div>
  </div>
</section>

<section class="pag">
  <div class="rot">03 · Cores</div>
  <h1>Bordô e <span class="it">off-white</span>.</h1>
  <div class="grade" style="margin-top:6mm">
    <div class="sw" style="flex:2.2;background:#3A0D18;border:1px solid rgba(245,239,230,.2)"><b>Bordô</b>HEX #3A0D18<br>RGB 58 13 24<br>Base de tudo</div>
    <div class="sw" style="flex:1.6;background:#F5EFE6;color:#3A0D18"><b>Off-white</b>HEX #F5EFE6<br>RGB 245 239 230<br>Texto e fundo claro</div>
    <div class="sw" style="flex:1;background:#E0506F;color:#3A0D18"><b>Cereja</b>HEX #E0506F<br>RGB 224 80 111<br>Estratégia</div>
    <div class="sw" style="flex:1;background:#E7C493;color:#3A0D18"><b>Champanhe</b>HEX #E7C493<br>RGB 231 196 147<br>Imagem</div>
    <div class="sw" style="flex:1;background:#F8F3EB;color:#3A0D18"><b>Pérola</b>HEX #F8F3EB<br>RGB 248 243 235<br>Site</div>
  </div>
  <ul class="linhas">
    <li>Proporção: cerca de 60% bordô, 25% off-white e 15% destaques (cereja, champanhe, pérola).</li>
    <li>Sobre fundo claro, use bordô e cereja. O champanhe fica fraco e a pérola some.</li>
    <li>Sobre bordô, o texto em off-white tem leitura alta.</li>
  </ul>
</section>

<section class="pag claro">
  <div class="rot">04 · Tipografia</div>
  <h1>Archivo e <span class="it">Newsreader</span>.</h1>
  <div class="duas" style="margin-top:4mm">
    <div>
      <h3>Archivo (títulos e textos)</h3>
      <div style="font-size:30pt;font-weight:750;font-stretch:110%;letter-spacing:-.03em;line-height:1">Toda marca começa</div>
      <p style="margin-top:4mm;font-size:11pt">Texto corrido com 11 pt ou mais, entrelinha de 1,5. Use peso 400 no corpo e 700 nos títulos.</p>
    </div>
    <div>
      <h3>Newsreader Itálico (destaque)</h3>
      <div style="font-size:30pt;font-family:Newsreader;font-style:italic;line-height:1" class="it">com uma faísca.</div>
      <p style="margin-top:4mm;font-size:11pt">Uma palavra por frase, em itálico e na cor de destaque. Nunca mais de uma por título.</p>
    </div>
  </div>
  <ul class="linhas" style="margin-top:8mm">
    <li>Títulos: Archivo 700, com largura um pouco maior (110%), entrelinha perto de 1.</li>
    <li>Rótulos pequenos: Archivo 600, em maiúsculas, com espaçamento largo entre as letras.</li>
  </ul>
</section>

<section class="pag">
  <div class="rot">05 · Movimento</div>
  <h1>Os fios se <span class="it">trançam</span>.</h1>
  <ul class="linhas" style="margin-top:6mm;max-width:150mm">
    <li><b>Fios trançados:</b> os três fios se cruzam devagar. Mostram os três sócios trabalhando juntos.</li>
    <li><b>Halo girando:</b> o anel gira devagar atrás do vídeo principal. Nunca mais rápido que isso.</li>
    <li><b>Luz que avança com o scroll:</b> cada etapa acende uma parte do caminho. Use uma ideia por cena.</li>
    <li><b>Quem não quer movimento:</b> a imagem parada tem que funcionar igual. Nenhuma informação depende só da animação.</li>
  </ul>
  <p style="margin-top:6mm;font-size:10pt;opacity:.8">Em post estático, use um fio ou o halo como traço de separação, no lugar de ícones.</p>
</section>

<section class="pag claro">
  <div class="rot">06 · Fotos, roupas e cenário</div>
  <h1>Quem aparece <span class="it">usa a paleta</span>.</h1>
  <div class="duas" style="margin-top:4mm">
    <div>
      <h3>Usar</h3>
      <ul class="linhas" style="margin-top:0">
        <li>Bordô, vinho, off-white, creme, bege e nude</li>
        <li>Champanhe e dourado em acessórios discretos</li>
        <li>Cada sócio com a cor do seu fio (cereja, champanhe ou pérola) em algum detalhe</li>
        <li>Luz quente e suave, com um brilho na borda do rosto</li>
      </ul>
    </div>
    <div>
      <h3>Evitar</h3>
      <ul class="linhas" style="margin-top:0">
        <li>Azul, verde-neon e preto puro</li>
        <li>Estampas muito cheias ou logos de outras marcas</li>
        <li>Fundo bagunçado: prefira liso, bordô ou off-white</li>
        <li>Filtro pesado de cor (tudo amarelado ou azulado)</li>
      </ul>
    </div>
  </div>
  <p style="margin-top:6mm;font-size:10pt;opacity:.8">Sugestão para as fotos: fundo bordô liso, luz de um lado só, e a pessoa olhando para a câmera ou para o lado da escrita.</p>
</section>

<section class="pag">
  <div class="rot">07 · Posts</div>
  <h1>Fundos <span class="it">prontos</span>.</h1>
  <div style="display:flex;gap:6mm;align-items:flex-end;margin-top:8mm">
    <div style="width:60mm"><div class="amostra" style="height:75mm;background-image:url('fundos/feed-bordo-fios.png')"><div class="txt">O ritmo cria <span class="it">audiência</span>.</div></div><div class="legenda">Feed 4:5 · bordô com fios</div></div>
    <div style="width:75mm"><div class="amostra" style="height:75mm;background-image:url('fundos/quadrado-glow.png')"><div class="txt">Tudo se <span class="it">conecta</span>.</div></div><div class="legenda">Quadrado · bordô com luz</div></div>
    <div style="width:42mm"><div class="amostra" style="height:75mm;background-image:url('fundos/stories-halo.png')"><div class="txt" style="bottom:auto;top:30mm;text-align:center">Do post ao <span class="it">cliente</span>.</div></div><div class="legenda">Stories 9:16 · halo</div></div>
    <div style="width:60mm"><div class="amostra" style="height:75mm;background-image:url('fundos/feed-offwhite-fios.png');color:#3A0D18"><div class="txt" style="color:#3A0D18">Post que <span class="it" style="color:#B8394F">vende</span> começa antes do clique.</div></div><div class="legenda">Feed 4:5 · off-white com fios</div></div>
  </div>
  <p style="margin-top:8mm;font-size:10pt">Títulos curtos, uma palavra em itálico e o @ no rodapé (@halocompany é provisório). Os PNG estão na pasta fundos/.</p>
</section>
`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Halo Company · Identidade visual</title><style>${css}</style></head><body>${paginas}</body></html>`;
await writeFile(pasta + 'identidade.html', html);

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(pasta + 'identidade.html').href, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({ path: pasta + 'Halo-Company-Identidade-Visual.pdf', width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
await navegador.close();
console.log('ok');
