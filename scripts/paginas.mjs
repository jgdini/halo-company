// Gera as páginas internas do site (serviços, segmentos, região e case) a partir do mesmo modelo.
// Uso: node scripts/paginas.mjs  → grava <slug>/index.html e atualiza sitemap.xml.
// Texto: frases curtas, sem travessão, só fatos conferíveis. Preço da Halo nunca aparece.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const raiz = fileURLToPath(new URL('..', import.meta.url));
export const SITE = 'https://haloconsulting.com.br';
const HOJE = new Date().toISOString().slice(0, 10);

const simbolo = `<svg class="marca__simbolo" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-90 16 16)"><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--garanca)" stroke-dasharray="86 214"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--acafrao)" stroke-dasharray="86 214" stroke-dashoffset="-100"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="var(--celeste)" stroke-dasharray="86 214" stroke-dashoffset="-200"/></g></svg>`;
const marca = `<a class="marca" href="/">${simbolo}<span class="marca__nome">halo <small>company</small></span></a>`;

// Ordem usada no menu, no rodapé e no "veja também".
export const PAGINAS = [
  { slug: 'criacao-de-sites', menu: 'Sites', nome: 'Criação de sites e landing pages', resumo: 'Sites sob medida e landing pages rápidas, prontas para o Google e para as IAs.' },
  { slug: 'video-institucional', menu: 'Vídeo', nome: 'Vídeo institucional e captação', resumo: 'Uma captação planejada que vira vídeo da empresa, Reels e anúncio.' },
  { slug: 'marketing-para-industrias', menu: 'Indústrias', nome: 'Marketing para indústrias', resumo: 'Site, captação na fábrica e LinkedIn para o comprador que pesquisa antes de cotar.' },
  { slug: 'marketing-para-clinicas', menu: 'Clínicas', nome: 'Marketing para clínicas', resumo: 'Conteúdo, tráfego e treinamento da recepção: do anúncio ao paciente agendado.' },
  { slug: 'blog', menu: 'Blog', nome: 'Blog', resumo: 'Respostas diretas para o que o empresário pergunta sobre marketing, site, vídeo e tráfego.' },
  { slug: 'cases', menu: 'Cases', nome: 'Cases', resumo: 'Hanaoka, Veículo Judicial, Marcelo Lusardo e DRLSYS: o que fizemos e o que mudou.' },
  { slug: 'cases/hanaoka', menu: 'Case Hanaoka', nome: 'Case Hanaoka', resumo: 'Indústria química desde 1985: estratégia, captação e site novo em dois idiomas.', rodape: false },
  { slug: 'cases/veiculo-judicial', menu: 'Case Veículo Judicial', nome: 'Case Veículo Judicial', resumo: 'Os leilões judiciais do país numa busca só, com o custo total estimado de cada veículo.', rodape: false },
  { slug: 'cases/marcelo-lusardo', menu: 'Case Marcelo Lusardo', nome: 'Case Marcelo Lusardo', resumo: 'Site e landing page para quem vai estudar, trabalhar e viver na Austrália.', rodape: false },
  { slug: 'cases/drlsys', menu: 'Case DRLSYS', nome: 'Case DRLSYS', resumo: 'Infraestrutura de TI em Cotia: do briefing ao site no ar em menos de uma semana.', rodape: false }
];
const MENU = ['criacao-de-sites', 'video-institucional', 'marketing-para-industrias', 'marketing-para-clinicas', 'cases', 'blog'];

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const semTag = (s) => String(s).replace(/<[^>]+>/g, '');

function faqHtml(faq) {
  return `<div class="faq">${faq.map(([q, r]) => `
          <details>
            <summary>${q}</summary>
            <p>${r}</p>
          </details>`).join('')}
        </div>`;
}

function vejaTambem(slugAtual, lista) {
  const itens = (lista || PAGINAS.map((p) => p.slug)).filter((s) => s !== slugAtual).slice(0, 3).map((s) => PAGINAS.find((p) => p.slug === s));
  return `
  <section class="secao" aria-labelledby="veja-titulo">
    <div class="wrap">
      <h2 id="veja-titulo" class="titulo-2" style="margin-bottom:36px">Veja também</h2>
      <div class="cartoes">${itens.map((p) => `
        <a class="cartao" href="/${p.slug}/"><h3>${p.nome}</h3><p>${p.resumo}</p><span class="seta">Ver página</span></a>`).join('')}
      </div>
    </div>
  </section>`;
}

export const chamada = (titulo, texto) => `
  <section class="secao">
    <div class="wrap">
      <div class="chamada">
        <div><h2>${titulo}</h2><p>${texto}</p></div>
        <a class="botao" href="/#aplicar">Aplicar para um diagnóstico <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>`;

// Botão flutuante de WhatsApp (o mesmo bloco está colado no fim do index.html da home).
export const WHATS = `<a class="whats" href="https://wa.me/5511989531711?text=${encodeURIComponent('Olá! Vim pelo site da Halo Company e quero falar com um especialista.')}" target="_blank" rel="noopener" aria-label="Falar com um especialista pelo WhatsApp (abre em nova aba)">
  <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.8-1.6l-.4-.2-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.8C5.2 10 10 5.3 16 5.3S26.8 10 26.8 15.8 22 26.4 16 26.4zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.4c.2.2 2.3 3.5 5.6 4.9 2.8 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4z"/></svg>
  <span>Falar com um especialista</span>
</a>`;

