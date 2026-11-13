/* sprites.js — hình vẽ chi tiết (do Gemini vẽ) cho nguyên liệu, món ăn và đồ dùng trong bếp.
   Ảnh nằm trong img/spr/*.webp. Ảnh nào thiếu hoặc không tải được thì game tự dùng hình SVG cũ trong art.js. */
const SPR = (() => {
  const NAMES = ['bread_raw', 'bread_toast', 'bread_burnt', 'pate', 'cha', 'cha_cut', 'egg_raw', 'egg_fried', 'dua', 'rau', 'ot',
    'bo', 'bo_cut', 'nam', 'nam_cut', 'chanh', 'trash', 'bananas', 'peel', 'board', 'bell', 'jug', 'basket', 'plate',
    'cup_empty', 'cup_tea', 'cup_lemon', 'bm_pate', 'bm_thit', 'bm_trung', 'bm_bo', 'bm_nam'];
  const DATA = window.SPR_DATA || null;                       // bản 1 file: ảnh nhúng sẵn trong trang
  const src = n => DATA ? DATA[n] : 'img/spr/' + n + '.webp';
  const imgs = {}, bad = {};
  NAMES.forEach(n => {
    const im = new Image();
    im.onerror = () => { bad[n] = true; };
    im.src = src(n); imgs[n] = im;
  });
  const has = n => !!imgs[n] && !bad[n];
  const ready = n => has(n) && imgs[n].complete && imgs[n].naturalWidth > 0;

  // khóa ảnh (world.js) → tên sprite
  const FIXED = {
    'ing-pate': 'pate', 'ing-cha': 'cha', 'ing-trung': 'egg_raw', 'egg-raw': 'egg_raw', 'ing-dua': 'dua', 'ing-rau': 'rau',
    'ing-ot': 'ot', 'ing-chanh': 'chanh', lime: 'chanh', 'ing-bo': 'bo', 'ing-nam': 'nam', 'ing-cha_cut': 'cha_cut',
    'ing-bo_cut': 'bo_cut', 'ing-nam_cut': 'nam_cut', trash: 'trash', bananas: 'bananas', peel: 'peel', board: 'board',
    bell1: 'bell', bell0: 'bell', jug: 'jug', basket: 'basket', 'egg-fried': 'egg_fried', 'egg-ready': 'egg_fried',
    cup0: 'cup_empty', cup1: 'cup_tea', cup1L: 'cup_lemon',
  };
  let DISH = null;                                             // nhân đã sắp xếp → mã món
  function nameFor(key) {
    if (FIXED[key]) return FIXED[key];
    const m = /^b(raw|toast|burnt)(.*)$/.exec(key);            // bánh mì: 'b' + trạng thái + nhân
    if (!m) return null;
    if (!m[2]) return 'bread_' + m[1];
    if (m[1] !== 'toast') return null;
    if (!DISH) { DISH = {}; Object.entries(RECIPES).forEach(([id, R]) => { if (R.ings) DISH[R.ings.slice().sort().join('-')] = id; }); }
    const id = DISH[m[2]];
    return id && has('bm_' + id) ? 'bm_' + id : null;          // bánh đang kẹp dở thì vẫn vẽ bằng SVG
  }
  const isBread = n => /^(bread_|bm_)/.test(n);

  // vẽ vừa khung, giữ tỉ lệ; bánh mì vẽ nghiêng nên cho cao hơn khung một chút, đáy giữ nguyên
  function draw(ctx, n, x, y, w, h, alpha) {
    const im = imgs[n], iw = im.naturalWidth, ih = im.naturalHeight;
    let bx = x, by = y, bw = w, bh = h;
    if (isBread(n)) { bx = x - w * .05; bw = w * 1.1; bh = Math.max(h, w * .7); by = y + h - bh; }
    const s = Math.min(bw / iw, bh / ih), dw = iw * s, dh = ih * s;
    const ox = bx + (bw - dw) / 2, oy = isBread(n) ? by + bh - dh : by + (bh - dh) / 2;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(im, ox, oy, dw, dh); ctx.restore(); }
    else ctx.drawImage(im, ox, oy, dw, dh);
  }
  // canvas: có sprite thì vẽ và trả true (ảnh đang tải thì tạm chưa vẽ)
  function pic(ctx, key, x, y, w, h) {
    const n = nameFor(key);
    if (!n || !has(n)) return false;
    if (ready(n)) draw(ctx, n, x, y, w, h, key === 'bell0' ? .45 : null);
    return true;
  }
  // HTML: thay SVG bằng ảnh trong cùng khung viewBox để CSS cũ vẫn đúng cỡ
  function svg(key, vb, cls) {
    const n = nameFor(key);
    if (!n || !has(n)) return null;
    const [, , w, h] = vb.split(' ');
    return `<svg${cls ? ` class="${cls}"` : ''} viewBox="${vb}" aria-hidden="true"><image href="${src(n)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  return { NAMES, nameFor, has, ready, draw, pic, svg };
})();

// các ô thông tin (HTML) dùng hình mới; canvas thì world.js gọi SPR.pic trước
(() => {
  const o = { ...ART };
  ART.ing = k => SPR.svg('ing-' + k, '0 0 40 40') || o.ing(k);
  ART.bread = (st = 'toast', ings = []) => SPR.svg('b' + st + ings.slice().sort().join('-'), '0 0 100 54', 'bread') || o.bread(st, ings);
  ART.egg = st => SPR.svg('egg-' + st, '0 0 40 40') || o.egg(st);
  ART.jug = () => SPR.svg('jug', '0 0 80 84') || o.jug();
  ART.basket = () => SPR.svg('basket', '0 0 60 60') || o.basket();
  ART.trash = () => SPR.svg('trash', '0 0 40 48') || o.trash();
  ART.peel = () => SPR.svg('peel', '0 0 40 30') || o.peel();
  ART.bananas = () => SPR.svg('bananas', '0 0 40 40') || o.bananas();
  ART.board = () => SPR.svg('board', '0 0 40 40') || o.board();
})();
