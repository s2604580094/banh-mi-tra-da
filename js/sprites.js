/* sprites.js — hình vẽ chi tiết (do Gemini vẽ) cho nguyên liệu, món ăn và đồ dùng trong bếp.
   Ảnh nằm trong img/spr/*.webp. Ảnh nào thiếu hoặc không tải được thì game tự dùng hình SVG cũ trong art.js. */
const SPR = (() => {
  const NAMES = ['bread_raw', 'bread_toast', 'bread_burnt', 'pate', 'cha', 'cha_cut', 'egg_raw', 'egg_fried', 'dua', 'rau', 'ot',
    'bo', 'bo_cut', 'nam', 'nam_cut', 'chanh', 'trash', 'bananas', 'peel', 'board', 'bell', 'jug', 'basket', 'plate',
    'cup_empty', 'cup_tea', 'cup_lemon', 'bm_pate', 'bm_thit', 'bm_trung', 'bm_bo', 'bm_nam',
    // đồ trang trí bản đồ Phố cổ
    'p_cub', 'p_vespa', 'p_flowerbike', 'p_ganh', 'p_potbig', 'p_potsmall', 'p_pole', 'p_tree', 'p_lantern', 'p_umbrella',
    'p_stools', 'p_crate', 'p_cat', 'p_sparrow', 'p_nonla', 'p_signboard',
    // xe xôi
    'xoi_raw', 'xoi_toast', 'xoi_burnt', 'd_xoixeo', 'd_xoilap', 'd_xoitrung', 'd_ga', 'i_ruoc', 'i_dauxanh', 'i_hanh',
    'i_lap', 'i_lap_cut', 'i_ga', 'i_ga_cut', 'i_xaxiu', 'i_xaxiu_cut', 'x_steamer',
    // xe bún chả
    'buncha_raw', 'buncha_toast', 'buncha_burnt', 'd_buncha', 'd_bunfull', 'd_bunnem', 'd_nemcua', 'i_bun', 'i_rausong',
    'i_toiot', 'i_dudu', 'i_dudu_cut', 'i_nem', 'n_nem_raw', 'i_nemcua', 'i_nemcua_cut', 'i_bachi', 'i_bachi_cut'];
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
    cup0: 'cup_empty', cup1: 'cup_tea', cup1L: 'cup_lemon', 'nem-raw': 'n_nem_raw', 'nem-fried': 'i_nem',
  };
  let DISH = null;                                             // nhân đã sắp xếp → mã món
  const dishOf = (food, sorted) => {
    if (!DISH) { DISH = {}; Object.entries(RECIPES).forEach(([id, R]) => { if (R.ings) DISH[(R.food || 'banhmi') + '|' + R.ings.slice().sort().join('-')] = id; }); }
    return DISH[food + '|' + sorted];
  };
  function nameFor(key) {
    if (FIXED[key]) return FIXED[key];
    if (key.startsWith('ing-') && has('i_' + key.slice(4))) return 'i_' + key.slice(4);   // nguyên liệu xôi / bún chả
    const f = /^f:(\w+):(raw|toast|burnt):(.*)$/.exec(key);  // xôi / bún chả: 'f:món:trạng thái:nhân'
    if (f) {
      const id = f[2] === 'toast' && f[3] ? dishOf(f[1], f[3]) : null;
      return id && has('d_' + id) ? 'd_' + id : f[1] + '_' + f[2];   // làm dở: vẽ phần chính, nhân hiện ở thẻ
    }
    const m = /^b(raw|toast|burnt)(.*)$/.exec(key);            // bánh mì: 'b' + trạng thái + nhân
    if (!m) return null;
    if (!m[2]) return 'bread_' + m[1];
    if (m[1] !== 'toast') return null;
    const id = dishOf('banhmi', m[2]);
    return id && has('bm_' + id) ? 'bm_' + id : null;          // bánh đang kẹp dở thì vẫn vẽ bằng SVG
  }
  const isBread = n => /^(bread_|bm_|d_|xoi_|buncha_)/.test(n);

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
  // vẽ đồ trang trí: (cx, base) = giữa đáy, cao h, giữ tỉ lệ; flip = lật ngang
  function prop(ctx, n, cx, base, h, flip) {
    if (!ready(n)) return;
    const im = imgs[n], w = h * im.naturalWidth / im.naturalHeight;
    if (!flip) { ctx.drawImage(im, cx - w / 2, base - h, w, h); return; }
    ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, base - h, w, h); ctx.restore();
  }
  return { NAMES, nameFor, has, ready, draw, pic, svg, prop };
})();

// các ô thông tin (HTML) dùng hình mới; canvas thì world.js gọi SPR.pic trước
(() => {
  const o = { ...ART };
  ART.ing = k => SPR.svg('ing-' + k, '0 0 40 40') || o.ing(k);
  ART.bread = (st = 'toast', ings = []) => SPR.svg('b' + st + ings.slice().sort().join('-'), '0 0 100 54', 'bread') || o.bread(st, ings);
  ART.dish = (f, st = 'toast', ings = []) => SPR.svg(baseKey(f, st, ings), '0 0 100 54', 'bread') || o.dish(f, st);
  ART.nem = st => SPR.svg(friedKey('buncha', st), '0 0 40 40') || o.nem(st);
  ART.egg = st => SPR.svg('egg-' + st, '0 0 40 40') || o.egg(st);
  ART.jug = () => SPR.svg('jug', '0 0 80 84') || o.jug();
  ART.basket = () => SPR.svg('basket', '0 0 60 60') || o.basket();
  ART.trash = () => SPR.svg('trash', '0 0 40 48') || o.trash();
  ART.peel = () => SPR.svg('peel', '0 0 40 30') || o.peel();
  ART.bananas = () => SPR.svg('bananas', '0 0 40 40') || o.bananas();
  ART.board = () => SPR.svg('board', '0 0 40 40') || o.board();
})();
