// Halo Company — fios trançados (canvas), animações de rolagem (GSAP) e aplicação em etapas.
(() => {
  const raiz = document.documentElement;
  const temGsap = !!(window.gsap && window.ScrollTrigger);
  if (!temGsap) raiz.classList.remove('js-mov');
  const mov = raiz.classList.contains('js-mov');

  // Para onde vai a aplicação. Preencher antes de publicar:
  // url: endpoint que recebe JSON (Formspree, Make, n8n, planilha); whatsapp: número com DDI, só dígitos.
  const ENVIO = { url: '', whatsapp: '' };

  // Fios: cereja (estratégia), champanhe (imagem), pérola (site). Fundo bordô.
  const CORES = ['#E0506F', '#E7C493', '#F8F3EB'];
  const suave = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const mistura = (a, b, t) => a + (b - a) * t;

  /* ---------- Fios: três fios que se trançam ---------- */
  function Fios(canvas, op) {
    const ctx = canvas.getContext('2d');
    const st = Object.assign({ t: 1, fase: 0, revela: 1, cy: .5, amp: .3, onda: 300, espaco: .3, lw: 9, halo: 7, fundo: '#3A0D18' }, op);
    let w = 0, h = 0, dpr = 1;

    function medir() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      desenhar();
    }

    function desenhar() {
      if (!w || !h) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const e = suave(Math.min(Math.max(st.t, 0), 1));
      const cy = h * st.cy, A = h * st.amp, k = (Math.PI * 2) / Math.min(st.onda, w * .45), esp = h * st.espaco;
      const passo = 5, fim = w * st.revela;
      const inicioSolto = [.04, .12, 0], fimSolto = [.78, .94, .66];
      const segs = [];

      for (let i = 0; i < 3; i++) {
        const off = i * Math.PI * 2 / 3;
        const x0 = mistura(w * inicioSolto[i], -passo, e);
        const x1 = Math.min(mistura(w * fimSolto[i], w + passo, e), fim);
        let px = null, py = 0;
        for (let x = x0; x <= x1 + passo; x += passo) {
          const xx = Math.min(x, x1);
          const th = xx * k + st.fase + off;
          const yTranca = cy + A * Math.sin(th);
          const u = xx / w;
          const ySolto = cy + (i - 1) * esp + Math.sin(u * Math.PI * 1.7 + i * 1.9 + st.fase * .25) * h * .08 + Math.sin(u * Math.PI) * esp * .35 * (i - 1);
          const y = mistura(ySolto, yTranca, e);
          if (px !== null) segs.push([Math.cos(th) * e, i, px, py, xx, y]);
          px = xx; py = y;
          if (xx >= x1) break;
        }
      }

      segs.sort((a, b) => a[0] - b[0]);
      for (const [z, i, xa, ya, xb, yb] of segs) {
        const l = st.lw * (1 + .3 * z);
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = st.fundo; ctx.lineWidth = l + st.halo;
        ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
        ctx.globalAlpha = .55 + .45 * (z + 1) / 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = CORES[i]; ctx.lineWidth = l;
        ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    medir();
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(canvas);
    return { st, desenhar };
  }

  /* ---------- Topo ---------- */
  const topo = document.getElementById('topo');
  let ultimoY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    topo.classList.toggle('rolou', y > 24);
    topo.classList.toggle('some', y > 400 && y > ultimoY && !topo.contains(document.activeElement));
    ultimoY = y;
  }, { passive: true });

  /* ---------- Trança do topo ---------- */
  const hero = Fios(document.getElementById('fios-hero'), { fundo: '#3A0D18', amp: .3, lw: 9, onda: 440, revela: mov ? 0 : 1 });
  const soltos = Fios(document.getElementById('canvas-soltos'), { fundo: '#2A0811', amp: .26, lw: 8, onda: 420, t: mov ? 0 : 1 });

  if (mov) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // Entrada: os fios correm da esquerda para a direita e seguem girando devagar.
    gsap.to(hero.st, { revela: 1, duration: 2.2, delay: .3, ease: 'power3.inOut' });
    let heroVisivel = true, velocidade = 0;
    new IntersectionObserver(([en]) => { heroVisivel = en.isIntersecting; }).observe(document.getElementById('fios-hero'));
    ScrollTrigger.create({ onUpdate: (s) => { velocidade = Math.min(Math.abs(s.getVelocity()) / 1200, 4); } });
    gsap.ticker.add((_, dt) => {
      if (!heroVisivel) return;
      velocidade *= .94;
      hero.st.fase += (dt / 1000) * (.55 + velocidade);
      hero.desenhar();
    });

    // Fios soltos: a rolagem trança os três fios e acende cada frase.
    const itens = [...document.querySelectorAll('.soltos__lista li')];
    const fecho = document.querySelector('.soltos__fecho');
    ScrollTrigger.create({
      trigger: '.soltos', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (s) => {
        const p = s.progress;
        soltos.st.t = Math.min(Math.max((p - .42) / .4, 0), 1);
        soltos.st.fase = p * 7;
        soltos.desenhar();
        itens.forEach((li, i) => li.classList.toggle('on', p > .04 + i * .12));
        fecho.classList.toggle('on', p > .5);
      }
    });

    // Revelação dos blocos.
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'power3.out' })
    });

    // Títulos de seção sobem palavra por palavra.
    document.querySelectorAll('.titulo:not(.soltos__titulo)').forEach((t) => {
      const palavras = t.textContent.trim().split(/\s+/);
      t.setAttribute('aria-label', t.textContent.trim());
      t.innerHTML = palavras.map((p) => `<span class="pal" aria-hidden="true"><span>${p}</span></span>`).join(' ');
      gsap.from(t.querySelectorAll('.pal > span'), {
        yPercent: 110, duration: 1, stagger: .045, ease: 'power4.out',
        scrollTrigger: { trigger: t, start: 'top 85%', once: true }
      });
    });

    const mm = gsap.matchMedia();
    // Depoimentos em alturas diferentes andam em velocidades diferentes.
    mm.add('(min-width: 981px)', () => {
      document.querySelectorAll('.depo__item').forEach((el, i) => {
        gsap.to(el, { y: -40 * i, ease: 'none', scrollTrigger: { trigger: '.depo', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    // Método: o fio percorre os passos.
    const passos = [...document.querySelectorAll('.passo')];
    const fioMetodo = (eixo) => () => {
      gsap.fromTo('.fio-linha span', { [eixo]: 0 }, {
        [eixo]: 1, ease: 'none',
        scrollTrigger: {
          trigger: '.passos', start: 'top 75%', end: 'bottom 55%', scrub: .6,
          onUpdate: (s) => passos.forEach((p, i) => p.classList.toggle('on', s.progress >= i / passos.length + .02))
        }
      });
    };
    mm.add('(min-width: 981px)', fioMetodo('scaleX'));
    mm.add('(max-width: 980px)', fioMetodo('scaleY'));

    // Antes e depois: um aceno ao entrar na tela mostra que dá para arrastar.
    const palco = document.getElementById('ad-palco');
    const range = document.getElementById('ad-range');
    const aceno = { v: 50 };
    gsap.timeline({ scrollTrigger: { trigger: palco, start: 'top 70%', once: true } })
      .to(aceno, { v: 78, duration: .9, ease: 'power2.inOut' })
      .to(aceno, { v: 28, duration: 1.1, ease: 'power2.inOut' })
      .to(aceno, { v: 50, duration: .8, ease: 'power2.out' })
      .eventCallback('onUpdate', () => { palco.style.setProperty('--pos', aceno.v + '%'); range.value = aceno.v; });

    // Projetos: a página de cada site rola dentro da janela enquanto a pessoa rola a nossa.
    document.querySelectorAll('.projeto__tela img').forEach((img) => {
      const tela = img.parentElement;
      gsap.fromTo(img, { y: 0 }, {
        y: () => -(img.offsetHeight - tela.offsetHeight) * .5, ease: 'none',
        scrollTrigger: { trigger: tela, start: 'top 90%', end: 'bottom 10%', scrub: .8, invalidateOnRefresh: true }
      });
    });
  }

  /* ---------- Cenas: a marca crescendo em fios de luz ---------- */
  // Só monta as cenas quando a seção está chegando perto da tela (alivia o carregamento).
  if (mov) new IntersectionObserver((ens, io) => { if (ens.some((e) => e.isIntersecting)) { io.disconnect(); cenas(); } }, { rootMargin: '600px 0px' }).observe(document.getElementById('cenas'));
  function cenas() {
    const { gsap, ScrollTrigger } = window;
    const canvas = document.getElementById('cenas-canvas');
    const ctx = canvas.getContext('2d');
    const frases = [...document.querySelectorAll('.cena')];
    const nos = [...document.querySelectorAll('.cenas__no')];
    const marcas = [...document.querySelectorAll('.cenas__marcas i')];
    const N = frases.length;
    const RGB = { r: [224, 80, 111], a: [231, 196, 147], c: [248, 243, 235], b: [255, 246, 236] };
    const cor = (k, al) => `rgba(${RGB[k][0]},${RGB[k][1]},${RGB[k][2]},${al})`;
    const lim = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
    const sai = (t) => 1 - Math.pow(1 - t, 3);
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, p = 0, visivel = false, T = 0;
    let posNos = [];
    const ultimo = [];

    function medir() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cx = W / 2; cy = H * .6; R = Math.min(W * .3, H * .26);
      // Corrente final: na horizontal no desktop, em zigue-zague vertical no celular.
      posNos = W > H
        ? [[-1.5, -.45], [-.5, .4], [.5, -.4], [1.5, .45]].map(([x, y]) => [cx + x * R, cy + y * R])
        : [[-.45, -1.05], [.45, -.35], [-.45, .35], [.45, 1.05]].map(([x, y]) => [cx + x * R * 1.6, cy + y * R]);
      nos.forEach((n, i) => { n.style.left = posNos[i][0] + 'px'; n.style.top = posNos[i][1] + 'px'; });
    }

    // Brilho barato: gradiente radial somado (sem shadowBlur).
    function luz(x, y, r, k, al) {
      if (al <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, cor(k, al)); g.addColorStop(.35, cor(k, al * .35)); g.addColorStop(1, cor(k, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Traço com halo: três passadas, da mais larga e fraca à mais fina.
    function traco(pts, k, al, larg = 2) {
      if (pts.length < 2 || al <= 0) return;
      for (const [w, a] of [[larg * 7, .06], [larg * 3, .18], [larg, .95]]) {
        ctx.strokeStyle = cor(k, a * al); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    }
    const amostra = (f, de, ate, n = 80) => { const out = []; for (let i = 0; i <= n; i++) out.push(f(de + (ate - de) * i / n)); return out; };

    const cenasDesenho = [
      // 1. Faísca
      (u, a) => {
        const e = sai(u), r = R * (.03 + .07 * e);
        luz(cx, cy, r * 9, 'a', .22 * a);
        luz(cx, cy, r * 2.2, 'b', .95 * a);
        const lw = W * .55 * e, g = ctx.createLinearGradient(cx - lw, 0, cx + lw, 0);
        g.addColorStop(0, cor('a', 0)); g.addColorStop(.5, cor('b', .8 * a)); g.addColorStop(1, cor('a', 0));
        ctx.fillStyle = g; ctx.fillRect(cx - lw, cy - 1, lw * 2, 2);
        for (let i = 0; i < 14; i++) {
          const ang = i / 14 * Math.PI * 2 + T * .25, d = R * (.35 + .5 * e) * (1 + .15 * Math.sin(T * 2 + i));
          luz(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 7, 'a', .7 * a * e);
        }
      },
      // 2. Direção: um fio rosa traça o caminho
      (u, a) => {
        const meia = Math.min(R * 1.7, W * .4);
        const P = (t) => [cx - meia + meia * 2 * t, cy - R * .45 * Math.sin(t * Math.PI * 2) * (1 - t * .3)];
        const h = sai(lim(u * 1.25));
        traco(amostra(P, 0, h), 'r', a, 2.5);
        const [hx, hy] = P(h);
        luz(hx, hy, 46, 'r', .55 * a); luz(hx, hy, 10, 'b', a);
        luz(...P(0), 22, 'a', .5 * a * (1 - h));
      },
      // 3. Imagem: o visor da câmera e o flash
      (u, a) => {
        const w = R * 1.7, h = R * 1.15, x = cx - w / 2, y = cy - h / 2, c = Math.min(w, h) * .28 * sai(lim(u / .4));
        const f = Math.max(0, 1 - Math.abs(u - .5) / .09);
        if (u > .5) { ctx.fillStyle = cor('a', .07 * a); ctx.fillRect(x, y, w, h); }
        for (const [px, py, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]])
          traco([[px + sx * c, py], [px, py], [px, py + sy * c]], 'a', a, 2.5);
        luz(cx, cy, R * 2.2, 'b', .75 * f * a);
        if (u > .5) luz(x + w - 18, y + 18, 9, 'r', a * (.6 + .4 * Math.sin(T * 6)));
      },
      // 4. Ritmo: arcos que acendem como um calendário de posts
      (u, a) => {
        const by = cy + R * .6, ks = ['r', 'a', 'c', 'r', 'a'];
        for (let i = 0; i < 5; i++) {
          const ai = lim((u - i * .1) / .25) * a, rr = R * (.35 + i * .24);
          if (ai <= 0) continue;
          traco(amostra((t) => [cx + Math.cos(Math.PI + t * Math.PI) * rr, by + Math.sin(Math.PI + t * Math.PI) * rr], 0, sai(ai), 60), ks[i], .45 * ai, 1.4);
          const k = i + 2, dir = i % 2 ? 1 : -1;
          for (let j = 0; j < k; j++) {
            const t = (((T * .12 * dir + j / k) % 1) + 1) % 1, ang = Math.PI + t * Math.PI;
            luz(cx + Math.cos(ang) * rr, by + Math.sin(ang) * rr, 16, ks[i], .9 * ai);
          }
        }
        ctx.fillStyle = cor('b', .5 * a); ctx.fillRect(cx - R * 1.45, by, R * 2.9, 1);
      },
      // 5. Tudo se conecta: o infinito com os três fios
      (u, a) => {
        const A = R * 1.55, L = (t) => { const s = Math.sin(t), d = 1 + s * s; return [cx + A * Math.cos(t) / d, cy + A * s * Math.cos(t) / d]; };
        traco(amostra(L, 0, Math.PI * 2 * sai(lim(u * 1.4)), 140), 'b', .14 * a, 1.2);
        ['r', 'a', 'c'].forEach((k, i) => {
          const cab = T * .9 + i * Math.PI * 2 / 3;
          traco(amostra(L, cab - 1.1, cab, 40), k, a * lim(u * 3), 2.4);
          const [hx, hy] = L(cab);
          luz(hx, hy, 34, k, .6 * a); luz(hx, hy, 8, 'b', a);
        });
      },
      // 6. Do post ao cliente: a corrente de nós
      (u, a) => {
        const ks = ['r', 'a', 'c'];
        for (let i = 0; i < 3; i++) {
          const ai = lim((u - .08 - i * .2) / .2);
          if (ai <= 0) continue;
          const [x0, y0] = posNos[i], [x1, y1] = posNos[i + 1];
          // Curva de Bézier com o ponto de controle deslocado para o lado, alternando a cada trecho.
          const lado = i % 2 ? -1 : 1;
          const kx = (x0 + x1) / 2 + (W > H ? 0 : R * .6 * lado), ky = (y0 + y1) / 2 + (W > H ? R * .5 * lado : 0);
          const C = (t) => { const q = 1 - t; return [q * q * x0 + 2 * q * t * kx + t * t * x1, q * q * y0 + 2 * q * t * ky + t * t * y1]; };
          traco(amostra(C, 0, sai(ai), 50), ks[i], a, 2);
          if (ai < 1) { const [hx, hy] = C(sai(ai)); luz(hx, hy, 26, ks[i], .7 * a); }
        }
        const fim = lim((u - .72) / .2);
        if (fim > 0) luz(posNos[3][0], posNos[3][1], R * .9, 'b', .35 * fim * a);
        nos.forEach((n, i) => n.classList.toggle('on', a > .3 && u > .05 + i * .2));
      }
    ];

    function envelope(i) {
      const u = (p - i / N) * N;
      let a = Math.min((u + .1) / .2, (1.1 - u) / .2);
      if (i === 0 && u < .5) a = 1;
      if (i === N - 1 && u > .5) a = 1;
      return [lim(u), lim(a)];
    }

    function desenhar() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        const [u, a] = envelope(i);
        if (a > 0) cenasDesenho[i](u, a);
        // Só mexe no estilo quando o valor muda, para não recalcular a página a cada quadro.
        const op = Math.round(a * 100) / 100;
        if (op !== ultimo[i]) {
          ultimo[i] = op;
          frases[i].style.opacity = op;
          frases[i].style.transform = `translateY(${(1 - op) * (u > .5 ? -18 : 18)}px)`;
        }
      }
      if (envelope(N - 1)[1] <= 0) nos.forEach((n) => n.classList.remove('on'));
      ctx.globalCompositeOperation = 'source-over';
      const atual = Math.min(N - 1, Math.floor(p * N));
      marcas.forEach((m, i) => m.classList.toggle('on', i <= atual));
    }

    medir();
    if ('ResizeObserver' in window) new ResizeObserver(() => { medir(); desenhar(); }).observe(canvas);
    ScrollTrigger.create({
      trigger: '.cenas', start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => { p = s.progress; },
      onToggle: (s) => { visivel = s.isActive; }
    });
    new IntersectionObserver(([en]) => { visivel = en.isIntersecting; }).observe(canvas);
    gsap.ticker.add((tempo) => { if (!visivel) return; T = tempo; desenhar(); });
    desenhar();
  }

  /* ---------- Antes e depois ---------- */
  const palco = document.getElementById('ad-palco');
  document.getElementById('ad-range').addEventListener('input', (e) => palco.style.setProperty('--pos', e.target.value + '%'));

  /* ---------- Aplicação em etapas ---------- */
  const form = document.getElementById('form-aplicar');
  const etapas = [...form.querySelectorAll('.form__passo')];
  const barra = document.getElementById('form-barra');
  const rotulo = document.getElementById('form-etapa');
  const erro = document.getElementById('form-erro');
  const bVoltar = document.getElementById('form-voltar');
  const bAvancar = document.getElementById('form-avancar');
  const bEnviar = document.getElementById('form-enviar');
  let atual = 0;

  const tel = form.elements.whatsapp;
  tel.addEventListener('input', () => {
    const d = tel.value.replace(/\D/g, '').slice(0, 11);
    tel.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });

  function mostrar(n) {
    etapas[atual].classList.remove('ativo');
    atual = n;
    etapas[atual].classList.add('ativo');
    barra.style.width = ((atual + 1) / etapas.length) * 100 + '%';
    rotulo.textContent = `Etapa ${atual + 1} de ${etapas.length}`;
    bVoltar.hidden = atual === 0;
    bAvancar.hidden = atual === etapas.length - 1;
    bEnviar.hidden = atual !== etapas.length - 1;
    erro.textContent = '';
    const primeiro = etapas[atual].querySelector('input, select, textarea');
    if (primeiro) primeiro.focus({ preventScroll: true });
  }

  function valida() {
    const campos = [...etapas[atual].querySelectorAll('input, select, textarea')];
    let ok = true;
    const grupos = new Set();
    for (const c of campos) {
      if (c.type === 'radio') { grupos.add(c.name); continue; }
      let valido = c.checkValidity() && c.value.trim() !== '';
      if (c.name === 'whatsapp') valido = c.value.replace(/\D/g, '').length >= 10;
      c.setAttribute('aria-invalid', String(!valido));
      if (!valido) ok = false;
    }
    for (const g of grupos) if (!form.querySelector(`input[name="${g}"]:checked`)) ok = false;
    erro.textContent = ok ? '' : 'Preencha os campos desta etapa para continuar.';
    return ok;
  }

  bAvancar.addEventListener('click', () => { if (valida()) mostrar(atual + 1); });
  bVoltar.addEventListener('click', () => mostrar(atual - 1));
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && atual < etapas.length - 1) { e.preventDefault(); bAvancar.click(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valida()) return;
    const dados = Object.fromEntries(new FormData(form));
    bEnviar.disabled = true;
    try {
      if (ENVIO.url) {
        const r = await fetch(ENVIO.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(dados) });
        if (!r.ok) throw new Error(r.status);
      } else if (ENVIO.whatsapp) {
        const txt = `Aplicação Halo Company\n\nNome: ${dados.nome}\nWhatsApp: ${dados.whatsapp}\nE-mail: ${dados.email}\nEmpresa: ${dados.empresa}\nSegmento: ${dados.segmento}\nPerfil: ${dados.perfil}\nFaturamento: ${dados.faturamento}\nInvestimento em marketing: ${dados.investimento}\nObjetivo: ${dados.objetivo}`;
        window.open(`https://wa.me/${ENVIO.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
      } else {
        console.warn('Halo Company: destino da aplicação não configurado (ENVIO em main.js).', dados);
      }
      form.classList.add('enviado');
      const ok = document.getElementById('form-ok');
      ok.hidden = false; ok.focus();
    } catch {
      erro.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.';
      bEnviar.disabled = false;
    }
  });
})();
