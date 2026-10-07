// Recorta as fotos e logos da faixa de nomes (Arquivos/Pessoas) em quadrados WebP de 240 px.
// Fotos: recorte manual em volta do rosto. Logos: centralizados num fundo da cor da marca.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ent = `${raiz}Arquivos/Pessoas/`;
const sai = `${raiz}assets/img/pessoas/`;
await mkdir(sai, { recursive: true });
const T = 240;

const fotos = {
  'raphael-mattos': ['Raphael Mattos.jpeg', null],
  'marcus-marques': ['Marcus Marques.jpeg', { left: 95, top: 20, width: 360, height: 360 }],
  'joel-jota': ['Joel Jota.jpeg', { left: 320, top: 60, width: 540, height: 540 }],
  'graciane-barbosa': ['Graciane.jpeg', { left: 70, top: 0, width: 300, height: 300 }]
};
for (const [nome, [arq, corte]] of Object.entries(fotos)) {
  let img = sharp(ent + arq);
  if (corte) img = img.extract(corte);
  await img.resize(T, T, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toFile(`${sai}${nome}.webp`);
}

const logos = {
  community: ['Community Logo.PNG', '#ffffff', .55],
  'scale-club': ['Logo ScaleClub.jpg', null, .92],
  acelerador: ['grupo_acelerador_icon_png.png', '#ffffff', .7]
};
for (const [nome, [arq, fundo, escala]] of Object.entries(logos)) {
  const base = sharp(ent + arq);
  const meta = await base.metadata();
  // Fundo: a cor informada ou a do pixel do canto (o Scale Club tem fundo dourado).
  let bg = fundo;
  if (!bg) {
    const { data } = await sharp(ent + arq).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    bg = { r: data[0], g: data[1], b: data[2] };
  }
  // Fundo branco: corta as sobras. Fundo colorido (degradê): usa a imagem inteira para não deixar um retângulo de outro tom.
  let recortado = fundo ? await sharp(ent + arq).trim({ threshold: 20 }).toBuffer() : await sharp(ent + arq).toBuffer();
  // Community: só o coração, porque o texto do logo fica ilegível no círculo (o nome já aparece embaixo).
  if (nome === 'community') {
    const m = await sharp(recortado).metadata();
    recortado = await sharp(recortado).extract({ left: 0, top: 0, width: Math.round(m.height * 1.35), height: m.height }).trim({ threshold: 20 }).toBuffer();
  }
  const lado = Math.round(T * escala);
  const logo = await sharp(recortado).resize(lado, lado, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: T, height: T, channels: 3, background: bg } })
    .composite([{ input: logo, gravity: 'center' }]).webp({ quality: 85 }).toFile(`${sai}${nome}.webp`);
  console.log(nome, meta.width + 'x' + meta.height);
}
