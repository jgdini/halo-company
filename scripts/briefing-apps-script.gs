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

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
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
