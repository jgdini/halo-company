// Porta de entrada do Intelligence Snapshot. Junta os scripts snapshot-*.mjs num fluxo só.
// Uso (dentro de trama/):
//   node scripts/snapshot.mjs novo https://www.cliente.com.br "Nome do Cliente"   cria analise/<pasta>/alvos.json
//   node scripts/snapshot.mjs medir <pasta>     sinais, Lighthouse (3 rodadas) e extras; no fim imprime a ficha
//   node scripts/snapshot.mjs ficha <pasta>     só imprime a ficha com o que já foi medido
//   node scripts/snapshot.mjs gerar <pasta>     monta index.html e snapshot.pdf a partir de analise.json
// <pasta> é o nome curto da empresa (ex.: premix), sem "analise/".
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [comando, arg, ...resto] = process.argv.slice(2);
const dir = (p) => `analise/${p.replace(/^analise\//, '').replace(/\/$/, '')}`;
const ler = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
const rodar = (script, pasta, env = {}) => {
  console.error(`\n=== ${script} ===`);
  const r = spawnSync(process.execPath, [`scripts/${script}`, pasta], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) { console.error(`${script} terminou com erro (${r.status}).`); process.exit(r.status || 1); }
};

async function novo(endereco, nome) {
  if (!endereco) { console.error('Informe o site do cliente.'); process.exit(1); }
  const url = new URL(/^https?:\/\//.test(endereco) ? endereco : `https://${endereco}`);
  const curto = url.hostname.replace(/^www\./, '').split('.')[0].toLowerCase();
  const pasta = dir(curto);
  if (existsSync(`${pasta}/alvos.json`)) { console.error(`${pasta}/alvos.json já existe. Edite o arquivo ou use "medir ${curto}".`); process.exit(1); }
  await mkdir(pasta, { recursive: true });
  const alvos = { empresa: { nome: nome || curto[0].toUpperCase() + curto.slice(1), url: url.href }, concorrentes: [], buscas: [] };
  await writeFile(`${pasta}/alvos.json`, JSON.stringify(alvos, null, 2));
  console.log(`criado ${pasta}/alvos.json. Faltam os concorrentes (3) e as buscas de partida (6 a 8).`);
}

async function ficha(p) {
  const pasta = dir(p);
  const coleta = await ler(`${pasta}/coleta.json`), lh = await ler(`${pasta}/lighthouse.json`), ex = await ler(`${pasta}/extras.json`);
  if (!coleta) { console.error('Ainda não há coleta nessa pasta. Rode "medir" primeiro.'); process.exit(1); }
  const v = (x, s = '') => (x == null ? 's/d' : `${x}${s}`);
  const sn = (x) => (x == null ? 's/d' : x ? 'sim' : 'NÃO');
  for (const i of coleta.itens) {
    const s = i.sinais, m = lh?.itens?.[i.nome] || {}, cel = i.celular || m.celular, pc = i.computador || m.computador, e = ex?.estrutura?.[i.nome], ig = ex?.instagram?.[i.nome];
    console.log(`\n## ${i.nome} (${i.papel}) ${i.url}`);
    if (s.falhou) { console.log('   LEITURA FALHOU: tratar como "sem dado" e medir de novo mais tarde.'); continue; }
    if (s.reaproveitado) console.log(`   (sinais reaproveitados da leitura de ${s.reaproveitado})`);
    console.log(`   celular: nota ${v(cel?.desempenho)} | acess. ${v(cel?.acessibilidade)} | boas práticas ${v(cel?.boasPraticas)} | SEO ${v(cel?.seo)} | LCP ${v(cel?.lcpSeg, ' s')} | ${v(cel?.pesoMB, ' MB')} | ${v(cel?.requisicoes)} arquivos | ${v(cel?.terceiros)} terceiros${cel?.desempenhoRodadas ? ` | rodadas ${cel.desempenhoRodadas.join('/')}` : ''}`);
    console.log(`   computador: nota ${v(pc?.desempenho)} | LCP ${v(pc?.lcpSeg, ' s')}`);
    console.log(`   título: ${v(s.titulo)}`);
    console.log(`   descrição: ${v(s.descricao)}`);
    console.log(`   h1: ${s.h1?.length ? s.h1.join(' | ') : 'nenhum'}`);
    console.log(`   dados estruturados: ${s.dadosEstruturados?.join(', ') || 'nenhum'} | FAQ ${sn(s.temFAQ)} | llms.txt ${sn(s.llmsTxt)} | sitemap ${sn(s.sitemap)} | WhatsApp ${sn(s.whatsapp)} | formulário de contato ${sn(s.formulario)}`);
    if (e) {
      console.log(`   servidor: ${v(e.servidor)} | linguagem: ${v(e.linguagem)} | sistema: ${v(e.sistema || s.gerador)} | plugins: ${e.plugins?.length ?? 's/d'} | scripts: ${v(e.scripts)} | CSS: ${v(e.folhasDeEstilo)}`);
      console.log(`   sem "www" abre: ${sn(e.semWwwAbre)}${e.semWwwErro ? ` (${e.semWwwErro})` : ''} | http leva para https: ${sn(e.httpRedirecionaParaHttps)}`);
      console.log(`   imagens: ${v(e.imagens)} (${Object.entries(e.imagensPorFormato || {}).map(([f, q]) => `${q} ${f}`).join(', ') || 's/d'}) | sem descrição: ${v(e.imagensSemDescricao)} | sob demanda: ${v(e.imagensComCarregamentoSobDemanda)} | carrossel: ${sn(e.carrossel)}`);
      console.log(`   menu: ${e.menu?.join(' · ') || 's/d'}`);
      console.log(`   mapa do site: ${e.mapaDoSite ? `${v(e.mapaDoSite.enderecos)} endereços, ${v(e.mapaDoSite.emHttp)} em http, atualizado em ${v(e.mapaDoSite.ultimaAtualizacao)}` : 'não encontrado'}`);
      console.log(`   último texto: ${v(e.blog?.ultimo)}${e.blog?.fonte ? ` (fonte ${e.blog.fonte})` : ''} | seções: ${e.blog?.secoes?.join(', ') || 's/d'}`);
      console.log(`   redes: ${Object.entries(e.redes || {}).filter(([, u]) => u).map(([r, u]) => `${r} ${u}`).join(' | ') || 'nenhuma encontrada'}`);
    }
    if (ig) console.log(`   Instagram @${ig.usuario}: ${v(ig.seguidores)} seguidores, ${v(ig.posts)} posts`);
  }
  if (ex?.buscas?.length) { console.log('\n## Buscas (sugestões do Google)'); for (const b of ex.buscas) console.log(`   ${b.termo} → ${b.sugestoes.slice(0, 10).join('; ')}`); }
  if (ex?.buscaPelaMarca) console.log(`   pela marca → ${JSON.stringify(ex.buscaPelaMarca).slice(0, 600)}`);
  console.log(`\ncoletado em ${coleta.coletadoEm}${lh ? ` | Lighthouse em ${lh.medidoEm}` : ''}`);
}

if (comando === 'novo') await novo(arg, resto.join(' '));
else if (comando === 'medir') {
  const pasta = dir(arg), alvos = await ler(`${pasta}/alvos.json`);
  if (!alvos) { console.error(`Não achei ${pasta}/alvos.json. Rode "novo" primeiro.`); process.exit(1); }
  if (!alvos.concorrentes?.length) console.error('Aviso: alvos.json está sem concorrentes. A análise sai sem comparação.');
  rodar('snapshot-coleta.mjs', pasta, { SEM_PSI: '1' });
  rodar('snapshot-lighthouse.mjs', pasta);
  rodar('snapshot-extras.mjs', pasta);
  if (alvos.mercado) rodar('snapshot-mercado.mjs', pasta);
  await ficha(arg);
} else if (comando === 'ficha') await ficha(arg);
else if (comando === 'gerar') rodar('snapshot-gerar.mjs', dir(arg));
else { console.error('Comandos: novo <site> [nome] | medir <pasta> | ficha <pasta> | gerar <pasta>'); process.exit(1); }
