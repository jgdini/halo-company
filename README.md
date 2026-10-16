# Halo Company — landing page

Página única para a Halo Company (Amanda Takahashi, Bianca Fortes e João Dini). O nome de teste era "Trama"; a pasta local e o preview ainda usam esse nome. Repositório: github.com/jgdini/halo-company; GitHub Pages: jgdini.github.io/halo-company. HTML, CSS e JS puros, com GSAP + ScrollTrigger locais (`assets/js`), fontes Archivo e Newsreader em woff2 locais.

## Rodar
- Preview do app: configuração `trama` (porta 5610), que usa `scripts/serve.mjs`.
- Capturas por seção num Chrome real: `node scripts/shots.mjs 1440 900` e `node scripts/shots.mjs 412 915` (pasta definida por `SHOTS`).
- Teste do formulário: `node scripts/teste-form.mjs`.

## Assinatura visual
Paleta bordô e off-white. Três fios: cereja = estratégia/Amanda, champanhe = imagem/Bia, pérola = site/João (no CSS os tokens ainda se chamam --garanca, --acafrao e --celeste, da primeira paleta). O logo é um halo formado pelos três fios, e um anel de luz gira atrás do vídeo do topo. No topo eles giram trançados; na seção "Três fornecedores são três fios soltos" começam separados e a rolagem os trança. Tudo em `Fios()` dentro de `assets/js/main.js`. Com `prefers-reduced-motion` a página fica estática e completa.

## Painel do topo (ao lado do título)
O processo em 26 segundos, no estilo "planta técnica": Aplicação, Diagnóstico, Plano, Execução e o logo. Toca sozinho e sem som; o botão "Ouvir a narração" liga a voz e o painel passa a seguir o relógio do áudio. Há botão de pausa, legenda com a frase falada e uma lista estática das quatro etapas para quem desliga animações.
- Voz: `assets/audio/narracao.mp3` (23,2 s), sintética, gerada com `hyperframes tts --voice pf_dora --lang pt-br` a partir de `motion/voz/roteiro.txt`, com "Halo" escrito "Rêilou" para sair a pronúncia em inglês. O ambiente Python fica em `motion/.venv` (fora do git).
- Para trocar pela gravação da Amanda: salvar o MP3 no mesmo caminho e ajustar os tempos em `FALAS` e nas cenas de `painel()` em `assets/js/main.js`. As pausas entre as frases saem de `ffmpeg -af silencedetect=noise=-38dB:d=0.18`.

## Cenas (logo depois da faixa de nomes)
Seis cenas de "fios de luz" que avançam com o scroll: faísca, direção (estratégia), parar o scroll (imagem), audiência (ritmo), conecta (site) e do post ao cliente (comercial). Inspiradas na linguagem do reel do louis_rlee, com a paleta e as frases da Halo. Tudo em canvas, função `cenas()` em `assets/js/main.js`; as frases ficam no HTML (`.cena`) e podem ser trocadas sem mexer no desenho. A seção só é montada quando chega perto da tela.

## Tráfego pago (depois de "Como funciona")
Comparativo com o mesmo investimento em dois caminhos. Abas "Do jeito comum" e "Do jeito Halo" trocam os textos das 5 etapas (Anúncio, Clique, Página, Lead, Venda), as partículas e a coluna destacada da tabela. No jeito comum, parte das partículas escapa em cada etapa e cai em vermelho; no jeito Halo, a maioria chega à venda. Os números da tabela são ilustrativos e a página diz isso. Código em `trafego()` em `assets/js/main.js`; as chances de cada partícula seguir estão em `FICA`.

## Pendências (espaços reservados na página)
- [x] Vídeo do topo removido (2026-10-13). A seção de provas agora mostra as capas dos reels com link para o Instagram (imagens em assets/img/provas, sem player embutido, para não pesar a página).
- [x] Três reels e o post da Community com capa e link para o Instagram (autorizados pela Amanda). Falta trocar as falas entre colchetes pela transcrição exata de cada um.
- [ ] Fotos 4:5 da Amanda, da Bia e do João.
- [x] Hanaoka: prints de antes/depois (topo, desktop e celular) já no case. Gerados por `node scripts/imagens.mjs` a partir de `Arquivos/`.
- [ ] Hanaoka: números do Instagram (seguidores) e leads por mês. Confirmar que o cliente autoriza o case.
- [x] Hanaoka: PageSpeed no computador 90/100/100/100 (print do João, 2026-10-07), usado no case. No celular o site fez 67 e 79 de desempenho; a maior parte do público acessa pelo computador.
- [x] Marcelo Lusardo: links trocados pelos domínios oficiais (liderdetravessias.com.br e marcelolusardo.com.br).
- [ ] Veículo Judicial: confirmar o número de seguidores ganhos (+6 mil) com um print do antes.
- [x] Faixa de nomes com fotos e logos (Raphael Mattos, Scale Club, Marcus Marques, Acelerador Empresarial, Joel Jota, Graciane Barbosa, Community), autorizados pela Amanda em 2026-10-07. Pablo Marçal saiu. Para trocar uma imagem: substituir em Arquivos/Pessoas e rodar `node scripts/pessoas.mjs` (os recortes em volta do rosto estão no script).
- [ ] Destino da aplicação: preencher `ENVIO` no topo de `assets/js/main.js` (endpoint JSON ou número de WhatsApp). Hoje o formulário só mostra a mensagem de sucesso.
- [ ] Domínio, @ do Instagram, LinkedIn e e-mail da Halo Company (rodapé com [@halocompany] e [contato@halocompany.com.br] provisórios; canonical, sitemap, robots, llms.txt e JSON-LD apontam para jgdini.github.io/halo-company).
- [ ] Imagem de compartilhamento (og:image 1200×630) e logo definitivo.
- [ ] Nome "Halo Company": checar domínio, @ e INPI (classe 35). "Halo" sozinho é muito usado; o "Company" ajuda a diferenciar.

## Lighthouse (local, 2026-10-07)
Mobile: desempenho 93, acessibilidade 96 (corrigido depois: contraste das frases apagadas), boas práticas 100, SEO 100. Desktop: 100/96/100/100. CLS 0.
