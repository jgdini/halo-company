/**
 * Recebe o briefing da página halo-company/briefing/ e grava:
 *  1. uma linha na aba "Respostas" desta planilha (uma coluna por pergunta);
 *  2. um Google Doc organizado na pasta "Briefings Halo" do Drive;
 *  3. um e-mail de aviso para AVISAR, com o link do documento.
 *
 * Instalação (uma vez só):
 *  - Crie uma planilha no Google Planilhas chamada "Briefings Halo".
 *  - Extensões > Apps Script. Apague o que estiver lá e cole este arquivo inteiro. Salve.
 *  - Implantar > Nova implantação > tipo "App da Web".
 *      Executar como: Eu.   Quem pode acessar: Qualquer pessoa.
 *  - Autorize (se aparecer "app não verificado": Avançado > Acessar). É o seu próprio script.
 *  - Copie o endereço que termina em /exec e mande para o Claude colocar na página.
 *  Se mudar este código depois: Implantar > Gerenciar implantações > editar > Nova versão.
 */
var AVISAR = '';   // vazio = avisa o dono da planilha; ou escreva e-mails separados por vírgula
var PASTA = 'Briefings Halo';
// Aplicações da página inicial (formulário "Aplicar para um diagnóstico"): para quem vai o e-mail.
var AVISAR_APLICACAO = 'joao@drlsys.com';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.tipo === 'aplicacao') return aplicacao(d);
    if (d.tipo === 'revisao') return revisao(d);
    var linhas = [];
    d.secoes.forEach(function (s) { s.respostas.forEach(function (r) { linhas.push(r); }); });

    // 1. Planilha: cria colunas novas quando aparece pergunta nova.
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostas') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Respostas');
    var fixos = ['Recebido em', 'Empresa', 'Nome', 'Projeto', 'Documento'];
    var cab = aba.getLastColumn() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0] : [];
    if (!cab.length) { cab = fixos.slice(); }
    linhas.forEach(function (r) { if (cab.indexOf(r.pergunta) < 0) cab.push(r.pergunta); });
    aba.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
    aba.setFrozenRows(1);

    // 2. Documento no Drive.
    var doc = DocumentApp.create('Briefing · ' + (d.empresa || 'sem nome') + ' · ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy'));
    var corpo = doc.getBody();
    corpo.appendParagraph('Briefing · ' + (d.empresa || '')).setHeading(DocumentApp.ParagraphHeading.TITLE);
    corpo.appendParagraph((d.nome || '') + ' · ' + (d.tipoProjeto || '') + ' · recebido em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'));
    d.secoes.forEach(function (s) {
      corpo.appendParagraph(s.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      s.respostas.forEach(function (r) {
        corpo.appendParagraph(r.pergunta).setHeading(DocumentApp.ParagraphHeading.HEADING3);
        corpo.appendParagraph(r.resposta || '— sem resposta —');
      });
    });
    doc.saveAndClose();
    var arquivo = DriveApp.getFileById(doc.getId());
    var pastas = DriveApp.getFoldersByName(PASTA);
    var pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA);
    arquivo.moveTo(pasta);

    var porPergunta = {};
    linhas.forEach(function (r) { porPergunta[r.pergunta] = r.resposta; });
    var linha = cab.map(function (c) {
      if (c === 'Recebido em') return new Date();
      if (c === 'Empresa') return d.empresa;
      if (c === 'Nome') return d.nome;
      if (c === 'Projeto') return d.tipoProjeto;
      if (c === 'Documento') return doc.getUrl();
      return porPergunta[c] || '';
    });
    aba.appendRow(linha);

    // 3. Aviso por e-mail.
    MailApp.sendEmail(AVISAR || Session.getEffectiveUser().getEmail(), 'Novo briefing: ' + (d.empresa || 'sem nome'),
      (d.nome || '') + ' enviou o briefing de ' + (d.tipoProjeto || 'projeto') + '.\n\nDocumento: ' + doc.getUrl() + '\nPlanilha: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(erro) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Voto na página de revisão do blog (/revisao/...): uma linha na aba "Revisões do blog" e um e-mail para AVISAR_APLICACAO.
 */
function revisao(d) {
  var limpa = function (v) { return String(v == null ? '' : v).slice(0, 3000); };
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName('Revisões do blog') || planilha.insertSheet('Revisões do blog');
  if (!aba.getLastRow()) aba.appendRow(['Recebido em', 'Texto', 'Arquivo', 'Quem', 'Decisão', 'Comentário']).setFrozenRows(1);
  var decisao = d.decisao === 'aprovado' ? 'Aprovado' : 'Pediu ajuste';
  aba.appendRow([new Date(), limpa(d.titulo), limpa(d.slug), limpa(d.quem), decisao, limpa(d.comentario)]);
  var esc = function (s) { return limpa(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'); };
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#3A0D18">' +
    '<p style="margin:0 0 10px;font-size:16px"><b>' + esc(d.quem) + ': ' + decisao + '</b></p>' +
    '<p style="margin:0 0 10px">Texto: ' + esc(d.titulo) + '</p>' +
    (d.comentario ? '<p style="margin:0 0 10px;padding:10px 14px;background:#F5EFE6;border-radius:8px">' + esc(d.comentario) + '</p>' : '') +
    '<p style="margin:14px 0 0;color:#7A5A62;font-size:12px">Todos os votos ficam na aba "Revisões do blog": ' + planilha.getUrl() + '</p></div>';
  MailApp.sendEmail(AVISAR_APLICACAO, 'Blog: ' + limpa(d.quem) + ' ' + decisao.toLowerCase() + ' · ' + limpa(d.titulo), decisao + ' por ' + limpa(d.quem) + ': ' + limpa(d.titulo), { htmlBody: html, name: 'Revisão do blog Halo' });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Aplicação enviada pela página inicial: uma linha na aba "Aplicações" e um e-mail para AVISAR_APLICACAO.
 * O "Responder" do e-mail vai direto para quem se aplicou.
 */
function aplicacao(d) {
  var campos = [
    ['nome', 'Nome'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['empresa', 'Empresa'], ['segmento', 'Segmento'],
    ['perfil', 'Perfil'], ['faturamento', 'Faturamento'], ['investimento', 'Investimento em marketing'], ['objetivo', 'Objetivo'], ['origem', 'Página de origem']
  ];
  var limpa = function (v) { return String(v == null ? '' : v).slice(0, 2000); };
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName('Aplicações') || planilha.insertSheet('Aplicações');
  if (!aba.getLastRow()) aba.appendRow(['Recebido em'].concat(campos.map(function (c) { return c[1]; }))).setFrozenRows(1);
  aba.appendRow([new Date()].concat(campos.map(function (c) { return limpa(d[c[0]]); })));

  var esc = function (s) { return limpa(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'); };
  var linhas = campos.map(function (c) {
    return '<tr><td style="padding:8px 14px 8px 0;color:#7A5A62;vertical-align:top;white-space:nowrap">' + c[1] + '</td><td style="padding:8px 0;color:#3A0D18">' + (esc(d[c[0]]) || '—') + '</td></tr>';
  }).join('');
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">' +
    '<p style="margin:0 0 14px;font-size:16px;color:#3A0D18"><b>Nova aplicação pelo site da Halo Company</b></p>' +
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + linhas + '</table>' +
    '<p style="margin:18px 0 0;color:#7A5A62;font-size:12px">Responda este e-mail para falar direto com ' + esc(d.nome) + '. Todas as aplicações ficam na aba "Aplicações" da planilha: ' + planilha.getUrl() + '</p></div>';
  var opcoes = { htmlBody: html, name: 'Site Halo Company' };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpa(d.email))) opcoes.replyTo = limpa(d.email);
  MailApp.sendEmail(AVISAR_APLICACAO, 'Nova aplicação: ' + (limpa(d.empresa) || limpa(d.nome) || 'site'), 'Nova aplicação pelo site da Halo Company. Abra em HTML para ver os dados.', opcoes);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