// Casca comum (head, topo, rodapé) usada pelas páginas e pelo blog (scripts/blog.mjs).
export function casca({ titulo, descricao, url, ld, ativo, ogType = 'website', main }) {
  const menu = MENU.map((s) => { const m = PAGINAS.find((x) => x.slug === s); return `<a href="/${s}/"${s === ativo || ativo.startsWith(s + '/') ? ' aria-current="page"' : ''}>${m.menu}</a>`; }).join('\n      ');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#3A0D18">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Halo Company">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/paginas.css">
<link rel="alternate" type="application/rss+xml" title="Blog da Halo Company" href="/blog/feed.xml">
<script type="application/ld+json">
${JSON.stringify(ld, null, 1)}
</script>
</head>
<body class="pg">
<a class="pular" href="#conteudo">Pular para o conteúdo</a>

<header class="topo" id="topo">
  <div class="wrap topo__in">
    ${marca}
    <nav class="menu" aria-label="Principal">
      ${menu}
    </nav>
    <div class="topo__acoes">
      <a class="topo__inicio" href="/"><span aria-hidden="true">←</span> Início</a>
      <a class="botao botao--peq" href="/#aplicar">Aplicar</a>
    </div>
  </div>
</header>

<main id="conteudo">
${main}
</main>

<footer class="rodape">
  <div class="wrap rodape__in">
    ${marca}
    <p>Estratégia, imagem e site para empresas premium. O efeito halo da sua marca.</p>
    <nav class="rodape__links" aria-label="Contato">
      <a href="https://www.instagram.com/halocompany_/" target="_blank" rel="noopener">Instagram @halocompany_</a>
      <a href="mailto:contato@haloconsulting.com.br">contato@haloconsulting.com.br</a>
    </nav>
    <nav class="rodape__solucoes" aria-label="Soluções">
      ${PAGINAS.filter((x) => x.rodape !== false).map((x) => `<a href="/${x.slug}/">${x.nome}</a>`).join('\n      ')}
    </nav>
    <p class="rodape__mini">© 2026 Halo Company. Amanda Takahashi, Bianca Fortes e João Dini. Cotia e Alphaville, SP. Atendemos todo o Brasil.</p>
  </div>
</footer>
${WHATS}
</body>
</html>
`;
}

function pagina(p) {
  const url = `${SITE}/${p.slug}/`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Halo Company', item: `${SITE}/` },
        ...(p.slug.startsWith('cases/') ? [{ '@type': 'ListItem', position: 2, name: 'Cases', item: `${SITE}/cases/` }] : []),
        { '@type': 'ListItem', position: p.slug.startsWith('cases/') ? 3 : 2, name: p.nome, item: url }
      ] },
      p.schema(url),
      { '@type': 'FAQPage', mainEntity: p.faq.map(([q, r]) => ({ '@type': 'Question', name: semTag(q), acceptedAnswer: { '@type': 'Answer', text: semTag(r) } })) }
    ]
  };
  const main = `  <section class="pg-hero" aria-labelledby="pg-titulo">
    <div class="wrap">
      <nav class="migalha" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span>${p.slug.startsWith('cases/') ? '<a href="/cases/">Cases</a><span aria-hidden="true">/</span>' : ''}<span>${p.nome}</span></nav>
      <h1 id="pg-titulo" class="pg-titulo">${p.h1}</h1>
      <p class="pg-apoio">${p.apoio}</p>
      <div class="pg-acoes">
        <a class="botao" href="/#aplicar">Aplicar para um diagnóstico <span aria-hidden="true">→</span></a>
        ${p.link2 || '<a class="link-fio" href="/#time">Conhecer o time</a>'}
      </div>
    </div>
  </section>
${p.corpo}
  <section class="secao claro" id="perguntas" aria-labelledby="perguntas-titulo">
    <div class="wrap perguntas__grid">
      <div class="cabeca">
        <h2 id="perguntas-titulo" class="titulo">Perguntas sobre ${p.sobre}.</h2>
      </div>
      ${faqHtml(p.faq)}
    </div>
  </section>
${chamada(p.chamada[0], p.chamada[1])}
${vejaTambem(p.slug, p.veja)}`;
  return casca({ titulo: p.titulo, descricao: p.descricao, url, ld, ativo: p.slug, main });
}

export const empresa = { '@id': `${SITE}/#empresa` };
const servico = (nome, desc, tipo) => (url) => ({ '@type': 'Service', '@id': url + '#servico', name: nome, serviceType: tipo || nome, description: desc, provider: empresa, areaServed: { '@type': 'Country', name: 'Brasil' }, url });

const ponto = (c) => `<span class="ponto ponto--${c}"></span>`;
const dores = (itens) => `<ul class="dores">${itens.map(([c, b, t]) => `
          <li>${ponto(c)}<div><b>${b}</b><span>${t}</span></div></li>`).join('')}
        </ul>`;
const fios3 = (itens, rotulo) => `<ul class="fios3">${itens.map(([cor, peq, h, ...ps]) => `
        <li style="--fio:var(--${cor})"><small>${peq}</small><h3>${h}</h3>${ps.map((x) => `<p>${x}</p>`).join('')}</li>`).join('')}
      </ul>`;
const hanaokaLado = `<div class="lado">
        <figure><div class="janela"><img src="/assets/img/hanaoka-antigo-desktop-topo-720.webp" width="1440" height="900" loading="lazy" decoding="async" alt="Site antigo da Hanaoka: carrossel com a frase Temos o produto ideal para a sua necessidade"></div><figcaption><b>Antes.</b> Um carrossel e uma frase que serviria para qualquer empresa.</figcaption></figure>
        <figure><div class="janela"><img src="/assets/img/hanaoka-novo-desktop-topo-720.webp" width="1440" height="900" loading="lazy" decoding="async" alt="Site novo da Hanaoka: Fabricante Nacional de Produtos Químicos com alto nível de pureza, sobre vídeo aéreo da fábrica"></div><figcaption><b>Depois.</b> A primeira linha diz o que a Hanaoka fabrica, sobre o vídeo aéreo da fábrica.</figcaption></figure>
      </div>`;

/* ------------------------------------------------------------------ */
const conteudo = [
{
  slug: 'criacao-de-sites',
  nome: 'Criação de sites e landing pages',
  sobre: 'sites e landing pages',
  titulo: 'Criação de sites e landing pages para empresas | Halo Company',
  descricao: 'Sites sob medida e landing pages que carregam rápido no celular, aparecem no Google e são citados por ChatGPT e Gemini. Projetos da Halo Company para empresas de todo o Brasil.',
  h1: 'Sites e landing pages que carregam rápido e <em>aparecem</em> no Google.',
  apoio: 'Feitos sob medida, sem template. Rápidos no celular, escritos para o Google e organizados para serem citados por ChatGPT, Gemini e Perplexity. E uma landing page para cada campanha de tráfego.',
  link2: '<a class="link-fio" href="#projetos">Ver sites no ar</a>',
  schema: servico('Criação de sites e landing pages', 'Sites institucionais sob medida e landing pages para campanhas, com SEO técnico, dados estruturados e otimização para buscas com IA.', 'Criação de sites'),
  corpo: `
  <section class="secao" aria-labelledby="dor-titulo">
    <div class="wrap duas">
      <h2 id="dor-titulo" class="titulo-2">Onde o site atrapalha a venda.</h2>
      ${dores([
        ['garanca', 'Demora para abrir no celular.', 'Quem chega pelo Instagram ou pelo anúncio desiste antes de ver o que você vende.'],
        ['acafrao', 'Não diz o que a empresa faz.', 'Frases como "soluções de qualidade" servem para qualquer um. O Google e o cliente não entendem.'],
        ['celeste', 'Não aparece quando procuram.', 'Sem título, descrição e estrutura certos, o site não entra nem nas buscas pelo próprio nome.'],
        ['garanca', 'O anúncio leva para a página errada.', 'A campanha manda para a home, cheia de opções, e o lead se perde no caminho.']
      ])}
    </div>
  </section>

  <section class="secao claro" aria-labelledby="tipos-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="tipos-titulo" class="titulo">Site ou landing page?</h2>
        <p class="cabeca__apoio">Na maioria das empresas, os dois. O site apresenta a empresa inteira. A landing page tem um objetivo só e recebe o tráfego pago.</p>
      </div>
      <div class="tabela__caixa">
        <table class="tabela">
          <thead><tr><th scope="col"></th><th scope="col">Site institucional</th><th scope="col">Landing page</th></tr></thead>
          <tbody>
            <tr><th scope="row">Para quê</th><td>Mostrar quem é a empresa, o que vende e por que confiar.</td><td>Levar quem clicou no anúncio a uma ação: pedir orçamento, agendar, se inscrever.</td></tr>
            <tr><th scope="row">Quem chega</th><td>Quem buscou no Google, viu o Instagram ou recebeu uma indicação.</td><td>Quem clicou em uma campanha específica.</td></tr>
            <tr><th scope="row">Páginas</th><td>Várias: serviços, sobre, cases, blog, contato.</td><td>Uma, sem menu, com uma oferta e um botão.</td></tr>
            <tr><th scope="row">Como medimos</th><td>Buscas em que aparece no Search Console e contatos gerados.</td><td>Taxa de conversão e custo por lead da campanha.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="secao claro" aria-labelledby="tem-titulo" style="padding-top:0">
    <div class="wrap">
      <h2 id="tem-titulo" class="titulo-2" style="margin-bottom:36px">O que todo site da Halo tem.</h2>
      <ul class="check">
        <li><div><b>Velocidade no celular.</b> Imagens leves, vídeo que só carrega quando aparece e código enxuto.</div></li>
        <li><div><b>SEO técnico.</b> Título, descrição, links internos, sitemap e páginas que o Google entende.</div></li>
        <li><div><b>Dados estruturados.</b> A empresa, os serviços e as perguntas descritos no formato que Google e IAs leem.</div></li>
        <li><div><b>Texto para ser citado pelas IAs.</b> Respostas diretas às perguntas que o seu cliente faz ao ChatGPT.</div></li>
        <li><div><b>Formulário que qualifica.</b> Pergunta o que o seu comercial precisa saber antes de ligar.</div></li>
        <li><div><b>Search Console configurado.</b> Você vê por quais buscas a empresa aparece.</div></li>
        <li><div><b>Migração sem perder o que já existe.</b> Redirecionamentos das páginas antigas para as novas.</div></li>
        <li><div><b>Aviso de cookies e privacidade.</b> Em linha com a LGPD.</div></li>
      </ul>
    </div>
  </section>

  <section class="secao" id="projetos" aria-labelledby="proj-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="proj-titulo" class="titulo">Sites que já estão no ar.</h2>
      </div>
      <div class="cartoes">
        <a class="cartao" href="/cases/hanaoka/"><small>Indústria química</small><h3>Hanaoka</h3><p>Site novo em português e inglês, com catálogo e blog. No PageSpeed do Google, versão computador: 90 em desempenho e 100 em acessibilidade, boas práticas e SEO.</p><span class="seta">Ver o case</span></a>
        <a class="cartao" href="/cases/veiculo-judicial/"><small>Plataforma de busca</small><h3>Veículo Judicial</h3><p>Reúne os veículos de leilão judicial publicados por leiloeiros oficiais de todo o país. Mais de 6 mil seguidores no @rubensleilao depois do lançamento.</p><span class="seta">Ver o case</span></a>
        <a class="cartao" href="/cases/marcelo-lusardo/"><small>Site e landing page · Brasil e Austrália</small><h3>Marcelo Lusardo</h3><p>Site do ecossistema Austrália Sem Fronteiras e landing page própria, com valores em reais e em dólar australiano.</p><span class="seta">Ver o case</span></a>
        <a class="cartao" href="/cases/drlsys/"><small>Site institucional</small><h3>DRLSYS</h3><p>Empresa de infraestrutura de TI. Do briefing ao site no ar em menos de uma semana.</p><span class="seta">Ver o case</span></a>
      </div>
    </div>
  </section>

  <section class="secao" aria-labelledby="preco-titulo">
    <div class="wrap duas">
      <h2 id="preco-titulo" class="titulo-2">Quanto custa um site para empresa?</h2>
      <div class="prosa">
        <p>Depende do que o site precisa fazer. O que mais muda o valor:</p>
        <ul class="dores">
          <li>${ponto('garanca')}<div><b>Número de páginas e de idiomas.</b><span>Uma landing page é bem diferente de um site com catálogo em dois idiomas.</span></div></li>
          <li>${ponto('acafrao')}<div><b>Conteúdo.</b><span>Se o texto e as fotos já existem ou se vamos escrever e fotografar.</span></div></li>
          <li>${ponto('celeste')}<div><b>Integrações.</b><span>CRM, agenda, WhatsApp, pagamento, área do cliente.</span></div></li>
          <li>${ponto('garanca')}<div><b>Migração.</b><span>Trazer o que o site antigo já conquistou no Google exige mapear cada página.</span></div></li>
        </ul>
        <p>O valor do site da Halo sai depois do diagnóstico, junto com o plano. Quando o site faz parte do projeto completo, ele é pensado com o tráfego e o conteúdo.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Vocês fazem em WordPress?', 'Fazemos em WordPress com tema próprio quando a empresa quer editar páginas e blog sozinha, como no site da Hanaoka. Quando o site muda pouco, fazemos em código, que é mais leve e mais seguro.'],
    ['Quanto tempo leva?', 'Uma landing page sai em poucos dias. O site da DRLSYS levou menos de uma semana do briefing ao ar. Sites com catálogo, dois idiomas ou migração levam algumas semanas.'],
    ['O site novo já aparece no Google?', 'Ele sai pronto para isso: estrutura, textos e Search Console. As primeiras posições dependem da concorrência de cada busca e costumam levar de semanas a meses. Acompanhamos pelo Search Console.'],
    ['O que é otimizar para IAs?', 'É organizar o site para que ChatGPT, Gemini e Perplexity entendam e citem a empresa: respostas diretas às perguntas do cliente, dados estruturados e um arquivo llms.txt com o resumo da empresa.'],
    ['Vocês cuidam da hospedagem?', 'Ajudamos a escolher, configuramos domínio, certificado e e-mail e fazemos a migração. A hospedagem fica no nome da sua empresa.'],
    ['Dá para fazer só a landing page?', 'Dá. Mas ela rende mais junto com a campanha de tráfego e com o comercial preparado para responder o lead. O diagnóstico mostra por onde começar.']
  ],
  chamada: ['Seu site está ajudando ou atrapalhando a venda?', 'No diagnóstico olhamos o site junto com as redes, os anúncios e o atendimento. Você sai sabendo o que mudar primeiro.']
},
/* ------------------------------------------------------------------ */
{
  slug: 'video-institucional',
  nome: 'Vídeo institucional e captação',
  sobre: 'vídeo institucional',
  titulo: 'Vídeo institucional para empresas: captação, Reels e anúncios | Halo Company',
  descricao: 'Vídeo institucional planejado pela estratégia: de uma captação saem o vídeo da empresa, os cortes para Reels e os anúncios. Gravamos na sua empresa em Cotia, Alphaville, São Paulo e região.',
  h1: 'Vídeo institucional que vira <em>anúncio</em>, post e página do site.',
  apoio: 'A maioria dos vídeos institucionais fica parada no YouTube. Na Halo, a captação é planejada pela estratégia: de uma diária saem o vídeo da empresa, os cortes para Reels e os anúncios.',
  schema: servico('Vídeo institucional e captação de foto e vídeo', 'Roteiro, captação na empresa e edição em vários formatos: vídeo institucional, Reels, anúncios e vídeos para o site.', 'Produção de vídeo'),
  corpo: `
  <section class="secao" aria-labelledby="dor-titulo">
    <div class="wrap duas">
      <h2 id="dor-titulo" class="titulo-2">Por que tanto vídeo institucional encalha.</h2>
      ${dores([
        ['garanca', 'É gravado sem saber onde vai passar.', 'Um vídeo de três minutos em formato de TV não funciona no feed, no Reels nem no anúncio.'],
        ['acafrao', 'Fala de tudo e não convence ninguém.', 'Missão, visão e valores não respondem o que o cliente quer saber: por que comprar de você.'],
        ['celeste', 'Fica pesado no site.', 'Um vídeo sem compressão deixa a página lenta e derruba a nota do Google.'],
        ['garanca', 'Não tem continuidade.', 'Uma diária vira um vídeo só, quando poderia render conteúdo para meses.']
      ])}
    </div>
  </section>

  <section class="secao claro" aria-labelledby="como-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="como-titulo" class="titulo">Como funciona a captação.</h2>
        <p class="cabeca__apoio">Quem pensa o conteúdo, quem grava e quem anuncia estão no mesmo time. Por isso cada cena já nasce sabendo para onde vai.</p>
      </div>
      <ol class="etapas">
        <li><h3>Roteiro</h3><p>A Amanda define o que a empresa precisa dizer e para quem. Saímos com a lista de cenas, falas e formatos.</p></li>
        <li><h3>Diária de gravação</h3><p>A Bia grava na sua empresa: fábrica, laboratório, clínica, escritório, equipe e depoimentos.</p></li>
        <li><h3>Edição em formatos</h3><p>Horizontal para site e YouTube, vertical para Reels e anúncios, 4:5 para o feed.</p></li>
        <li><h3>Publicação e anúncio</h3><p>Os cortes entram no calendário e nas campanhas. O que performa melhor vira anúncio.</p></li>
      </ol>
    </div>
  </section>

  <section class="secao claro" aria-labelledby="sai-titulo" style="padding-top:0">
    <div class="wrap">
      <h2 id="sai-titulo" class="titulo-2" style="margin-bottom:36px">O que sai de uma captação.</h2>
      <ul class="check">
        <li><div><b>Vídeo institucional</b> para o site, o YouTube e apresentações comerciais.</div></li>
        <li><div><b>Cortes para Reels</b> com legenda, para o calendário de conteúdo.</div></li>
        <li><div><b>Vídeos para anúncio</b> com os primeiros segundos pensados para parar o scroll.</div></li>
        <li><div><b>Fotos</b> da equipe, do espaço e do produto para site, posts e LinkedIn.</div></li>
        <li><div><b>Vídeo leve para o topo do site</b>, comprimido para não atrasar a página.</div></li>
        <li><div><b>Bastidores</b> para stories, que mostram a empresa de verdade.</div></li>
      </ul>
    </div>
  </section>

  <section class="secao" aria-labelledby="ex-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="ex-titulo" class="titulo">Exemplo: captação na Hanaoka.</h2>
        <p class="cabeca__apoio">Gravamos na fábrica e no laboratório de uma indústria química. O vídeo aéreo da fábrica abre o site novo e foi comprimido para 2,5 MB. Ele só carrega quando a pessoa chega nele.</p>
      </div>
      ${hanaokaLado}
      <p style="margin-top:28px"><a class="link-fio" href="/cases/hanaoka/">Ver o case completo</a></p>
    </div>
  </section>

  <section class="secao" aria-labelledby="preco-titulo">
    <div class="wrap duas">
      <h2 id="preco-titulo" class="titulo-2">Quanto custa um vídeo institucional?</h2>
      <div class="prosa">
        <p>O preço depende menos da duração do vídeo e mais do que é preciso para gravar. O que pesa:</p>
        <ul class="dores">
          <li>${ponto('garanca')}<div><b>Diárias e locações.</b><span>Uma sala é diferente de fábrica, frota e escritório no mesmo dia.</span></div></li>
          <li>${ponto('acafrao')}<div><b>Pessoas em cena.</b><span>Entrevistas e depoimentos pedem roteiro, luz e som.</span></div></li>
          <li>${ponto('celeste')}<div><b>Recursos extras.</b><span>Drone, animação, trilha licenciada, legenda em outro idioma.</span></div></li>
          <li>${ponto('garanca')}<div><b>Quantos formatos saem.</b><span>Um vídeo só ou um pacote para meses de conteúdo e anúncio.</span></div></li>
        </ul>
        <p>Na Halo, a captação faz parte do plano mensal ou de um projeto fechado. O valor sai depois do diagnóstico.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Vocês gravam na minha empresa?', 'Sim. Gravamos em Cotia, Alphaville, Barueri, São Paulo e região. Para outras cidades, combinamos a viagem no plano.'],
    ['Quanto tempo leva do roteiro ao vídeo pronto?', 'O roteiro sai na primeira semana. Depois da gravação, os primeiros cortes ficam prontos em poucos dias, e o vídeo institucional completo em seguida.'],
    ['Alguém da empresa precisa aparecer?', 'Ajuda muito. O dono ou um especialista falando gera mais confiança do que locução. Preparamos a pessoa antes e gravamos com calma.'],
    ['Dá para fazer com inteligência artificial?', 'A IA ajuda na legenda, no corte e em ajustes de edição. Mas o que gera confiança é ver a empresa real: as pessoas, o lugar e o produto.'],
    ['Posso usar o vídeo em anúncios?', 'Pode e deve. Os cortes são editados pensando nisso, e a Bia, que grava, é quem monta as campanhas.']
  ],
  chamada: ['Sua empresa já tem vídeo que vende?', 'No diagnóstico vemos o que você já tem gravado, o que dá para aproveitar e o que vale captar primeiro.']
},
/* ------------------------------------------------------------------ */
{
  slug: 'marketing-para-industrias',
  nome: 'Marketing para indústrias',
  sobre: 'marketing para indústrias',
  titulo: 'Marketing para indústrias: site, vídeo e LinkedIn | Halo Company',
  descricao: 'Marketing para indústrias: site com catálogo, captação de vídeo na fábrica e LinkedIn para o comprador que pesquisa antes de pedir cotação. Case Hanaoka, indústria química desde 1985.',
  h1: 'Marketing para indústrias que o comprador <em>encontra</em> antes de cotar.',
  apoio: 'O comprador industrial pesquisa no computador, compara fornecedores e pede cotação para quem passa confiança. A Halo cuida do site, da captação na fábrica e do LinkedIn com um plano só.',
  link2: '<a class="link-fio" href="/cases/hanaoka/">Ver o case Hanaoka</a>',
  schema: servico('Marketing para indústrias', 'Site institucional com catálogo, captação de foto e vídeo na fábrica, estratégia de LinkedIn e Instagram e preparo do comercial para responder cotações.', 'Marketing industrial'),
  corpo: `
  <section class="secao" aria-labelledby="dor-titulo">
    <div class="wrap duas">
      <h2 id="dor-titulo" class="titulo-2">Onde a indústria perde o comprador.</h2>
      ${dores([
        ['garanca', 'O site não diz o que a fábrica produz.', 'Carrossel, frase genérica e catálogo em PDF que ninguém encontra.'],
        ['acafrao', 'Ninguém vê a fábrica.', 'Laboratório, certificações, frota e processo são a maior prova de qualidade, e ficam escondidos.'],
        ['celeste', 'O LinkedIn está parado.', 'É onde estão compradores, engenheiros e diretores, e a página da empresa não publica nada há meses.'],
        ['garanca', 'A cotação demora.', 'O pedido chega por formulário genérico, sem as informações que o comercial precisa, e a resposta sai dias depois.']
      ])}
    </div>
  </section>

  <section class="secao claro" aria-labelledby="faz-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="faz-titulo" class="titulo">O que a Halo faz pela indústria.</h2>
        <p class="cabeca__apoio">Três frentes no mesmo plano, cada uma com um sócio responsável.</p>
      </div>
      ${fios3([
        ['garanca', 'Estratégia · Amanda', 'LinkedIn e Instagram técnicos', 'Pauta com processo, controle de qualidade, linha de produtos, bastidores e equipe. Conteúdo que um comprador técnico respeita.'],
        ['acafrao', 'Imagem · Bia', 'Captação na fábrica', 'Foto e vídeo da produção, do laboratório e da frota, respeitando segurança e áreas restritas. Vídeo institucional e cortes para anúncio.'],
        ['celeste', 'Site · João', 'Site com catálogo', 'Uma página por produto ou linha, versão em inglês quando há exportação e formulário de cotação que já pergunta volume, aplicação e prazo.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="case-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="case-titulo" class="titulo">Hanaoka: 40 anos de indústria química, com uma presença à altura.</h2>
        <p class="cabeca__apoio">Fabricante de ácidos e sais de alta pureza desde 1985, com laboratório e frota próprios. Estratégia mensal de Instagram e LinkedIn, captação na fábrica e site novo em português e inglês.</p>
      </div>
      ${hanaokaLado}
      <div class="numeros">
        <div><strong>90</strong><span>Desempenho no PageSpeed, versão computador</span></div>
        <div><strong>100</strong><span>Acessibilidade</span></div>
        <div><strong>100</strong><span>Boas práticas</span></div>
        <div><strong>100</strong><span>SEO</span></div>
      </div>
      <p style="margin-top:28px"><a class="link-fio" href="/cases/hanaoka/">Ver o case completo</a></p>
    </div>
  </section>

  <section class="secao" aria-labelledby="com-titulo">
    <div class="wrap duas">
      <h2 id="com-titulo" class="titulo-2">E quando a cotação chega?</h2>
      <div class="prosa">
        <p>Marketing industrial que para no formulário desperdiça o trabalho. A Bia treina o comercial para responder rápido e com as informações certas: <strong>quem responde, em quanto tempo e o que perguntar</strong> antes de mandar o preço.</p>
        <p>Atendemos indústrias de Cotia, Barueri, Osasco, Santana de Parnaíba e região de perto, e de todo o Brasil on-line.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Indústria precisa de Instagram?', 'O LinkedIn costuma ser a rede principal na venda entre empresas. O Instagram ajuda na marca empregadora, nos bastidores e em quem compra em menor volume. O diagnóstico mostra o peso de cada um para a sua indústria.'],
    ['Vale ter o site em inglês?', 'Vale quando a empresa exporta, tem clientes multinacionais ou quer ser encontrada por compradores de fora. A Hanaoka tem o site em português e inglês.'],
    ['Vocês gravam dentro da fábrica?', 'Sim, com roteiro aprovado antes e seguindo as regras de segurança e as áreas que podem ou não aparecer.'],
    ['Em quanto tempo a indústria aparece no Google?', 'Páginas novas costumam levar de semanas a meses para subir, conforme a concorrência de cada busca. Uma página por produto ou aplicação acelera, porque responde exatamente o que o comprador digita.'],
    ['Dá para colocar o catálogo no site?', 'Dá, e é o que mais traz busca: cada produto vira uma página com aplicação, especificação e botão de cotação, em vez de um PDF.']
  ],
  chamada: ['Sua indústria é maior do que o site dela mostra?', 'No diagnóstico olhamos site, LinkedIn, Instagram e como a cotação é respondida hoje.']
},
/* ------------------------------------------------------------------ */
{
  slug: 'marketing-para-clinicas',
  nome: 'Marketing para clínicas',
  sobre: 'marketing para clínicas',
  titulo: 'Marketing para clínicas: conteúdo, tráfego e recepção | Halo Company',
  descricao: 'Marketing para clínicas odontológicas, médicas e de estética: conteúdo com o especialista, tráfego local e treinamento da recepção para transformar lead em paciente agendado.',
  h1: 'Marketing para clínicas: do anúncio ao <em>paciente agendado</em>.',
  apoio: 'Em clínica, o lead que não é atendido rápido vira agendamento na clínica ao lado. A Halo une o conteúdo com o especialista, o tráfego e o treinamento da recepção.',
  schema: servico('Marketing para clínicas', 'Estratégia de conteúdo com o especialista, captação na clínica, tráfego pago local, site ou landing page por tratamento e treinamento da recepção.', 'Marketing para clínicas'),
  corpo: `
  <section class="secao" aria-labelledby="dor-titulo">
    <div class="wrap duas">
      <h2 id="dor-titulo" class="titulo-2">Onde a clínica perde paciente.</h2>
      ${dores([
        ['garanca', 'O anúncio atrai curioso.', 'Post impulsionado para todo mundo traz curtida, não agendamento.'],
        ['acafrao', 'O WhatsApp demora.', 'A mensagem chega no meio do atendimento e é respondida horas depois.'],
        ['celeste', 'A recepção não tem roteiro.', 'Responde o preço e para. Não pergunta, não explica o tratamento, não marca a avaliação.'],
        ['garanca', 'O especialista não aparece.', 'Paciente escolhe pessoa. Perfil só com arte pronta não gera confiança.']
      ])}
    </div>
  </section>

  <section class="secao claro" aria-labelledby="faz-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="faz-titulo" class="titulo">O que a Halo faz pela clínica.</h2>
        <p class="cabeca__apoio">A Bia já fez esse caminho em grandes clínicas odontológicas, onde cada agendamento perdido custa caro. Na Halo, ele vem junto com estratégia e site.</p>
      </div>
      ${fios3([
        ['garanca', 'Estratégia · Amanda', 'Conteúdo com o especialista', 'Linha editorial por tratamento, com o dentista ou médico explicando, tirando dúvidas e mostrando a rotina da clínica.'],
        ['acafrao', 'Tráfego e recepção · Bia', 'Do anúncio ao agendamento', 'Campanhas locais por tratamento e treinamento da recepção: tempo de resposta, roteiro de WhatsApp e como levar à avaliação.'],
        ['celeste', 'Site · João', 'Página por tratamento', 'Site ou landing page rápida para cada tratamento, com perguntas frequentes e botão direto para o WhatsApp.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="esp-titulo">
    <div class="wrap duas">
      <h2 id="esp-titulo" class="titulo-2">Para quais clínicas.</h2>
      <div class="prosa">
        <ul class="cidades">
          <li>Odontologia</li><li>Estética</li><li>Clínicas médicas</li><li>Dermatologia</li><li>Fisioterapia</li><li>Clínicas veterinárias</li>
        </ul>
        <p>Trabalhamos com clínicas de ticket alto, que querem crescer com previsibilidade. Toda publicação segue as regras de publicidade do conselho da área, como CFM e CFO. Quando uma regra limita o que pode ser mostrado, a estratégia é feita a partir dela.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Posso mostrar antes e depois?', 'Depende das regras do conselho de cada profissão, que mudam com o tempo. Avaliamos cada caso antes de publicar e, quando não pode, usamos outros formatos, como explicação do tratamento e rotina da clínica.'],
    ['Quanto investir em tráfego pago para clínica?', 'Depende da região, do tratamento e do valor de cada paciente. No diagnóstico calculamos quanto custa trazer um paciente e definimos a verba a partir disso.'],
    ['Vocês treinam a minha recepção?', 'Sim. Definimos tempo de resposta, roteiro de WhatsApp e de ligação e acompanhamos os números de leads respondidos e agendados.'],
    ['O dentista ou médico precisa gravar?', 'Ajuda muito. Paciente escolhe pessoa. Preparamos o roteiro e gravamos na própria clínica, em poucas horas.'],
    ['Vocês atendem clínicas fora de São Paulo?', 'Sim. Estratégia, tráfego e treinamento funcionam on-line. A captação pode ser presencial ou feita com a equipe da clínica, com roteiro nosso.']
  ],
  chamada: ['Quantos leads a sua clínica perde por mês?', 'No diagnóstico olhamos anúncios, perfil, site e como a recepção responde. Você sai sabendo onde o paciente está se perdendo.']
},
/* ------------------------------------------------------------------ */
{
  slug: 'cases/hanaoka',
  nome: 'Case Hanaoka',
  sobre: 'o case',
  titulo: 'Case Hanaoka: marketing e site para indústria química | Halo Company',
  descricao: 'Como a Halo Company refez a presença digital da Hanaoka, fabricante de ácidos e sais de alta pureza desde 1985: estratégia de Instagram e LinkedIn, captação na fábrica e site novo em português e inglês.',
  h1: 'Hanaoka: 40 anos de indústria química, com uma presença <em>à altura</em>.',
  apoio: 'Fabricante de ácidos e sais de alta pureza desde 1985, com laboratório e frota próprios. O site antigo não mostrava nada disso. Hoje a primeira linha diz o que a Hanaoka fabrica.',
  link2: '<a class="link-fio" href="https://hanaoka.com.br/" target="_blank" rel="noopener">Abrir o site da Hanaoka ↗</a>',
  schema: (url) => ({ '@type': 'Article', '@id': url + '#case', headline: 'Case Hanaoka: marketing e site para indústria química', about: { '@type': 'Organization', name: 'Hanaoka', url: 'https://hanaoka.com.br/' }, author: empresa, publisher: empresa, inLanguage: 'pt-BR', mainEntityOfPage: url, dateModified: HOJE }),
  corpo: `
  <section class="secao" aria-labelledby="ad-titulo">
    <div class="wrap">
      <h2 id="ad-titulo" class="titulo-2" style="margin-bottom:36px">Antes e depois.</h2>
      ${hanaokaLado}
      <div class="numeros">
        <div><strong>90</strong><span>Desempenho no PageSpeed, versão computador</span></div>
        <div><strong>100</strong><span>Acessibilidade</span></div>
        <div><strong>100</strong><span>Boas práticas</span></div>
        <div><strong>100</strong><span>SEO</span></div>
      </div>
    </div>
  </section>

  <section class="secao claro" aria-labelledby="frentes-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="frentes-titulo" class="titulo">O que fizemos.</h2>
        <p class="cabeca__apoio">As três frentes, no mesmo plano.</p>
      </div>
      ${fios3([
        ['garanca', 'Estratégia', 'Instagram e LinkedIn mensais', 'Calendário com processo, laboratório, linha de produtos e equipe, para compradores técnicos e para a marca empregadora.'],
        ['acafrao', 'Imagem', 'Captação na fábrica e no laboratório', 'Foto e vídeo da produção, do controle de qualidade e da frota, incluindo o vídeo aéreo que abre o site.'],
        ['celeste', 'Site', 'Site novo em dois idiomas', 'Português e inglês, catálogo e blog com editor próprio, em que cada post ganha uma página para ser encontrada no Google.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="baixo-titulo">
    <div class="wrap duas">
      <h2 id="baixo-titulo" class="titulo-2">O que mudou por baixo.</h2>
      <ul class="check" style="grid-template-columns:1fr">
        <li><div><b>Tema próprio.</b> Um CSS e um JS. O antigo carregava Bootstrap, duas cópias de jQuery e um carrossel.</div></li>
        <li><div><b>Imagens e vídeo leves.</b> Imagens em WebP e o aéreo da fábrica com 2,5 MB, carregando só quando aparece.</div></li>
        <li><div><b>Nota alta onde o comprador pesquisa.</b> 90, 100, 100 e 100 no PageSpeed, versão computador.</div></li>
        <li><div><b>Nada perdido no Google.</b> Redirecionamentos de todas as URLs antigas para as novas.</div></li>
        <li><div><b>Menos porta para ataque.</b> Comentários, XML-RPC e feeds desligados, o que corta spam e tentativas de invasão.</div></li>
        <li><div><b>Versão em inglês.</b> Para compradores de fora e clientes multinacionais.</div></li>
      </ul>
    </div>
  </section>`,
  faq: [
    ['Como o site foi para o ar sem risco?', 'Ele passou por uma versão de teste, aprovada pela Hanaoka, antes de ir para o endereço oficial. Estratégia e captação seguem todo mês.'],
    ['O site é em WordPress?', 'Sim, com tema próprio feito para a Hanaoka. Assim a equipe edita produtos e posts sozinha, sem o peso de um tema pronto.'],
    ['A Halo faz isso para outras indústrias?', 'Sim. Veja como trabalhamos com indústrias e aplique para um diagnóstico.']
  ],
  chamada: ['Quer um case assim na sua empresa?', 'Começa com um diagnóstico com os três sócios.'],
  veja: ['marketing-para-industrias', 'video-institucional', 'criacao-de-sites']
},
/* ------------------------------------------------------------------ */
{
  slug: 'cases/veiculo-judicial',
  nome: 'Case Veículo Judicial',
  sobre: 'o case',
  titulo: 'Case Veículo Judicial: plataforma de leilões judiciais | Halo Company',
  descricao: 'Como a Halo Company criou o Veículo Judicial, plataforma que reúne carros, motos, caminhões e tratores de leilões judiciais dos principais leiloeiros oficiais do Brasil, com o custo total estimado de cada arrematação.',
  h1: 'Veículo Judicial: os leilões judiciais do país <em>numa busca só</em>.',
  apoio: 'Carros, motos, caminhões e tratores de leilões judiciais dos principais leiloeiros oficiais do Brasil, reunidos, filtráveis e com o custo total estimado de cada arrematação.',
  link2: '<a class="link-fio" href="https://veiculojudicial.com.br/" target="_blank" rel="noopener">Abrir o Veículo Judicial ↗</a>',
  schema: (url) => ({ '@type': 'Article', '@id': url + '#case', headline: 'Case Veículo Judicial: plataforma de leilões judiciais', about: { '@type': 'WebSite', name: 'Veículo Judicial', url: 'https://veiculojudicial.com.br/' }, author: empresa, publisher: empresa, inLanguage: 'pt-BR', mainEntityOfPage: url, dateModified: HOJE }),
  corpo: `
  <section class="secao" aria-labelledby="des-titulo">
    <div class="wrap duas">
      <h2 id="des-titulo" class="titulo-2">O problema de quem compra em leilão judicial.</h2>
      ${dores([
        ['garanca', 'Os anúncios ficam espalhados.', 'Cada leiloeiro oficial publica no próprio site, num formato diferente. Para achar um carro, é preciso abrir site por site.'],
        ['acafrao', 'O preço do lance não é o preço final.', 'Quem arremata precisa calcular sozinho quanto vai pagar no total.'],
        ['celeste', 'Quem entende do assunto não aparecia.', 'O conhecimento do especialista ficava no Instagram, longe de quem estava procurando o veículo.']
      ])}
    </div>
  </section>

  <section class="secao claro" aria-labelledby="fez-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="fez-titulo" class="titulo">O que fizemos.</h2>
        <p class="cabeca__apoio">Uma plataforma de busca, não um site institucional. E um lançamento pensado junto com o Instagram.</p>
      </div>
      ${fios3([
        ['celeste', 'Site', 'Uma busca para todos os leilões', 'Os veículos dos leiloeiros oficiais reunidos num só lugar e atualizados todos os dias, com filtros para encontrar o que interessa.'],
        ['acafrao', 'Produto', 'Custo total estimado', 'Cada veículo mostra quanto a arrematação deve custar no total, e não só o valor do lance.'],
        ['garanca', 'Estratégia', 'Lançamento com o @rubensleilao', 'O lançamento foi pensado junto com o Instagram do especialista, que ganhou mais de 6 mil seguidores depois dele.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="tela-titulo">
    <div class="wrap">
      <h2 id="tela-titulo" class="titulo-2" style="margin-bottom:36px">A plataforma no ar.</h2>
      <div class="tela-site"><span class="projeto__barra" aria-hidden="true"><i></i><i></i><i></i><b>veiculojudicial.com.br</b></span><img src="/assets/img/projeto-veiculo-judicial.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Página inicial do Veículo Judicial com a busca e os anúncios de leilão"></div>
      <div class="numeros numeros--2">
        <div><strong>+6 mil</strong><span>Seguidores no @rubensleilao depois do lançamento</span></div>
        <div><strong>1 busca</strong><span>Para os leilões judiciais de vários leiloeiros oficiais</span></div>
      </div>
    </div>
  </section>`,
  faq: [
    ['O Veículo Judicial vende os veículos?', 'Não. Ele reúne os anúncios publicados pelos leiloeiros oficiais e leva a pessoa até o leilão de cada um.'],
    ['A Halo faz plataformas assim para outras empresas?', 'Sim. Quando a empresa precisa de busca, filtros e atualização automática, o site vira um produto. O diagnóstico mostra se é esse o caso.'],
    ['Por que pensar o Instagram junto com o site?', 'Porque o lançamento precisa de audiência. O site entrega o produto; o Instagram traz as pessoas e mostra quem está por trás.']
  ],
  chamada: ['Sua ideia precisa de mais do que um site?', 'No diagnóstico entendemos o negócio e dizemos se o caminho é site, landing page ou plataforma.'],
  veja: ['cases/hanaoka', 'cases/marcelo-lusardo', 'criacao-de-sites']
},
/* ------------------------------------------------------------------ */
{
  slug: 'cases/marcelo-lusardo',
  nome: 'Case Marcelo Lusardo',
  sobre: 'o case',
  titulo: 'Case Marcelo Lusardo: site e landing page Austrália Sem Fronteiras | Halo Company',
  descricao: 'Site e landing page do ecossistema Austrália Sem Fronteiras, de Marcelo Lusardo, para brasileiros que querem estudar, trabalhar e viver na Austrália. Projeto internacional da Halo Company, com valores em reais e em dólar australiano.',
  h1: 'Marcelo Lusardo: site e landing page para quem vai <em>para a Austrália</em>.',
  apoio: 'Site do Austrália Sem Fronteiras e landing page do ecossistema de Marcelo Lusardo, que leva brasileiros da dúvida ao visto aprovado. Cliente do outro lado do mundo, atendido on-line.',
  link2: '<a class="link-fio" href="https://liderdetravessias.com.br/" target="_blank" rel="noopener">Abrir o site ↗</a>',
  schema: (url) => ({ '@type': 'Article', '@id': url + '#case', headline: 'Case Marcelo Lusardo: site e landing page Austrália Sem Fronteiras', about: { '@type': 'Person', name: 'Marcelo Lusardo', url: 'https://marcelolusardo.com.br/' }, author: empresa, publisher: empresa, inLanguage: 'pt-BR', mainEntityOfPage: url, dateModified: HOJE }),
  corpo: `
  <section class="secao" aria-labelledby="dois-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="dois-titulo" class="titulo">Dois endereços, dois trabalhos.</h2>
        <p class="cabeca__apoio">O site apresenta a mentoria e a comunidade. A landing page apresenta o ecossistema inteiro, com uma ação só no fim.</p>
      </div>
      <div class="lado">
        <figure><div class="tela-site tela-site--baixa"><span class="projeto__barra" aria-hidden="true"><i></i><i></i><i></i><b>liderdetravessias.com.br</b></span><img src="/assets/img/projeto-marcelo-lusardo.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Site Austrália Sem Fronteiras, de Marcelo Lusardo"></div><figcaption><b>Site.</b> Mentoria, comunidade e plano para estudar, trabalhar e viver na Austrália.</figcaption></figure>
        <figure><div class="tela-site tela-site--baixa"><span class="projeto__barra" aria-hidden="true"><i></i><i></i><i></i><b>marcelolusardo.com.br</b></span><img src="/assets/img/projeto-marcelo-lusardo-landing.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Landing page do ecossistema Austrália Sem Fronteiras"></div><figcaption><b>Landing page.</b> Mentorias, imigração, carreira, networking e educação num único ecossistema.</figcaption></figure>
      </div>
    </div>
  </section>

  <section class="secao claro" aria-labelledby="fez-titulo">
    <div class="wrap">
      <div class="cabeca">
        <h2 id="fez-titulo" class="titulo">O que fizemos.</h2>
      </div>
      ${fios3([
        ['garanca', 'Mensagem', 'Do sonho ao plano', 'O texto fala com quem ainda está no Brasil, cheio de dúvidas, e mostra um caminho em etapas até a vida na Austrália.'],
        ['acafrao', 'Duas moedas', 'Reais e dólar australiano', 'Valores nas duas moedas e cotação ao vivo, para quem está no Brasil e para quem já está lá.'],
        ['celeste', 'Site', 'Rápido e encontrável', 'Páginas leves, escritas para o Google e organizadas para as IAs citarem o ecossistema quando alguém pergunta como ir para a Austrália.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="prova-titulo">
    <div class="wrap duas">
      <h2 id="prova-titulo" class="titulo-2">Quem está por trás.</h2>
      <div class="prosa">
        <p>Marcelo Lusardo trabalha com intercâmbio e migração para a Austrália. Segundo a Expert Education, são <strong>23 anos de mercado e mais de 200 mil vistos aprovados</strong>.</p>
        <p>O projeto mostra que a distância não atrapalha: estratégia, texto, site e ajustes aconteceram on-line, com o cliente do outro lado do mundo.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Por que um site e uma landing page separados?', 'Porque fazem trabalhos diferentes. O site apresenta a mentoria para quem chega pelo Google ou por indicação. A landing page recebe quem vem de campanha e tem uma ação só.'],
    ['Vocês atendem clientes fora do Brasil?', 'Sim. O projeto do Marcelo Lusardo foi feito on-line, com o cliente na Austrália.'],
    ['Dá para ter preços em duas moedas?', 'Dá. No projeto do Marcelo, os valores aparecem em reais e em dólar australiano, com cotação ao vivo.']
  ],
  chamada: ['Seu público está longe?', 'Atendemos o Brasil todo e clientes fora do país. O diagnóstico é on-line.'],
  veja: ['cases/veiculo-judicial', 'cases/drlsys', 'criacao-de-sites']
},
/* ------------------------------------------------------------------ */
{
  slug: 'cases/drlsys',
  nome: 'Case DRLSYS',
  sobre: 'o case',
  titulo: 'Case DRLSYS: site de infraestrutura de TI em Cotia | Halo Company',
  descricao: 'Site da DRLSYS, empresa de infraestrutura de TI, redes e segurança em Cotia/SP: do briefing ao site no ar em menos de uma semana, com a promessa de primeiro contato em até 30 minutos.',
  h1: 'DRLSYS: do briefing ao site no ar em <em>menos de uma semana</em>.',
  apoio: 'A empresa de infraestrutura de TI do João, em Cotia. Servidores, redes e segurança tratados como assunto premium, com a promessa do serviço logo na primeira tela.',
  link2: '<a class="link-fio" href="https://drlsys.com/" target="_blank" rel="noopener">Abrir o site da DRLSYS ↗</a>',
  schema: (url) => ({ '@type': 'Article', '@id': url + '#case', headline: 'Case DRLSYS: site de infraestrutura de TI em Cotia', about: { '@type': 'Organization', name: 'DRLSYS', url: 'https://drlsys.com/' }, author: empresa, publisher: empresa, inLanguage: 'pt-BR', mainEntityOfPage: url, dateModified: HOJE }),
  corpo: `
  <section class="secao" aria-labelledby="ok-titulo">
    <div class="wrap duas">
      <h2 id="ok-titulo" class="titulo-2">O que o site resolve.</h2>
      ${dores([
        ['garanca', 'Diz o que faz na primeira linha.', '"Servidores, redes e segurança que não param." Sem frase genérica sobre soluções em tecnologia.'],
        ['acafrao', 'Faz uma promessa concreta.', 'Primeiro contato em até 30 minutos, dito na descrição que aparece no Google.'],
        ['celeste', 'Fala com a região.', 'Cotia/SP no título e na descrição, para aparecer para quem procura TI por perto.']
      ])}
    </div>
  </section>

  <section class="secao" aria-labelledby="tela-titulo">
    <div class="wrap">
      <h2 id="tela-titulo" class="titulo-2" style="margin-bottom:36px">O site no ar.</h2>
      <div class="tela-site"><span class="projeto__barra" aria-hidden="true"><i></i><i></i><i></i><b>drlsys.com</b></span><img src="/assets/img/projeto-drlsys.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Site da DRLSYS, empresa de infraestrutura de TI"></div>
    </div>
  </section>

  <section class="secao" aria-labelledby="pq-titulo">
    <div class="wrap duas">
      <h2 id="pq-titulo" class="titulo-2">Por que mostramos este case.</h2>
      <div class="prosa">
        <p>A DRLSYS é a empresa de um dos sócios. Mostramos aqui porque é o exemplo mais claro de velocidade: <strong>do briefing ao site no ar em menos de uma semana</strong>.</p>
        <p>Velocidade não é pressa. O briefing já sai com a mensagem, as seções e as provas definidas, e o site é feito sob medida em cima disso.</p>
      </div>
    </div>
  </section>`,
  faq: [
    ['Todo site sai em uma semana?', 'Não. A DRLSYS é um site institucional enxuto. Sites com catálogo, dois idiomas ou migração levam algumas semanas.'],
    ['Por que um case de um dos sócios?', 'Porque mostra o processo sem filtro. Os outros cases, como Hanaoka e Veículo Judicial, são de clientes.']
  ],
  chamada: ['Precisa de um site rápido e bem feito?', 'O diagnóstico define o escopo e o prazo antes de começar.'],
  veja: ['cases/hanaoka', 'cases/veiculo-judicial', 'criacao-de-sites']
},
/* ------------------------------------------------------------------ */
{
  slug: 'cases',
  nome: 'Cases',
  sobre: 'os cases',
  titulo: 'Cases da Halo Company: sites, vídeo e estratégia',
  descricao: 'Cases da Halo Company: Hanaoka (indústria química), Veículo Judicial (plataforma de leilões), Marcelo Lusardo (Austrália Sem Fronteiras) e DRLSYS (TI em Cotia). O que fizemos e o que mudou em cada um.',
  h1: 'O que já fizemos, e <em>o que mudou</em>.',
  apoio: 'Uma indústria química de 40 anos, uma plataforma de leilões, um projeto entre Brasil e Austrália e uma empresa de TI de Cotia. Cada um com um problema diferente.',
  schema: (url) => ({ '@type': 'CollectionPage', '@id': url + '#cases', name: 'Cases da Halo Company', url, publisher: empresa, hasPart: ['hanaoka', 'veiculo-judicial', 'marcelo-lusardo', 'drlsys'].map((c) => ({ '@type': 'Article', url: `${SITE}/cases/${c}/` })) }),
  corpo: `
  <section class="secao" aria-label="Lista de cases">
    <div class="wrap">
      <div class="casos">
        <a class="caso" href="/cases/hanaoka/"><div class="caso__img"><img src="/assets/img/hanaoka-novo-desktop-topo-720.webp" width="1440" height="900" loading="lazy" decoding="async" alt="Site novo da Hanaoka"></div><small>Indústria química · Estratégia, captação e site</small><h2>Hanaoka</h2><p>Fabricante de ácidos e sais de alta pureza desde 1985. Site novo em português e inglês, captação na fábrica e LinkedIn mensal.</p><span class="seta">Ver o case</span></a>
        <a class="caso" href="/cases/veiculo-judicial/"><div class="caso__img"><img src="/assets/img/projeto-veiculo-judicial.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Página inicial do Veículo Judicial"></div><small>Plataforma de busca · Site e lançamento</small><h2>Veículo Judicial</h2><p>Os leilões judiciais do país numa busca só. Mais de 6 mil seguidores no @rubensleilao depois do lançamento.</p><span class="seta">Ver o case</span></a>
        <a class="caso" href="/cases/marcelo-lusardo/"><div class="caso__img"><img src="/assets/img/projeto-marcelo-lusardo-landing.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Landing page Austrália Sem Fronteiras"></div><small>Projeto internacional · Site e landing page</small><h2>Marcelo Lusardo</h2><p>Site e landing page para brasileiros que vão estudar, trabalhar e viver na Austrália.</p><span class="seta">Ver o case</span></a>
        <a class="caso" href="/cases/drlsys/"><div class="caso__img"><img src="/assets/img/projeto-drlsys.webp" width="720" height="3240" loading="lazy" decoding="async" alt="Site da DRLSYS"></div><small>Infraestrutura de TI · Site institucional</small><h2>DRLSYS</h2><p>Do briefing ao site no ar em menos de uma semana.</p><span class="seta">Ver o case</span></a>
      </div>
    </div>
  </section>`,
  faq: [
    ['Vocês têm cases de clínicas?', 'A Bia tem experiência com grandes clínicas odontológicas, em trabalhos anteriores à Halo. Os cases de clínica da Halo entram aqui assim que forem publicados com a aprovação dos clientes.'],
    ['Posso falar com um cliente?', 'Pode pedir no diagnóstico. Quando o cliente autoriza, colocamos vocês em contato.'],
    ['Os números dos cases são de vocês ou do cliente?', 'As notas do PageSpeed foram medidas por nós na ferramenta do Google. Os números de mercado, como os do Marcelo Lusardo, são do próprio cliente e aparecem atribuídos a ele.']
  ],
  chamada: ['Quer ser o próximo case?', 'Começa com um diagnóstico com os três sócios.'],
  veja: ['criacao-de-sites', 'video-institucional', 'marketing-para-industrias']
}

];

// Só gera quando o arquivo é executado direto (o blog importa a casca daqui).
if ((process.argv[1] || '').endsWith('paginas.mjs')) {
for (const p of conteudo) {
  const dir = raiz + p.slug + '/';
  await mkdir(dir, { recursive: true });
  await writeFile(dir + 'index.html', pagina(p));
  console.log('ok', p.slug);
}

// Sitemap: home + páginas internas.
const urls = [`${SITE}/`, ...PAGINAS.map((p) => `${SITE}/${p.slug}/`)];
await writeFile(raiz + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${HOJE}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log('sitemap', urls.length);
}
