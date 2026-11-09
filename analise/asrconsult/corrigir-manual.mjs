// Correções feitas à mão (09/11/2026), conferidas no Chrome com o site carregado.
// A EthosX monta a página por JavaScript; a coleta automática lê só o HTML inicial.
// Reaplicar sempre que a coleta rodar de novo: node analise/asrconsult/corrigir-manual.mjs
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url);
const ler = async (f) => JSON.parse(await readFile(new URL(f, dir), 'utf8'));
const c = await ler('coleta.json');
const e = c.itens.find((i) => i.nome === 'EthosX');
Object.assign(e.sinais, { h1: ['ERP que funciona. Operações que escalam.'], dadosEstruturados: ['WebSite', 'Organization'], whatsapp: true, formulario: true });
await writeFile(new URL('coleta.json', dir), JSON.stringify(c, null, 1));
const x = await ler('extras.json');
Object.assign(x.estrutura.EthosX.redes, { instagram: 'https://www.instagram.com/ethosxconsultoria/', linkedin: 'https://www.linkedin.com/company/ethoxsconsultoria' });
x.estrutura.EthosX.blog = { ultimo: '2026-08-13', fonte: 'https://ethosx.com/blog (34 artigos; todos com a mesma data, provável migração)', secoes: ['ERP', 'Cloud', 'Inovação', 'Tecnologia', 'Consultoria', 'Automação'] };
x.instagram.EthosX = { usuario: 'ethosxconsultoria', status: 200, seguidores: 1591, seguindo: 143, posts: 800, fonte: 'lido no Chrome em 09/11/2026' };
await writeFile(new URL('extras.json', dir), JSON.stringify(x, null, 2));
console.log('correções aplicadas');
