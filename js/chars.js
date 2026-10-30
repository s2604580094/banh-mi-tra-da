/* chars.js — nhân vật 2.5D vẽ bằng canvas (người chơi và khách): 4 hướng, bước đi, cầm đồ, ngồi, rửa bát.
   OPTS = lựa chọn ngoại hình khi tạo nhân vật; need = kỷ lục điểm cần đạt để mở khóa. */
const CHAR = (() => {
  const OPTS = {
    skins: ['#F6D7BC', '#EBC09A', '#D29E74', '#A8754F'],
    hairColors: ['#1E1A18', '#4A2E20', '#8A5A32', '#6B2238'],
    colors: ['#D9443A', '#2F74B5', '#3E9B48', '#F2A516', '#7A5BA6'],
    bodies: ['f', 'm'],                       // nhân vật nữ / nam
    hairs: ['short', 'pony', 'bun', 'long'],
    outfits: [
      { id: 'apron', need: 0 }, { id: 'baba', need: 0 }, { id: 'chef', need: 250 },
      { id: 'aodai', need: 500 }, { id: 'yukata', need: 800 },
    ],
    hats: [
      { id: 'none', need: 0 }, { id: 'nonla', need: 0 }, { id: 'khan', need: 120 },
      { id: 'cap', need: 250 }, { id: 'toque', need: 400 }, { id: 'hachi', need: 650 },
    ],
  };
  const DEF = { name: '', body: 'f', hair: 'pony', hairColor: '#1E1A18', skin: '#EBC09A', outfit: 'apron', color: '#D9443A', hat: 'nonla' };

  function shade(hex, p) {
    const n = parseInt(hex.slice(1), 16), t = p < 0 ? 0 : 255, a = Math.abs(p);
    const ch = v => Math.round(v + (t - v) * a);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  }
  function pal(c) {
    const m = c.color;
    switch (c.outfit) {
      case 'baba': return { top: m, pants: '#2B2B2E' };
      case 'chef': return { top: '#F7F6F2', pants: '#3A3A3A', scarf: m };
      case 'aodai': return { top: m, pants: '#F4F1EA', tunic: true };
      case 'yukata': return { top: m, pants: m, robe: true, obi: m === '#F2A516' ? '#2F74B5' : '#F2C14E' };
      case 'tee': return { top: m, pants: '#3B4F6B' };
      default: return { top: '#F2EEE6', pants: '#3B4F6B', apron: m };
    }
  }
  let checker = null;   // hoa văn khăn rằn
  function checkerPat(g) {
    if (!checker) {
      const c = document.createElement('canvas'); c.width = c.height = 4;
      const x = c.getContext('2d');
      x.fillStyle = '#F4F1EA'; x.fillRect(0, 0, 4, 4); x.fillStyle = '#232323'; x.fillRect(0, 0, 2, 2); x.fillRect(2, 2, 2, 2);
      checker = c;
    }
    return g.createPattern(checker, 'repeat');
  }

  function draw(g, cfg, x, y, o = {}) {
    const c = { ...DEF, ...cfg }, P = pal(c);
    const dir = o.dir || 0, s = o.scale || 1, sit = !!o.sit;
    const moving = !!o.walk, sw = moving ? Math.sin(o.walk) : 0;
    const bob = moving ? -Math.abs(Math.sin(o.walk)) * 1.6 : Math.sin((o.t || 0) * 2.2) * .5;
    const busy = !!o.held || o.pose === 'wash';
    const jit = o.pose === 'wash' ? Math.sin((o.t || 0) * 18) * 1.5 : 0;
    const view = dir === 0 ? 'front' : dir === 3 ? 'back' : 'side';
    const ol = col => shade(col, -.42);
    const R = (x0, y0, w, h, r, col, line = true) => {
      // gọi thiếu bán kính bo góc, ví dụ R(x, y, w, h, màu): tự bo góc 3
      if (typeof r !== 'number') { line = col === undefined ? true : col; col = r; r = Math.min(3, w / 2, h / 2); }
      g.beginPath();
      g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      g.arcTo(x0, y0 + h, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath();
      g.fillStyle = col; g.fill();
      if (line) { g.strokeStyle = typeof col === 'string' ? ol(col) : 'rgba(0,0,0,.35)'; g.lineWidth = 1.1; g.stroke(); }
    };
    const E = (cx, cy, rx, ry, col, line) => { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = col; g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = 1.1; g.stroke(); } };
    const L = (pts, col, w) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); };
    const grad = (col, x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shade(col, .18)); gr.addColorStop(.6, col); gr.addColorStop(1, shade(col, -.2)); return gr; };
    const skinG = (cx, cy) => { const gr = g.createRadialGradient(cx - 4, cy - 5, 2, cx, cy, 15); gr.addColorStop(0, shade(c.skin, .16)); gr.addColorStop(.7, c.skin); gr.addColorStop(1, shade(c.skin, -.14)); return gr; };
    const hairG = () => { const gr = g.createLinearGradient(0, -64, 0, -36); gr.addColorStop(0, shade(c.hairColor, .3)); gr.addColorStop(1, shade(c.hairColor, -.15)); return gr; };

    g.save();
    g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 0, 13, 4.2, 0, 0, Math.PI * 2); g.fill();
    if (dir === 1) g.scale(-1, 1);          // nhìn trái = lật hình nhìn phải
    g.translate(0, bob + (sit ? 8 : 0));
    if (o.pose === 'slip') { g.translate(0, -20); g.rotate(Math.sin((o.t || 0) * 16) * .28); g.translate(0, 20); }
    const hemY = P.robe ? -3 : P.tunic ? -6 : -14;

    /* ----- chân ----- */
    function legs() {
      if (sit) {
        if (view === 'side') { R(-3, -12, 13, 6, P.pants); R(8, -12, 6, 7, '#4A3020'); }
        else { R(-8, -11, 6.5, 8, P.pants); R(1.5, -11, 6.5, 8, P.pants); }
        return;
      }
      if (P.robe) { R(-8, -3.5, 7, 3.5, '#B88A55'); R(1, -3.5, 7, 3.5, '#B88A55'); return; }
      if (view === 'side') {
        const a = sw * 4;
        R(-3.2 - a, -16, 6.5, 15, shade(P.pants, -.15)); R(-3.5 - a, -3, 9, 3.5, '#3A2618');
        R(-3.2 + a, -16, 6.5, 15, P.pants); R(-3.5 + a, -3, 9, 3.5, '#4A3020');
      } else {
        const l1 = Math.max(0, sw) * 3, l2 = Math.max(0, -sw) * 3;
        R(-7.5, -16 - l1, 6.2, 15, P.pants); R(-8, -3 - l1, 7, 3.5, '#4A3020');
        R(1.3, -16 - l2, 6.2, 15, P.pants); R(1, -3 - l2, 7, 3.5, '#4A3020');
      }
    }
    /* ----- thân + trang phục ----- */
    function torso() {
      const w = view === 'side' ? 8.5 : 11.5;
      g.beginPath();
      g.moveTo(-w + 1, -35); g.lineTo(w - 1, -35); g.quadraticCurveTo(w + 1, -34, w + 1, -30);
      g.lineTo(w + 1.5, hemY); g.lineTo(-w - 1.5, hemY); g.lineTo(-w - 1, -30); g.quadraticCurveTo(-w - 1, -34, -w + 1, -35); g.closePath();
      g.fillStyle = grad(P.top, -w, w); g.fill(); g.strokeStyle = ol(P.top); g.lineWidth = 1.1; g.stroke();
      if (P.tunic && view !== 'side') R(-12, -14, 4, 12, P.pants, false);
      const front = view === 'front', side = view === 'side';
      if (P.apron) {
        if (front) { R(-8, -29, 16, 17, P.apron); L([-6, -29, -5, -35], P.apron, 2); L([6, -29, 5, -35], P.apron, 2); }
        else if (side) R(4, -29, 5, 17, P.apron);
        else { L([-4, -22, 0, -20, 4, -22], P.apron, 2); }
      }
      if (c.outfit === 'baba' && front) { [-30, -25, -20].forEach(yy => E(0, yy, 1.3, 1.3, '#F4F1EA')); L([-3, -35, 0, -32, 3, -35], ol(P.top), 1); }
      if (c.outfit === 'chef') {
        if (front) { [-29, -24, -19].forEach(yy => { E(-3.5, yy, 1.4, 1.4, '#3A3A3A'); E(3.5, yy, 1.4, 1.4, '#3A3A3A'); }); }
        if (!side || true) { g.beginPath(); g.moveTo(-5, -35); g.lineTo(5, -35); g.lineTo(view === 'back' ? 0 : 0, -28); g.closePath(); g.fillStyle = P.scarf; g.fill(); }
      }
      if (c.outfit === 'aodai') { R(-4, -37, 8, 3.5, shade(P.top, -.15)); if (front) L([1, -33, 7, -27], ol(P.top), 1); }
      if (P.robe) {
        if (front) { L([-5, -35, 2, -25], shade(P.top, -.5), 2.5); L([5, -35, -1, -27], shade(P.top, -.5), 2.5); }
        R(-w - 1.5, -25, (w + 1.5) * 2, 5, P.obi);
        if (view === 'back') { E(0, -22.5, 5, 3.5, P.obi, ol(P.obi)); }
        for (let i = 0; i < 6; i++) E(-6 + (i % 3) * 6, -14 + Math.floor(i / 3) * 6, 1, 1, 'rgba(255,247,226,.8)');
      }
    }
    /* ----- tay ----- */
    function arm(sx, sy, hx, hy, col) {
      L([sx, sy, hx, hy], col, 5.5);
      L([sx, sy, hx, hy], shade(col, .12), 3);
      E(hx, hy, 2.8, 2.8, c.skin, ol(c.skin));
    }
    /* ----- đầu ----- */
    function head(cx) {
      R(cx - 3, -38, 6, 5, shade(c.skin, -.12), false);
      g.beginPath(); g.arc(cx, -48, 13.5, 0, Math.PI * 2); g.fillStyle = skinG(cx, -48); g.fill(); g.strokeStyle = ol(c.skin); g.lineWidth = 1.1; g.stroke();
    }
    function face() {
      const ink = '#2B2118', mood = o.mood || (o.pose === 'happy' ? 'happy' : o.pose === 'slip' ? 'worried' : 'normal');
      const eyes = view === 'front' ? [-4.6, 4.6] : [7.5];
      eyes.forEach(ex => {
        if (mood === 'happy') { g.beginPath(); g.arc(ex, -45.5, 2.2, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = ink; g.lineWidth = 1.6; g.stroke(); }
        else { E(ex, -46.5, 1.8, 2.4, ink); E(ex + .6, -47.4, .6, .6, '#fff'); }
      });
      // nữ: lông mi cong; nam: lông mày đậm
      if (c.body === 'f' && mood !== 'happy') eyes.forEach(ex => { L([ex + 1.3, -48.3, ex + 3.4, -50], ink, 1.1); L([ex - .3, -48.8, ex + .8, -50.8], ink, 1); });
      if (c.body === 'm' && mood !== 'angry' && mood !== 'worried') eyes.forEach(ex => L([ex - 2.6, -51, ex + 2.4, -51.4], shade(c.hairColor, -.1), 2));
      if (mood === 'angry' || mood === 'worried') {
        eyes.forEach(ex => L(mood === 'angry' ? [ex - 2.5, -51.5, ex + 2, -50] : [ex - 2.5, -50, ex + 2, -51.5], ink, 1.3));
      }
      const blush = view === 'front' ? [-7.8, 7.8] : [6.5];
      blush.forEach(bx => E(bx, -42.2, 2.4, 1.4, 'rgba(240,138,122,.5)'));
      const mx = view === 'front' ? 0 : 9.5;
      g.beginPath();
      if (mood === 'happy') { g.moveTo(mx - 2.5, -42); g.quadraticCurveTo(mx, -38, mx + 2.5, -42); g.closePath(); g.fillStyle = '#8B2E22'; g.fill(); }
      else if (mood === 'angry' || mood === 'worried') { g.moveTo(mx - 2, -40); g.quadraticCurveTo(mx, -42.5, mx + 2, -40); g.strokeStyle = '#7A3B2A'; g.lineWidth = 1.3; g.stroke(); }
      else { g.moveTo(mx - 2, -41.8); g.quadraticCurveTo(mx, -40, mx + 2, -41.8); g.strokeStyle = '#7A3B2A'; g.lineWidth = 1.3; g.stroke(); }
      if (view === 'side') { g.beginPath(); g.arc(14.2, -45.5, 1.4, -1.2, 1.2); g.strokeStyle = shade(c.skin, -.2); g.lineWidth = 1.1; g.stroke(); }
      if (c.glasses) eyes.forEach(ex => { g.beginPath(); g.arc(ex, -46.5, 3.6, 0, Math.PI * 2); g.strokeStyle = ink; g.lineWidth = 1; g.stroke(); });
      if (mood === 'angry') { g.beginPath(); g.arc(view === 'front' ? 0 : 1, -48, 13.5, 0, Math.PI * 2); g.fillStyle = 'rgba(229,64,47,.2)'; g.fill(); }
    }
    function hair(cx) {
      g.fillStyle = hairG(); g.strokeStyle = ol(c.hairColor); g.lineWidth = 1.1;
      if (view === 'back') {
        g.beginPath(); g.arc(cx, -48, 14.2, 0, Math.PI * 2); g.fill(); g.stroke();
        if (c.hair === 'long') { R(cx - 13, -50, 26, 24, hairG()); }
        if (c.hair === 'pony') { const k = sw * 2; L([cx, -50, cx + k, -40, cx - k, -31], c.hairColor, 6); E(cx, -51, 3, 3, c.color); }
        if (c.hair === 'bun') { E(cx, -61, 6.5, 6, c.hairColor, ol(c.hairColor)); }
        return;
      }
      if (view === 'front') {
        g.beginPath(); g.arc(cx, -48, 14.2, Math.PI * 1.03, Math.PI * 1.97);
        g.lineTo(cx + 13.5, -49); g.quadraticCurveTo(cx + 6, -57, cx, -52.5); g.quadraticCurveTo(cx - 6, -57, cx - 13.5, -49); g.closePath();
        g.fill(); g.stroke();
        if (c.hair === 'long') { R(cx - 15, -51, 4.5, 20, hairG()); R(cx + 10.5, -51, 4.5, 20, hairG()); }
        if (c.hair === 'short') { R(cx - 14.5, -50, 3.5, 8, hairG(), false); R(cx + 11, -50, 3.5, 8, hairG(), false); }
        if (c.hair === 'bun') E(cx, -62, 6.5, 6, c.hairColor, ol(c.hairColor));
      } else {
        g.beginPath(); g.moveTo(cx - 12, -38); g.arc(cx, -48, 14.5, Math.PI * .82, Math.PI * 1.88);
        g.quadraticCurveTo(cx + 11, -54, cx + 5, -52); g.quadraticCurveTo(cx - 1, -50, cx - 4, -43); g.closePath();
        g.fill(); g.stroke();
        if (c.hair === 'bun') E(cx - 8, -60, 6.5, 6, c.hairColor, ol(c.hairColor));
      }
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, -48, 10.5, Math.PI * 1.2, Math.PI * 1.45); g.stroke();
    }
    function backHair(cx) {   // tóc sau lưng (nhìn nghiêng / nhìn thẳng)
      if (view === 'side') {
        if (c.hair === 'long') R(cx - 15, -52, 12, 27, hairG());
        if (c.hair === 'pony') { const k = sw * 2.5; L([cx - 10, -53, cx - 16 - k, -44, cx - 14 + k, -33], c.hairColor, 6); E(cx - 11, -52, 3, 3, c.color); }
      } else if (view === 'front' && c.hair === 'long') R(cx - 14, -50, 28, 26, hairG());
    }
    function hat(cx) {
      const side = view === 'side';
      switch (c.hat) {
        case 'nonla': {
          const gr = g.createLinearGradient(0, -76, 0, -52); gr.addColorStop(0, '#F6E7B6'); gr.addColorStop(1, '#C7AB66');
          g.beginPath(); g.moveTo(cx - 21, -55); g.lineTo(cx + (side ? 2 : 0), -76); g.lineTo(cx + 21, -55); g.quadraticCurveTo(cx, -50, cx - 21, -55); g.closePath();
          g.fillStyle = gr; g.fill(); g.strokeStyle = '#A88A48'; g.lineWidth = 1.2; g.stroke();
          g.strokeStyle = 'rgba(168,138,72,.6)'; g.lineWidth = .8;
          [-12, -4, 4, 12].forEach(dx => { g.beginPath(); g.moveTo(cx + (side ? 2 : 0), -76); g.lineTo(cx + dx, -53.5); g.stroke(); });
          if (view === 'front') { g.beginPath(); g.moveTo(cx - 10, -52); g.quadraticCurveTo(cx, -30, cx + 10, -52); g.strokeStyle = '#8B6B3A'; g.lineWidth = .8; g.stroke(); }
          break;
        }
        case 'helmet': {
          const col = c.helmet || '#D9443A';
          g.beginPath(); g.arc(cx, -50, 14.8, Math.PI, 0); g.closePath(); g.fillStyle = grad(col, cx - 14, cx + 14); g.fill(); g.strokeStyle = ol(col); g.lineWidth = 1.1; g.stroke();
          R(cx - 15.5, -51.5, 31, 3.5, shade(col, -.3));
          g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, -50, 10, Math.PI * 1.15, Math.PI * 1.5); g.stroke();
          break;
        }
        case 'cap': {
          g.beginPath(); g.arc(cx, -50, 14, Math.PI, 0); g.closePath(); g.fillStyle = grad(c.color, cx - 14, cx + 14); g.fill(); g.strokeStyle = ol(c.color); g.lineWidth = 1.1; g.stroke();
          if (view === 'front') E(cx, -50, 12, 3.6, shade(c.color, -.2), ol(c.color));
          else if (side) R(cx + 8, -52, 13, 3.5, shade(c.color, -.2));
          break;
        }
        case 'toque':
          [[-7, -68, 7], [7, -68, 7], [0, -72, 8.5]].forEach(([dx, dy, r]) => E(cx + dx, dy, r, r, '#FAFAF7', '#BDBDB4'));
          R(cx - 11.5, -63, 23, 8, '#F4F3EE');
          break;
        case 'khan':
          g.save(); R(cx - 14.5, -57, 29, 6, checkerPat(g)); g.restore();
          if (view !== 'front') { L([cx - (side ? 13 : 2), -54, cx - (side ? 19 : 5), -44], '#232323', 3); L([cx - (side ? 13 : 2), -54, cx - (side ? 15 : -3), -42], '#F4F1EA', 3); }
          break;
        case 'hachi':
          R(cx - 14.5, -56.5, 29, 5, '#FAFAF7');
          if (view === 'front') E(cx, -54, 2.4, 2.4, '#D8261E');
          else if (side) E(cx + 11, -54, 2.2, 2.2, '#D8261E');
          if (view !== 'front') L([cx - (side ? 13 : 0), -54, cx - (side ? 18 : 3), -45], '#FAFAF7', 3);
          break;
      }
    }
    const held = () => { if (o.held) o.held(g, view === 'side' ? 15 : 0, view === 'side' ? -18 : -17); };
    const eatK = o.eat ? Math.sin((o.t || 0) * 6) : 0;

    if (view === 'front') {
      backHair(0); legs(); torso();
      if (busy) { held(); arm(-10, -32, -6, -22 + jit, P.top); arm(10, -32, 6, -22 - jit, P.top); }
      else { arm(-11, -32, -12.5 - sw, -19, P.top); arm(11, -32, 12.5 + sw, -19, P.top); }
      head(0); face(); hair(0); hat(0);
    } else if (view === 'back') {
      if (busy) held();
      legs(); torso();
      if (busy) { arm(-10, -32, -7, -25, P.top); arm(10, -32, 7, -25, P.top); }
      else { arm(-11, -32, -12.5 + sw, -19, P.top); arm(11, -32, 12.5 - sw, -19, P.top); }
      head(0); hair(0); hat(0);
    } else {
      const far = shade(P.top, -.15);
      if (busy) arm(3, -32, 14, -23 + jit, far);
      else if (o.eat) arm(3, -32, 10, -36 + eatK * 3, far);
      else arm(2, -32, 2 + Math.sin(-sw * .6) * 13, -32 + Math.cos(sw * .6) * 13, far);
      backHair(1); legs(); torso();
      if (busy) { held(); arm(-1, -32, 12, -22 - jit, P.top); }
      else arm(-1, -32, -1 + Math.sin(sw * .6) * 13, -32 + Math.cos(sw * .6) * 13, P.top);
      head(1);
      E(-2.5, -47, 2.6, 3.6, c.skin, ol(c.skin));
      face(); hair(1); hat(1);
    }
    g.restore();
  }

  // ngoại hình khách (từ LOOKS) → cấu hình vẽ
  function custCfg(look) {
    return {
      skin: look.skin, hairColor: look.hair, color: look.shirt, outfit: 'tee', glasses: look.glasses,
      hair: look.style === 'long' ? 'long' : look.style === 'bun' ? 'bun' : 'short',
      hat: ['nonla', 'helmet', 'cap'].includes(look.style) ? look.style : 'none', helmet: look.helmet,
    };
  }
  return { OPTS, DEF, draw, shade, custCfg };
})();
