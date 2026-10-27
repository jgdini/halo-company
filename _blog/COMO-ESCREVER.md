# Como escrever um texto do blog da Halo

Vale para qualquer pessoa ou agente que escreva aqui. O exemplo de referência é `2026-11-03-quanto-custa-uma-agencia-de-marketing.md`.

## A empresa

Halo Company: três sócios que cuidam da presença digital de empresas premium com um só time.
- Amanda Takahashi: estratégia e growth (Instagram, Facebook, LinkedIn, calendário pensado para gerar lead).
- Bianca Fortes (Bia): arte, tráfego e receita (captação de foto e vídeo, campanhas no Meta e no Google, treinamento do comercial; experiência em grandes clínicas odontológicas antes da Halo).
- João Dini: site, tecnologia e automações (sites rápidos, SEO, otimização para ChatGPT, Gemini e Perplexity).
Somos de Cotia e Alphaville (SP) e atendemos todo o Brasil. O valor da Halo sai depois do diagnóstico: nunca escreva um preço da Halo.

## Arquivo

`_blog/AAAA-MM-DD-slug.md`, com a data da terça-feira de publicação e o slug igual ao título sem acento, em minúsculas, com hífens. Cabeçalho obrigatório:

```
---
titulo: (até 70 caracteres, com a palavra que as pessoas buscam)
descricao: (até 160 caracteres, para o Google)
data: AAAA-MM-DD
status: rascunho
autor: Amanda Takahashi | Bianca Fortes | João Dini | Halo Company
tema: Marketing | Site | Vídeo | Tráfego | Redes | Comercial
resumo: (a resposta direta em 2 ou 3 frases; é o que as IAs citam)
---
```

O agente semanal grava `status: aprovado` direto no PR, porque o merge do PR pelo João é a aprovação. Quem escreve à mão, fora do PR, usa `rascunho` até o João aprovar.

## Regras do texto

- Português do Brasil, frases curtas, direto. Fala de empresário para empresário.
- 700 a 1.200 palavras. Títulos com `##` a cada 2 a 4 parágrafos, de preferência em forma de pergunta que o leitor faria.
- A primeira frase responde a pergunta do título. Nada de introdução genérica sobre "no mundo digital de hoje".
- Sem travessão (—). Use ponto, vírgula ou dois-pontos.
- Sem jargão de marketing: "alavancar", "potencializar", "transformar seu negócio", "estratégias robustas", "no cenário atual". Sem emojis.
- **Nunca invente número, estatística, pesquisa, cliente ou depoimento.** Só use número com fonte conferível e link para ela. Na dúvida, explique do que o valor depende em vez de dar um valor.
- Pode citar os cases reais da Halo, só com o que está nas páginas de case do site: Hanaoka (/cases/hanaoka/), Veículo Judicial (/cases/veiculo-judicial/), Marcelo Lusardo (/cases/marcelo-lusardo/), DRLSYS (/cases/drlsys/).
- Faça 1 a 3 links internos quando fizer sentido: /criacao-de-sites/, /video-institucional/, /marketing-para-industrias/, /marketing-para-clinicas/, /cases/.
- Termine com uma lista prática (perguntas para levar à reunião, checklist, próximos passos). Não termine com "conclusão".
- Publicidade de saúde segue regras dos conselhos (CFM, CFO): não prometa resultado de tratamento.

## Depois de escrever

Rode `node scripts/paginas.mjs && node scripts/blog.mjs --ate AAAA-MM-DD` (a data da terça) para gerar o HTML, e confira se `blog/<slug>/index.html` foi criado.
