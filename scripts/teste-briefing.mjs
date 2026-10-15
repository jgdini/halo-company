// Testa o briefing de ponta a ponta: validação, desvio site/LP, rascunho salvo, revisão e envio.
// Uso: node scripts/teste-briefing.mjs [url] (servidor "trama" na porta 5610 rodando)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] || 'http://localhost:5610/briefing/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844 });
const erros = []; p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
let recebido = null;
await p.setRequestInterception(true);
p.on('request', (r) => { if (r.url().startsWith('https://teste.invalid/')) { recebido = JSON.parse(r.postData()); r.respond({ status: 200, body: '{"ok":true}' }); } else r.continue(); });
await p.goto(URL, { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); ENVIO = 'https://teste.invalid/exec'; });
const ok = (cond, msg) => console.log(cond ? '✓' : '✕', msg);
const titulo = () => p.$eval('#etapa h1, #etapa h2', (e) => e.textContent);
const avancar = async () => { await p.click('#avancar'); await new Promise((r) => setTimeout(r, 150)); };

await avancar();
ok((await titulo()) === 'Contato e decisão', 'abre a etapa 1');
await avancar();
ok(await p.$eval('[data-campo="empresa"]', (e) => e.classList.contains('invalido')), 'bloqueia sem os obrigatórios');
await p.type('#c-empresa', 'Empresa Teste'); await p.type('#c-nome', 'Ana Souza'); await p.type('#c-whatsapp', '11999990000'); await p.type('#c-email', 'ana@');
await p.click('input[name="tipoProjeto"][value="Landing page"]');
await avancar();
ok(await p.$eval('[data-campo="email"]', (e) => e.classList.contains('invalido')), 'recusa e-mail inválido');
await p.type('#c-email', 'teste.com.br'); await avancar();
ok((await titulo()) === 'O negócio', 'avança com tudo certo');

// Rascunho: recarrega e continua de onde parou.
await p.reload({ waitUntil: 'networkidle0' }); await p.evaluate(() => { ENVIO = 'https://teste.invalid/exec'; });
ok((await p.$eval('#avancar', (e) => e.textContent)) === 'Continuar de onde parei' || (await titulo()) === 'O negócio', 'rascunho volta depois de recarregar');
if ((await titulo()) !== 'O negócio') await avancar();
await p.type('#c-oQueVende', 'Consultoria'); await avancar();

const vistas = [];
for (let i = 0; i < 12; i++) {
  const t = await titulo(); vistas.push(t);
  if (t === 'Tudo certo por aqui?') break;
  if (t === 'Objetivo') await p.click('input[name="objetivo"][value="Gerar contatos"]');
  if (t === 'A campanha') await p.type('#c-oferta', 'Diagnóstico gratuito');
  await avancar();
}
ok(vistas.includes('A campanha') && !vistas.includes('Conteúdo do site'), 'landing page pula o conteúdo do site e mostra a campanha');
ok(vistas.at(-1) === 'Tudo certo por aqui?', 'chega na revisão');
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
ok(sw <= 390, `sem rolagem lateral no celular (${sw}px)`);
await p.click('#avancar'); await new Promise((r) => setTimeout(r, 600));
ok(recebido && recebido.empresa === 'Empresa Teste' && recebido.secoes.length === 9, `envio chegou com ${recebido?.secoes.length} seções`);
ok((await titulo()).startsWith('Obrigado'), 'mostra a tela de obrigado');
ok(erros.length === 0, `console sem erros ${erros.join(' | ')}`);
await p.screenshot({ path: process.env.FOTO || 'briefing-teste.png' });
await b.close();
