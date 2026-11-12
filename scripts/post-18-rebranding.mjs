// Post 18: "Trocar o logo não é rebranding" (polêmico). Saída em C:\Claude Sites\halo-posts\18-trocar-logo-nao-e-rebranding\
import { fileURLToPath } from 'node:url';
import { t, gerar, legendas } from './posts-carrossel.mjs';

const n = '18-trocar-logo-nao-e-rebranding';
const saida = fileURLToPath(new URL(`../../halo-posts/${n}/`, import.meta.url));

const telas = [
  { tema: 'claro', html: t.capa({ titulo: 'Trocar o logo não é <span class="it">rebranding.</span>', size: 132, top: 360 }) },
  { tema: 'escuro', html: t.frase({ titulo: 'É pintar a fachada de uma loja que continua <span class="it">igual</span> por dentro.', size: 100, top: 340 }) },
  { tema: 'claro', html: t.compara({ rot: 'A diferença', titulo: 'Uma muda o desenho. A outra muda a empresa.', size: 72,
    ruim: { leg: 'Troca de logo', itens: ['Muda o símbolo e as cores.', 'O Instagram fala do mesmo jeito.', 'O site e o atendimento continuam iguais.'] },
    bom: { leg: 'Rebranding', itens: ['Muda o que a empresa diz e para quem.', 'Instagram, site e vídeo contam a mesma história.', 'O cliente sente a diferença antes de chamar.'] } }) },
  { tema: 'claro', html: t.lista({ rot: 'Quando faz sentido', titulo: 'Sinais de que a marca ficou para trás:', size: 78, itens: [
    { t: 'A empresa cresceu e a imagem parou no tempo.' },
    { t: 'Você quer vender para um cliente maior.' },
    { t: 'Quem chega no seu perfil não entende o que você faz.' }] }) },
  { tema: 'escuro', html: t.texto({ rot: 'Por onde começa', titulo: 'Pelo que o cliente deve <span class="it">pensar</span> da empresa.', p: ['O logo vem no fim.', 'Primeiro o posicionamento. Depois o que você fala. Só então como você aparece.'], size: 96, top: 280 }) },
  { tema: 'claro', html: t.frase({ titulo: 'O logo é a assinatura. O rebranding é o que a empresa passa a <span class="it">dizer.</span>', size: 96, top: 340 }) },
  { tema: 'escuro', html: t.cta({ titulo: 'A sua marca mostra a empresa que você <span class="it">virou?</span>', p: 'No diagnóstico, olhamos Instagram, site e atendimento do jeito que o seu cliente vê.', size: 96 }) }
];

const leg = `# Post 18 · "Trocar o logo não é rebranding" (polêmico)

Carrossel de 7 telas, off-white com telas bordô.

## Legenda

Trocar o logo não é rebranding.

Muita empresa gasta com símbolo e paleta nova e, seis meses depois, nada mudou. O Instagram fala do mesmo jeito, o site é o mesmo e o atendimento também.

Rebranding começa antes do desenho: o que a empresa quer que o cliente pense dela, para quem ela fala e o que ela passa a dizer. O logo é a última peça, não a primeira.

Você já viu uma empresa trocar o logo e continuar exatamente igual? Conta nos comentários.

#branding #rebranding #marketingdigital #empreendedorismo #halocompany

## Texto alternativo

Carrossel com a frase "Trocar o logo não é rebranding". Compara troca de logo (muda símbolo e cores, o resto fica igual) com rebranding (muda o que a empresa diz e para quem, com Instagram, site e vídeo contando a mesma história) e fecha com "O logo é a assinatura. O rebranding é o que a empresa passa a dizer."

## Ao publicar

- Polêmico: responder os comentários nas primeiras horas, sem brigar.
- Fixar um comentário da Halo com a pergunta da legenda.
- Inspiração: reel enviado pelo João (instagram.com/reel/DfnskAkuNYO). O texto é nosso; não repostar nem copiar falas do vídeo.

## Arquivos de trabalho

- Gerador: \`C:\\Claude Sites\\trama\\scripts\\post-18-rebranding.mjs\` (rodar \`node post-18-rebranding.mjs\` dentro de \`trama\\scripts\`).
`;

await gerar(saida, n, telas);
await legendas(saida, leg);
console.log('ok', n);
