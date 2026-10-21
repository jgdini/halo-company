// Grava a tela do modelo (com o vídeo do hero rodando) para a seção "O que já preparamos" da análise.
// Uso: node scripts/snapshot-gravar.mjs analise/<empresa> [segundos]
// Lê alvos.json → modelo.url e grava img/modelo-computador.mp4 e img/modelo-celular.mp4, com capas .webp.
// Precisa do ffmpeg no PATH (o Puppeteer usa para gravar).
import { readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const pasta = process.argv[2], segundos = Number(process.argv[3] || 8);
const alvos = JSON.parse(await readFile(`${pasta}/alvos.json`, 'utf8'));
if (!alvos.modelo?.url) { console.error('alvos.json sem modelo.url'); process.exit(1); }
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 180000, args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [nome, w, h, mob, saida] of [['modelo-computador', 1440, 900, false, 1100], ['modelo-celular', 390, 844, true, 390]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
  await p.goto(alvos.modelo.url, { waitUntil: 'load', timeout: 90000 });
  // Espera o vídeo do hero começar antes de gravar.
  await p.waitForFunction(() => { const v = document.querySelector('video'); return !v || (v.readyState >= 3 && !v.paused); }, { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  const bruto = `${pasta}/img/${nome}-bruto.webm`;
  const gravacao = await p.screencast({ path: bruto });
  await new Promise((r) => setTimeout(r, segundos * 1000));
  await gravacao.stop();
  await p.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', bruto, '-an', '-vf', `scale=${saida}:-2,fps=24`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${pasta}/img/${nome}.mp4`]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0.5', '-i', `${pasta}/img/${nome}.mp4`, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '72', `${pasta}/img/${nome}.webp`]);
  await rm(bruto, { force: true });
  console.log('gravado', `${pasta}/img/${nome}.mp4`);
}
await b.close();
