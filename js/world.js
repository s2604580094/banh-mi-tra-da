/* world.js — bản đồ quán nhìn chéo 2.5D: va chạm, chọn khu đang đứng gần, vẽ sàn, quầy, đồ ăn, khách.
   Có 2 bản đồ: "coop" (Cùng bán) và "versus" (Bếp Chiến 2 đội). useMap() đổi bản đồ.
   Toạ độ thế giới tính bằng ô (x cột, y hàng; y là chân nhân vật). */
const TW = 48, TH = 40, OY = 100;
let UIZ = 1;                                                        // phóng to chữ trên canvas khi màn hình nhỏ (layout.js đặt)
let MAP_CUR = MAP, MAPCFG = null, OVR = null;                       // OVR: ô bị đổi tạm thời (giờ cao điểm đảo khay)
let COLS = MAP[0].length, ROWS = MAP.length, VW = COLS * TW, VH = OY + ROWS * TH + 60;
let VIEWX0 = 0, VIEWX1 = VW;                                        // phần cảnh đang hiện trên màn hình (camera)
const PCOL = ['#D9443A', '#2F74B5', '#3E9B48', '#E0A21A'];          // màu người chơi 1–4 (Cùng bán)

function tileAt(x, y) {
  if (OVR) { const o = OVR[x + ',' + y]; if (o) return o; }
  return (MAP_CUR[y] && MAP_CUR[y][x]) || '#';
}
const keyOf = (x, y) => x + ',' + y;
const STATION = {
  B: 'stBread', G: 'stGrill', E: 'stEgg', P: 'stPan', J: 'stJug', L: 'stLemon', C: 'stCups', S: 'stSink',
  R: 'stPlates', V: 'stGlasses', X: 'stTrash', W: 'stWrap', m: 'stTake', '=': 'stCounter', T: 'stTable',
  K: 'stBoard', Z: 'stChaRoll', N: 'stBanana', Q: 'stBell', M: 'stMarket',
  p: 'ing', q: 'ing', u: 'ing', r: 'ing', o: 'ing',
};
const BIN = { p: 'pate', q: 'cha', u: 'dua', r: 'rau', o: 'ot' };
const WINDOW_COLS = [2, 4, 6];                                      // 3 chỗ khách mang về đứng ngoài quầy (Cùng bán)
const isInteract = (x, y) => STATION[tileAt(x, y)] !== undefined;
const isWalk = (x, y) => '.,c:'.includes(tileAt(x, y));
const usesIng = (k, recipes) => recipes.some(r => RECIPES[r].type === 'food' && RECIPES[r].ings.includes(k));
// khu chưa mở theo thực đơn hiện tại
function isLocked(ch, recipes) {
  if (ch === 'E' || ch === 'P') return !usesIng('trung', recipes);
  if (ch === 'L') return !recipes.includes('trachanh');
  if (ch === 'Z') return !usesIng('cha', recipes);
  if (BIN[ch]) return !usesIng(BIN[ch], recipes);
  return false;
}
const winOfCol = col => Math.max(0, Math.min(2, Math.floor((col - 1.5) / 2)));
// đội sở hữu ô (Bếp Chiến): 0 = Đội Đỏ (trái), 1 = Đội Xanh (phải), -1 = khu chung
const teamOfX = x => (MAPCFG && MAPCFG.name === 'versus' ? (x <= 9 ? 0 : x >= 15 ? 1 : -1) : -1);

const MAPS = {
  coop: {
    name: 'coop', map: MAP,
    seat: (x, y) => ({ x: x + 1, y }),                              // khách ngồi bên phải bàn
    tall: (x, y) => y <= 1 || ((x === 10 || x === 19) && y < 9),
    tiled: (x, y) => x > 10 && y > 1 && y < 9,
  },
  versus: {
    name: 'versus', map: MAP_VS,
    seat: (x, y) => ({ x, y: y - 1 }),                              // khách ngồi ghế phía trên bàn, quay mặt xuống
    tall: (x, y) => y <= 1,                                         // tường ngăn bếp – vỉa hè thấp để nhìn rõ cửa
    tiled: (x, y) => x >= 10 && x <= 14,
  },
};
let TABLES = [], TABLE_AT = {}, BLOCKS = [], DOOR_POSTS = [];
function useMap(name) {
  MAPCFG = MAPS[name] || MAPS.coop;
  MAP_CUR = MAPCFG.map; OVR = null;
  COLS = MAP_CUR[0].length; ROWS = MAP_CUR.length;
  VW = COLS * TW; VH = OY + ROWS * TH + 60;
  VIEWX0 = 0; VIEWX1 = VW;
  TABLES = []; TABLE_AT = {}; BLOCKS = [];
  MAP_CUR.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'T') { TABLE_AT[keyOf(x, y)] = TABLES.length; TABLES.push({ x, y, seat: MAPCFG.seat(x, y) }); }
    if (!'.,c_:'.includes(ch)) BLOCKS.push({ x, y, ch, key: keyOf(x, y) });
  }));
  // Bếp Chiến: 2 đầu mỗi cửa bếp có khung gỗ, trên đầu tường có đèn lồng màu đội
  // yb = hàng ranh giới giữa cửa và khúc tường; north = khúc tường nằm phía trên cửa
  DOOR_POSTS = [];
  if (MAPCFG.name === 'versus') {
    [9, 15].forEach(x => {
      for (let y = 0; y < ROWS; y++) {
        if (tileAt(x, y) !== ':' || tileAt(x, y - 1) === ':') continue;
        let y1 = y; while (tileAt(x, y1 + 1) === ':') y1++;
        const team = teamOfX(x);
        DOOR_POSTS.push({ x, yb: y, team, north: true, key: y + .05 }, { x, yb: y1 + 1, team, north: false, key: y1 + 2.02 });
      }
    });
  }
  floorCanvas = null;
}

/* ---------- Di chuyển và va chạm ---------- */
function canStand(x, y) {
  const r = .28;
  return isWalk(Math.floor(x - r), Math.floor(y - .17)) && isWalk(Math.floor(x + r), Math.floor(y - .17)) &&
    isWalk(Math.floor(x - r), Math.floor(y + .14)) && isWalk(Math.floor(x + r), Math.floor(y + .14));
}
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];                    // 0 xuống, 1 trái, 2 phải, 3 lên
function movePlayer(p, ix, iy, dt) {
  const len = Math.hypot(ix, iy);
  if (!len) { p.mv = 0; return; }
  const sp = GAME.speed * dt / Math.max(1, len);
  const nx = p.x + ix * sp; if (canStand(nx, p.y)) p.x = nx;
  const ny = p.y + iy * sp; if (canStand(p.x, ny)) p.y = ny;
  p.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 1 : 2) : (iy < 0 ? 3 : 0);
  p.mv = 1;
}
// Bếp Chiến, giờ cao điểm: sàn bếp trôi như băng chuyền. Mỗi bếp có 3 làn, làn giữa chạy ngược 2 làn kia.
// dirSign: 0 = sàn đứng yên, 1 = chiều đầu (làn trên và dưới đẩy ra cửa), -1 = đổi chiều.
const SLIDE_LANES = { 2: 1, 3: 1, 5: -1, 6: -1, 8: 1, 9: 1 };
function slideVX(x, y, dirSign) {
  if (!dirSign || !MAPCFG || MAPCFG.name !== 'versus') return 0;
  const tx = Math.floor(x), ty = Math.floor(y), team = teamOfX(tx), lane = SLIDE_LANES[ty];
  if (team < 0 || !lane || tileAt(tx, ty) !== '.') return 0;
  return lane * (team === 0 ? 1 : -1) * dirSign * VS.slideSpeed;
}
function driftBy(p, dirSign, dt) {
  const vx = slideVX(p.x, p.y, dirSign);
  if (!vx) return;
  const nx = p.x + vx * dt;
  if (canStand(nx, p.y)) p.x = nx;
}
// khu trước mặt nhân vật; nếu không có thì khu gần nhất trong tầm với
function findTarget(p) {
  const [dx, dy] = DIRV[p.dir];
  const fx = Math.floor(p.x + dx * .75), fy = Math.floor(p.y + dy * .75);
  if (isInteract(fx, fy)) return keyOf(fx, fy);
  let best = null, bd = 1.05;
  for (let y = Math.floor(p.y) - 1; y <= Math.floor(p.y) + 1; y++) {
    for (let x = Math.floor(p.x) - 1; x <= Math.floor(p.x) + 1; x++) {
      if (!isInteract(x, y)) continue;
      const cx = Math.max(x, Math.min(p.x, x + 1)), cy = Math.max(y, Math.min(p.y, y + 1));
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bd) { bd = d; best = keyOf(x, y); }
    }
  }
  return best;
}

/* ---------- Ảnh SVG (từ art.js) dùng trên canvas ---------- */
const IMGS = {};
function pic(ctx, key, make, x, y, w, h) {
  let im = IMGS[key];
  if (!im) {
    im = IMGS[key] = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(make().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  }
  if (im.complete && im.naturalWidth) ctx.drawImage(im, x, y, w, h);
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ell(ctx, cx, cy, rx, ry, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}

/* ---------- Vẽ đồ vật (đáy giữa tại cx, cy) ---------- */
const plate = (ctx, cx, cy, rx) => { ell(ctx, cx, cy, rx, rx * .32, '#FFFFFF', '#2F74B5', 2); ell(ctx, cx, cy, rx * .62, rx * .18, null, '#DCE3EA', 1); };
function plasticCup(ctx, f, l) {
  ctx.beginPath(); ctx.moveTo(-7, -24); ctx.lineTo(7, -24); ctx.lineTo(5.5, 0); ctx.lineTo(-5.5, 0); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  if (f) { ctx.beginPath(); ctx.moveTo(-6.6, -19); ctx.lineTo(6.6, -19); ctx.lineTo(5.5, 0); ctx.lineTo(-5.5, 0); ctx.closePath(); ctx.fillStyle = '#B8641C'; ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-7, -24); ctx.lineTo(7, -24); ctx.lineTo(5.5, 0); ctx.lineTo(-5.5, 0); ctx.closePath();
  ctx.strokeStyle = '#8FA6B5'; ctx.lineWidth = 1.2; ctx.stroke();
  ell(ctx, 0, -24, 7.5, 2.4, 'rgba(255,255,255,.75)', '#8FA6B5', 1);
  ctx.strokeStyle = '#D8261E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1.5, -24); ctx.lineTo(4.5, -33); ctx.stroke();
  if (l) ell(ctx, -4, -23, 3.6, 3.6, '#5FB236', '#3E7F22', 1);
}
function dirtyStack(ctx, n) {
  const plates = n.filter(k => k === 'plate').length, glasses = n.length - plates;
  for (let i = 0; i < Math.min(plates, 5); i++) {
    ell(ctx, -3, -2 - i * 3, 13, 4, '#E9E6DE', '#8E9AA6', 1.2);
    ell(ctx, -6 + i, -3 - i * 3, 3, 1.2, '#A07040');
  }
  for (let i = 0; i < Math.min(glasses, 3); i++) {
    const gx = 9 + i * 5;
    ctx.beginPath(); ctx.moveTo(gx - 3.5, -14); ctx.lineTo(gx + 3.5, -14); ctx.lineTo(gx + 2.8, 0); ctx.lineTo(gx - 2.8, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(200,190,170,.7)'; ctx.fill(); ctx.strokeStyle = '#8E9AA6'; ctx.lineWidth = 1; ctx.stroke();
  }
}
function drawItem(ctx, it, cx, cy, s = 1) {
  if (!it) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  if (it.k === 'b') {
    if (it.w === 'plate') plate(ctx, 0, -2, 21);
    const st = it.s === 'raw' ? 'raw' : it.s === 'burnt' ? 'burnt' : 'toast';
    pic(ctx, 'b' + st + it.i.slice().sort().join('-'), () => ART.bread(st, it.i), -19, it.w === 'plate' ? -24 : -21, 38, 20.5);
    if (it.w === 'paper') {
      ctx.beginPath(); ctx.moveTo(-17, -13); ctx.lineTo(17, -13); ctx.lineTo(14, 1); ctx.lineTo(-14, 1); ctx.closePath();
      ctx.fillStyle = '#C9A06A'; ctx.fill(); ctx.strokeStyle = '#8C6436'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-4, 1); ctx.moveTo(7, -13); ctx.lineTo(5, 1); ctx.strokeStyle = '#A9814E'; ctx.stroke();
    }
  } else if (it.k === 'e') {
    if (it.s === 'raw') pic(ctx, 'egg-raw', () => ART.ing('trung'), -10, -20, 20, 20);
    else pic(ctx, 'egg-' + it.s, () => ART.egg(it.s === 'fried' ? 'ready' : it.s === 'burnt' ? 'burnt' : 'cooking'), -13, -22, 26, 26);
  } else if (it.k === 'c') {
    if (it.g === 'glass') pic(ctx, 'glass' + it.f + (it.l ? 'L' : ''), () => ART.cup(it.f ? 1 : 0, it.l), -9, -26, 18, 25);
    else plasticCup(ctx, it.f, it.l);
  } else if (it.k === 'x') dirtyStack(ctx, it.n);
  else if (it.k === 'i') {
    const k = it.cut ? it.g + '_cut' : it.g;
    pic(ctx, 'ing-' + k, () => ART.ing(k), -15, -28, 30, 30);
  } else if (it.k === 'peel') pic(ctx, 'peel', ART.peel, -16, -22, 32, 24);
  ctx.restore();
}

/* ---------- Sàn (vẽ 1 lần vào canvas phụ) ---------- */
let floorCanvas = null;
const KITCHEN_TILE = { '-1': ['#E6DFCF', '#D9D0BC'], 0: ['#F6DCD3', '#ECC8BC'], 1: ['#D8E6F2', '#C5D6E6'] };
function buildFloor() {
  const c = document.createElement('canvas');
  c.width = VW * 2; c.height = VH * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#4A3424'; g.fillRect(0, 0, VW, VH);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = tileAt(x, y), x0 = x * TW, y0 = OY + y * TH;
      if (ch === '_') {
        g.fillStyle = (x + y) % 2 ? '#BDB6AA' : '#B4AD9F'; g.fillRect(x0, y0, TW, TH);
        if (y === ROWS - 1) { g.fillStyle = '#8E877B'; g.fillRect(x0, y0 + TH - 6, TW, 6); }
      } else if (ch === '.' && !MAPCFG.tiled(x, y)) {
        const pal = KITCHEN_TILE[teamOfX(x)];
        g.fillStyle = pal[(x + y) % 2]; g.fillRect(x0, y0, TW, TH);
      } else if ('.,cD:'.includes(ch)) {
        // gạch bông
        g.save(); g.beginPath(); g.rect(x0, y0, TW, TH); g.clip();
        g.fillStyle = '#EFE6D2'; g.fillRect(x0, y0, TW, TH);
        g.fillStyle = '#2E6B50';
        [[0, 0], [TW, 0], [0, TH], [TW, TH]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(x0 + dx, y0 + dy, 11, 9, 0, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = '#C8352B'; g.beginPath(); g.ellipse(x0 + TW / 2, y0 + TH / 2, 5, 4, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.08)'; g.strokeRect(x0 + .5, y0 + .5, TW - 1, TH - 1);
        g.restore();
        if (ch === ':') {          // cửa bếp: thảm chùi chân màu đội, nối liền qua 2 ô
          const up = tileAt(x, y - 1) === ':', down = tileAt(x, y + 1) === ':', col = TEAMCOL[teamOfX(x)] || '#8E5A35';
          const t0 = y0 + (up ? 0 : 5), t1 = y0 + TH - (down ? 0 : 5);
          g.fillStyle = col; g.fillRect(x0 + 5, t0, TW - 10, t1 - t0);
          g.fillStyle = 'rgba(255,255,255,.22)';
          for (let k = x0 + 10; k < x0 + TW - 8; k += 8) g.fillRect(k, t0 + 3, 3, t1 - t0 - 6);
          g.strokeStyle = 'rgba(255,247,226,.85)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x0 + 8, t0 + (up ? 0 : 3)); g.lineTo(x0 + 8, t1 - (down ? 0 : 3));
          g.moveTo(x0 + TW - 8, t0 + (up ? 0 : 3)); g.lineTo(x0 + TW - 8, t1 - (down ? 0 : 3));
          if (!up) { g.moveTo(x0 + 8, t0 + 3); g.lineTo(x0 + TW - 8, t0 + 3); }
          if (!down) { g.moveTo(x0 + 8, t1 - 3); g.lineTo(x0 + TW - 8, t1 - 3); }
          g.stroke();
        }
      }
      if (ch === 'c') {   // ghế nhựa đỏ / xanh
        const col = (x + y) % 2 ? '#D9443A' : '#2F74B5', cx = x0 + TW / 2, cy = y0 + TH * .62;
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(cx, cy + 9, 13, 4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = CHAR.shade(col, -.25); g.fillRect(cx - 10, cy - 2, 4, 11); g.fillRect(cx + 6, cy - 2, 4, 11);
        g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy - 3, 12, 5, 0, 0, Math.PI * 2); g.fill();
      }
    }
  }
  const ry = OY + ROWS * TH;
  g.fillStyle = '#4B4F55'; g.fillRect(0, ry, VW, VH - ry);
  g.fillStyle = '#E8C547'; for (let x = 12; x < VW; x += 72) g.fillRect(x, ry + 40, 40, 4);
  floorCanvas = c;
}

/* ---------- Khối (tường, quầy, bàn) ---------- */
function blockStyle(ch, x, y) {
  if (ch === '#') return { h: MAPCFG.tall(x, y) ? 46 : 20, top: '#A8782F', front: '#E3B04B', front2: '#C9922F' };
  if (ch === 'M') return { h: 20, top: '#E9D6A8', front: '#3E9B48', front2: '#2A6E32' };
  if (ch === 'K') return { h: 20, top: '#E9ECEE', front: '#8E5A35', front2: '#6C4024' };
  if (ch === 'g') return { h: 46, top: '#2E6B50', front: '#2E6B50', front2: '#1D4636', glass: true };
  if (ch === 'D') return { h: 46, top: '#5A3A24', front: '#5A3A24', front2: '#3B2618', door: true, glass: true };
  if (ch === 'T') return { h: 14, top: '#C98B4E', front: '#8E5A35', front2: '#6C4024' };
  if (ch === '=') return { h: 20, top: '#C69157', front: '#8E5A35', front2: '#6C4024' };
  if (ch === 'm') return { h: 20, top: '#E9ECEE', front: '#C8352B', front2: '#95231C' };
  if (ch === 'W') return { h: 20, top: '#E9ECEE', front: '#C8352B', front2: '#95231C' };
  return { h: 20, top: '#DCE1E5', front: '#A4ADB5', front2: '#7E8891' };
}
function drawBlock(ctx, b, V, now, target) {
  const ch = tileAt(b.x, b.y), st = blockStyle(ch, b.x, b.y), x0 = b.x * TW, y0 = OY + b.y * TH, H = st.h;
  if (st.glass) ctx.globalAlpha = .4;
  const top = y0 - H, cx = x0 + TW / 2, cy = top + TH / 2;
  // mặt trước
  const gr = ctx.createLinearGradient(0, y0 + TH - H, 0, y0 + TH);
  gr.addColorStop(0, st.front); gr.addColorStop(1, st.front2);
  ctx.fillStyle = gr; ctx.fillRect(x0, y0 + TH - H, TW, H);
  if (ch === 'g') {      // cửa kính
    ctx.fillStyle = '#BFE3F2'; ctx.fillRect(x0 + 5, y0 + TH - H + 6, TW - 10, H - 12);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 + 12, y0 + TH - 10); ctx.lineTo(x0 + 26, y0 + TH - H + 10); ctx.stroke();
  }
  if (st.door) { ctx.fillStyle = '#EFE6D2'; ctx.fillRect(x0 + 6, y0 + TH - H + 6, TW - 12, H - 6); }
  // mặt trên
  ctx.fillStyle = st.top; ctx.fillRect(x0, top, TW, TH);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, top + .5, TW - 1, TH - 1);
  ctx.globalAlpha = 1;
  if (ch === '#' && MAPCFG.name === 'versus') {
    const team = teamOfX(b.x), wood = (yy, hh) => {
      const gw = ctx.createLinearGradient(0, yy, 0, yy + hh);
      gw.addColorStop(0, '#8A5530'); gw.addColorStop(1, '#5A3520');
      ctx.fillStyle = gw; ctx.fillRect(x0, yy, TW, hh);
    };
    if (tileAt(b.x, b.y + 1) === ':') {          // khúc tường phía trên cửa: mặt trước thành khung gỗ
      wood(y0 + TH - H, H);
      ctx.fillStyle = TEAMCOL[team]; ctx.fillRect(x0, y0 + TH - 9, TW, 5);
    }
    if (tileAt(b.x, b.y - 1) === ':') {          // khúc tường phía dưới cửa: mép trên bọc gỗ
      wood(top, 8);
      ctx.fillStyle = TEAMCOL[team]; ctx.fillRect(x0, top + 8, TW, 3);
    }
  }
  if (H > 20 || ch === '#') return;
  const locked = isLocked(ch, V.recipes), ts = V.tiles[b.key] || {}, team = teamOfX(b.x);
  // nội dung từng khu
  switch (ch) {
    case 'B':
      ctx.fillStyle = '#9A6A3A'; rr(ctx, x0 + 4, top + 8, TW - 8, TH - 14, 4); ctx.fill();
      for (let i = 0; i < 3; i++) pic(ctx, 'braw', () => ART.bread('raw'), x0 + 4 + i * 4, top + 6 + i * 6, 34, 18);
      break;
    case 'G': {
      ctx.fillStyle = '#2A1D17'; ctx.fillRect(x0 + 3, top + 3, TW - 6, TH - 6);
      const glow = ctx.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, 24);
      glow.addColorStop(0, 'rgba(255,138,42,.95)'); glow.addColorStop(1, 'rgba(194,65,12,0)');
      ctx.fillStyle = glow; ctx.fillRect(x0 + 3, top + 3, TW - 6, TH - 6);
      ctx.strokeStyle = '#1A110D'; ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0 + 3 + i * 8.4, top + 3); ctx.lineTo(x0 + 3 + i * 8.4, top + TH - 3); ctx.stroke(); }
      cookerItem(ctx, ts, cx, cy + 10, now);
      break;
    }
    case 'P':
      ctx.fillStyle = '#4A4038'; ctx.fillRect(x0 + 2, top + 2, TW - 4, TH - 4);
      ell(ctx, cx, cy, 17, 13, '#1E1E1E', '#3A3A3A', 3);
      ctx.fillStyle = '#2A2A2A'; ctx.fillRect(cx + 15, cy - 2, 9, 4);
      cookerItem(ctx, ts, cx, cy + 9, now);
      break;
    case 'E':
      ctx.fillStyle = '#D9C29A'; rr(ctx, x0 + 5, top + 6, TW - 10, TH - 12, 4); ctx.fill();
      for (let i = 0; i < 4; i++) pic(ctx, 'egg-raw', () => ART.ing('trung'), x0 + 6 + (i % 2) * 17, top + 4 + Math.floor(i / 2) * 13, 17, 17);
      break;
    case 'J': pic(ctx, 'jug', ART.jug, cx - 18, top - 18, 36, 38); break;
    case 'L': pic(ctx, 'lime', () => ART.ing('chanh'), cx - 14, top + 6, 28, 28); break;
    case 'C':
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(cx - 10 + i * 10, cy + 12 - i * 2); plasticCup(ctx, 0, false); ctx.restore(); }
      break;
    case 'S': {
      ctx.fillStyle = '#9AA4AD'; rr(ctx, x0 + 5, top + 5, TW - 10, TH - 10, 5); ctx.fill();
      ctx.fillStyle = '#8CC6E0'; rr(ctx, x0 + 8, top + 8, TW - 16, TH - 16, 4); ctx.fill();
      const sink = V.sink;
      if (sink.dirty.length) { ctx.save(); ctx.translate(cx, cy + 9); dirtyStack(ctx, sink.dirty); ctx.restore(); }
      if (sink.prog > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, x0 + 4, top - 10, TW - 8, 6, 3); ctx.fill();
        ctx.fillStyle = '#7CC4F0'; rr(ctx, x0 + 4, top - 10, (TW - 8) * Math.min(1, sink.prog), 6, 3); ctx.fill();
        for (let i = 0; i < 4; i++) ell(ctx, x0 + 10 + ((i * 11 + now * 30) % 28), top + 10 + (i % 2) * 8, 2.5, 2.5, 'rgba(255,255,255,.85)');
      }
      break;
    }
    case 'R':
      ctx.fillStyle = '#B88A55'; ctx.fillRect(x0 + 4, top + 6, TW - 8, TH - 10);
      for (let i = 0; i < Math.min(V.plates, 6); i++) plate(ctx, cx, top + 30 - i * 3.5, 15);
      countTag(ctx, x0 + TW - 6, top + 6, V.plates);
      break;
    case 'V':
      ctx.fillStyle = '#B88A55'; ctx.fillRect(x0 + 4, top + 6, TW - 8, TH - 10);
      for (let i = 0; i < Math.min(V.glasses, 6); i++) pic(ctx, 'glass0', () => ART.cup(0, false), x0 + 6 + (i % 3) * 12, top + 4 + Math.floor(i / 3) * 14, 12, 17);
      countTag(ctx, x0 + TW - 6, top + 6, V.glasses);
      break;
    case 'X': pic(ctx, 'trash', ART.trash, cx - 15, top - 8, 30, 36); break;
    case 'W':
      ctx.fillStyle = '#C9A06A'; ctx.fillRect(x0 + 7, top + 8, TW - 14, TH - 16);
      ctx.fillStyle = '#B48A55'; ctx.fillRect(x0 + 10, top + 12, TW - 20, TH - 24);
      ctx.strokeStyle = '#8C6436'; ctx.strokeRect(x0 + 7.5, top + 8.5, TW - 15, TH - 17);
      break;
    case 'K': {
      pic(ctx, 'board', ART.board, cx - 19, top + 1, 38, 38);
      if (ts.item) drawItem(ctx, ts.item, cx - 3, cy + 12, .85);
      if (ts.item && !ts.item.cut && ts.p > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, x0 + 4, top - 10, TW - 8, 6, 3); ctx.fill();
        ctx.fillStyle = '#F2A516'; rr(ctx, x0 + 4, top - 10, (TW - 8) * Math.min(1, ts.p), 6, 3); ctx.fill();
      }
      break;
    }
    case 'Z':
      ctx.fillStyle = '#C3CAD1'; rr(ctx, x0 + 4, top + 4, TW - 8, TH - 8, 5); ctx.fill();
      pic(ctx, 'ing-cha', () => ART.ing('cha'), cx - 15, top + 5, 30, 30);
      pic(ctx, 'board', ART.board, x0 + TW - 18, top + 20, 16, 16);
      break;
    case 'N': {
      pic(ctx, 'bananas', ART.bananas, cx - 16, top + 3, 32, 32);
      const cd = V.peelCd ? V.peelCd[team] : 0;
      if (cd > 0) { ctx.fillStyle = 'rgba(40,30,20,.5)'; ctx.fillRect(x0, top, TW, TH * Math.min(1, cd / VS.peelCooldown)); }
      break;
    }
    case 'Q': {
      const cd = V.bellCd ? V.bellCd[team] : 0;
      pic(ctx, cd > 0 ? 'bell0' : 'bell1', () => ART.bell(!(cd > 0)), cx - 16, top + 2, 32, 32);
      if (cd > 0) {
        ctx.fillStyle = 'rgba(43,33,24,.8)'; rr(ctx, cx - 12, cy - 4, 24, 15, 7); ctx.fill();
        ctx.fillStyle = '#FFF7E2'; ctx.font = `800 10px ${Lang.font()}`; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(cd) + 's', cx, cy + 7);
      }
      break;
    }
    case 'M': {
      // sạp chợ: mái sọc xanh trắng, nguyên liệu hiếm
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#FFF7E2' : '#3E9B48'; ctx.fillRect(x0 + i * 12, top - 12, 12, 10); }
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x0, top - 2, TW, 3);
      ctx.fillStyle = '#B57B38'; rr(ctx, x0 + 5, top + 10, TW - 10, TH - 14, 4); ctx.fill();
      const mk = V.market && V.market[b.key];
      if (mk && mk.it) {
        const pulse = .5 + .5 * Math.sin(now * 6);
        const glow = ctx.createRadialGradient(cx, cy + 4, 2, cx, cy + 4, 26);
        glow.addColorStop(0, `rgba(255,212,71,${.55 + .35 * pulse})`); glow.addColorStop(1, 'rgba(255,212,71,0)');
        ctx.fillStyle = glow; ctx.fillRect(x0 - 6, top - 6, TW + 12, TH + 12);
        drawItem(ctx, mk.it, cx, cy + 14, 1.05);
      } else if (mk && mk.warn > 0) {
        ctx.fillStyle = 'rgba(255,212,71,' + (.4 + .4 * Math.sin(now * 10)) + ')';
        ctx.font = `400 22px ${Lang.get() === 'ja' ? "'Dela Gothic One'" : "'Bungee'"}, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(mk.warn)), cx, cy + 12);
      }
      break;
    }
    case 'T': {
      const t = V.tables[TABLE_AT[b.key]];
      if (t && t.dirty) {
        if (t.dirty.length) { ctx.save(); ctx.translate(cx, cy + 8); dirtyStack(ctx, t.dirty); ctx.restore(); }
        t.food.forEach((it, i) => drawItem(ctx, it, x0 + 14 + i * 20, cy + 10, .72));
      }
      break;
    }
    default:
      if (BIN[ch]) {
        ctx.fillStyle = '#C3CAD1'; rr(ctx, x0 + 4, top + 4, TW - 8, TH - 8, 5); ctx.fill();
        pic(ctx, 'ing-' + BIN[ch], () => ART.ing(BIN[ch]), cx - 15, top + 5, 30, 30);
      }
  }
  if (ts.item && (ch === '=')) drawItem(ctx, ts.item, cx, cy + 10);
  if (locked) {
    ctx.fillStyle = 'rgba(40,30,20,.55)'; ctx.fillRect(x0, top, TW, TH);
    pic(ctx, 'lock', () => ART.lock().replace('currentColor', '#FFF7E2').replace('currentColor', '#FFF7E2'), cx - 8, cy - 8, 16, 16);
  }
  if (target === b.key) {
    ctx.strokeStyle = '#FFD447'; ctx.lineWidth = 3; ctx.strokeRect(x0 + 1.5, top + 1.5, TW - 3, TH - 3);
  }
}
function countTag(ctx, x, y, n) {
  ctx.fillStyle = n ? '#2B2118' : '#D9443A'; rr(ctx, x - 13, y - 6, 18, 13, 6); ctx.fill();
  ctx.fillStyle = '#FFF7E2'; ctx.font = `800 9px ${Lang.font()}`; ctx.textAlign = 'center'; ctx.fillText(String(n), x - 4, y + 4);
}
// đồ đang nấu trên lò / chảo: vòng tiến độ và khói
function cookerItem(ctx, ts, cx, cy, now) {
  const it = ts.item;
  if (!it) return;
  drawItem(ctx, it, cx, cy, .95);
  const p = ts.p || 0;
  if (ts.phase === 'cook' || ts.phase === 'warn') {
    ctx.beginPath(); ctx.arc(cx + 17, cy - 26, 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 17, cy - 26); ctx.arc(cx + 17, cy - 26, 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.fillStyle = ts.phase === 'warn' ? '#D9443A' : '#3E9B48'; ctx.fill();
  }
  if (ts.phase === 'warn' || ts.phase === 'burnt') {
    for (let i = 0; i < 3; i++) {
      const k = (now * .9 + i / 3) % 1;
      ell(ctx, cx - 6 + i * 6, cy - 22 - k * 18, 4 + k * 4, 4 + k * 4, `rgba(90,90,90,${.55 * (1 - k)})`);
    }
  }
}

/* ---------- Bong bóng gọi món của khách (to, có từng nguyên liệu) ---------- */
// below = vẽ dưới chân (khách mang về đứng ngoài quầy, để không che bếp)
function drawBubble(ctx, c, x, y, below) {
  const cw = 62, n = c.items.length, w = n * cw + 12, h = 94;
  const lo = Math.max(4, VIEWX0 + 4), hi = Math.min(VW, VIEWX1) - w - 4;
  const bx = Math.max(lo, Math.min(hi, x - w / 2));
  const by = below ? y + 12 : y - 78 - h;
  ctx.fillStyle = '#FFF7E2'; rr(ctx, bx, by, w, h, 12); ctx.fill();
  ctx.beginPath();
  if (below) { ctx.moveTo(x - 8, by + 1); ctx.lineTo(x, by - 9); ctx.lineTo(x + 8, by + 1); }
  else { ctx.moveTo(x - 8, by + h - 1); ctx.lineTo(x, by + h + 9); ctx.lineTo(x + 8, by + h - 1); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(43,33,24,.35)'; ctx.lineWidth = 1.4; rr(ctx, bx, by, w, h, 12); ctx.stroke();
  c.items.forEach((it, i) => {
    const R = RECIPES[it.id], ix = bx + 6 + i * cw + cw / 2;
    if (i) { ctx.strokeStyle = 'rgba(43,33,24,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix - cw / 2, by + 8); ctx.lineTo(ix - cw / 2, by + h - 16); ctx.stroke(); }
    if (R.type === 'food') {
      drawItem(ctx, { k: 'b', s: 'toast', i: R.ings, w: it.mode === 'dine' ? 'plate' : 'paper' }, ix, by + 41, 1.3);
      R.ings.forEach((k, j) => pic(ctx, 'ing-' + k, () => ART.ing(k), ix - 27 + (j % 3) * 19, by + 46 + Math.floor(j / 3) * 18, 17, 17));
    } else {
      drawItem(ctx, { k: 'c', g: it.mode === 'dine' ? 'glass' : 'plastic', f: 1, l: R.lemon }, ix - 4, by + 72, 1.55);
      if (R.lemon) pic(ctx, 'ing-chanh', () => ART.ing('chanh'), ix + 9, by + 56, 18, 18);
    }
    if (it.done) {
      ctx.fillStyle = 'rgba(255,247,226,.78)'; ctx.fillRect(ix - cw / 2 + 2, by + 4, cw - 4, h - 20);
      ctx.fillStyle = '#3E9B48'; ctx.font = `800 30px ${Lang.font()}`; ctx.textAlign = 'center'; ctx.fillText('✓', ix, by + 52);
    }
  });
  const r = Math.max(0, Math.min(1, c.pat / c.max));
  ctx.fillStyle = 'rgba(43,33,24,.12)'; rr(ctx, bx + 8, by + h - 11, w - 16, 6, 3); ctx.fill();
  ctx.fillStyle = r < .2 ? '#D9443A' : r < .45 ? '#F2A516' : '#3E9B48'; rr(ctx, bx + 8, by + h - 11, (w - 16) * r, 6, 3); ctx.fill();
}
// Bếp Chiến: bong bóng gọn hơn (vỉa hè chật), khách VIP viền vàng, khách giả có nhãn cho đội đã rung chuông
function drawBubbleVS(ctx, c, x, y, side, myTeam) {
  const cw = 50, n = c.items.length, w = n * cw + 10, h = 70;
  const bx = side < 0 ? x + 18 - w : x - 18, by = y - 72 - h;
  const gold = c.vip || c.fake != null;
  ctx.fillStyle = gold ? '#FFF1C2' : '#FFF7E2'; rr(ctx, bx, by, w, h, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 6, by + h - 1); ctx.lineTo(x, by + h + 8); ctx.lineTo(x + 6, by + h - 1); ctx.fill();
  ctx.strokeStyle = gold ? '#D9A21A' : 'rgba(43,33,24,.35)'; ctx.lineWidth = gold ? 2.5 : 1.4; rr(ctx, bx, by, w, h, 10); ctx.stroke();
  c.items.forEach((it, i) => {
    const R = RECIPES[it.id], ix = bx + 5 + i * cw + cw / 2;
    if (R.type === 'food') {
      drawItem(ctx, { k: 'b', s: 'toast', i: R.ings }, ix, by + 30, 1.05);
      R.ings.forEach((k, j) => pic(ctx, 'ing-' + k, () => ART.ing(k), ix - 22 + (j % 3) * 15, by + 33 + Math.floor(j / 3) * 14, 14, 14));
    } else {
      drawItem(ctx, { k: 'c', g: 'plastic', f: 1, l: R.lemon }, ix, by + 56, 1.35);
    }
    if (it.done) {
      ctx.fillStyle = 'rgba(255,247,226,.8)'; ctx.fillRect(ix - cw / 2 + 2, by + 3, cw - 4, h - 15);
      ctx.fillStyle = TEAMCOL[it.by] || '#3E9B48'; ctx.font = `800 24px ${Lang.font()}`; ctx.textAlign = 'center'; ctx.fillText('✓', ix, by + 40);
    }
  });
  const r = Math.max(0, Math.min(1, c.pat / c.max));
  ctx.fillStyle = 'rgba(43,33,24,.12)'; rr(ctx, bx + 7, by + h - 9, w - 14, 5, 2.5); ctx.fill();
  ctx.fillStyle = r < .2 ? '#D9443A' : r < .45 ? '#F2A516' : '#3E9B48'; rr(ctx, bx + 7, by + h - 9, (w - 14) * r, 5, 2.5); ctx.fill();
  if (gold) {
    const tag = c.fake != null && c.fake === myTeam ? Lang.t('fakeTag') : 'VIP';
    ctx.font = `800 10px ${Lang.font()}`; ctx.textAlign = 'center';
    const tw = ctx.measureText(tag).width + 12;
    ctx.fillStyle = c.fake != null && c.fake === myTeam ? TEAMCOL[myTeam] : '#D9A21A';
    rr(ctx, bx + w / 2 - tw / 2, by - 8, tw, 14, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(tag, bx + w / 2, by + 3);
  }
}

/* ---------- Bóng tối (giờ cao điểm: mất điện) ---------- */
let darkCv = null;
function drawDark(ctx, V, disp, amount) {
  const w = Math.ceil(VW / 2), h = Math.ceil(VH / 2);
  if (!darkCv || darkCv.width !== w || darkCv.height !== h) { darkCv = document.createElement('canvas'); darkCv.width = w; darkCv.height = h; }
  const g = darkCv.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  g.fillStyle = `rgba(8,10,28,${.9 * amount})`; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => {
    const gr = g.createRadialGradient(x, y, r * .45, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  Object.keys(V.players).forEach(id => { const d = disp[id]; if (d) hole(d.x * TW / 2, (OY + d.y * TH - 30) / 2, 62); });
  if (V.market) Object.values(V.market).forEach(m => { if (m.it) hole(m.x * TW / 2 + 12, (OY + m.y * TH) / 2, 26); });
  DOOR_POSTS.forEach(d => { const L = lanternPos(d); hole(L.x / 2, (L.y + 30) / 2, 24); });   // đèn lồng ở cửa vẫn sáng
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCv, 0, 0, VW, VH);
}

/* ---------- Cửa bếp (Bếp Chiến): khung gỗ ở 2 đầu tường + đèn lồng màu đội ---------- */
// đèn lồng đặt trên đầu khúc tường sát cửa
function lanternPos(d) {
  const wy = d.north ? d.yb - 1 : d.yb, h = tileAt(d.x, wy) === '#' ? blockStyle('#', d.x, wy).h : 20;
  return { x: d.x * TW + TW / 2, y: OY + d.yb * TH - h - (d.north ? 12 : 9) };
}
function drawDoorPost(ctx, d, now) {
  const col = TEAMCOL[d.team];
  const L = lanternPos(d), sw = Math.sin(now * 2.2 + d.x + d.yb) * 1.2;
  const glow = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, 22);
  glow.addColorStop(0, 'rgba(255,214,120,.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(L.x, L.y, 22, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(sw * .04);
  ctx.fillStyle = '#F2C14E'; ctx.fillRect(-5, -11, 10, 3); ctx.fillRect(-5, 8, 10, 3);
  ell(ctx, 0, 0, 9, 9, col, CHAR.shade(col, -.3), 1.2);
  ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, 0, 0, Math.PI * 2); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
  ctx.strokeStyle = '#F2C14E'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 11); ctx.lineTo(sw, 17); ctx.stroke();
  ctx.restore();
}

/* ---------- Sàn trôi (giờ cao điểm): mũi tên chạy theo chiều băng chuyền ---------- */
function drawSlide(ctx, dirSign, now) {
  const sp = TW / 2;
  for (const ys in SLIDE_LANES) {
    const y = +ys, y0 = OY + y * TH, cy = y0 + TH * .4;              // hơi cao lên để quầy phía dưới không che mũi tên
    for (let x = 0; x < COLS; x++) {
      const vx = slideVX(x + .5, y + .5, dirSign);
      if (!vx) continue;
      const x0 = x * TW, s = Math.sign(vx), off = ((now * Math.abs(vx) * TW) % sp + sp) % sp;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, TW, TH); ctx.clip();
      ctx.fillStyle = 'rgba(80,55,30,.12)'; ctx.fillRect(x0, y0, TW, TH);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let k = -1; k <= 2; k++) {
        const cx = s > 0 ? x0 + off + k * sp : x0 + TW - off - k * sp;
        ctx.beginPath(); ctx.moveTo(cx - 5 * s, cy - 7); ctx.lineTo(cx + 3 * s, cy); ctx.lineTo(cx - 5 * s, cy + 7); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/* ---------- Vẽ cả cảnh ---------- */
// V = trạng thái để vẽ; disp = vị trí hiển thị đã làm mượt; me = id người chơi trên máy này; target = khu đang nhắm
function drawWorld(ctx, V, disp, me, target, now) {
  if (!floorCanvas) buildFloor();
  ctx.drawImage(floorCanvas, 0, 0, VW, VH);
  if (V.slide) drawSlide(ctx, V.slide, now);
  const vs = V.mode === 'versus', myTeam = vs && V.players[me] ? V.players[me].team : -1;
  const pcol = p => (vs ? TEAMCOL[p.team] : PCOL[p.slot % 4]);
  const list = BLOCKS.map((b, i) => ({ y: b.y + 1, b, o: i }));
  Object.keys(V.players).forEach(id => { const d = disp[id]; if (d) list.push({ y: d.y, p: id }); });
  V.custs.forEach(c => { const d = disp['c' + c.id]; if (d) list.push({ y: d.y + (c.state === 'eat' || (c.state === 'wait' && c.type === 'dine') ? .05 : 0), c }); });
  if (V.floor) V.floor.forEach(f => list.push({ y: f.y - .2, f }));
  DOOR_POSTS.forEach(d => list.push({ y: d.key, d }));
  list.sort((a, b) => a.y - b.y || (a.b ? 0 : 1) - (b.b ? 0 : 1) || (a.o || 0) - (b.o || 0));
  for (const e of list) {
    if (e.b) {
      drawBlock(ctx, e.b, V, now, target);
      if (!vs && e.b.x === 19 && e.b.y === 1) shopSign(ctx);
      if (!vs && e.b.x === 6 && e.b.y === 9) takeSign(ctx);
      if (vs && e.b.x === COLS - 1 && e.b.y === 0) vsSigns(ctx);
    } else if (e.d) {
      drawDoorPost(ctx, e.d, now);
    } else if (e.f) {
      const f = e.f, sx = f.x * TW, sy = OY + f.y * TH;
      ell(ctx, sx, sy, 12, 4, 'rgba(0,0,0,.18)');
      drawItem(ctx, f.it, sx, sy + 4, f.it.k === 'peel' ? 1 : .8);
    } else if (e.p) {
      const p = V.players[e.p], d = disp[e.p];
      const sx = d.x * TW, sy = OY + d.y * TH;
      ell(ctx, sx, sy, 15, 5.5, null, pcol(p), 2.5);
      CHAR.draw(ctx, p.cfg, sx, sy, {
        dir: d.dir, walk: d.mv ? now * 11 : 0, t: now, pose: p.stun > 0 ? 'slip' : p.pose,
        held: p.held ? (g, hx, hy) => drawItem(g, p.held, hx, hy, .85) : null,
      });
      if (p.stun > 0) {   // choáng: sao quay quanh đầu
        for (let i = 0; i < 3; i++) {
          const a = now * 6 + i * 2.1;
          ctx.fillStyle = '#FFD447'; ctx.font = `800 13px ${Lang.font()}`; ctx.textAlign = 'center';
          ctx.fillText('★', sx + Math.cos(a) * 16, sy - 72 + Math.sin(a) * 5);
        }
      }
    } else {
      const c = e.c, d = disp['c' + c.id];
      const sit = c.type === 'dine' && (c.state === 'wait' || c.state === 'eat');
      CHAR.draw(ctx, c.cfg, d.x * TW, OY + d.y * TH, { dir: d.dir, walk: d.mv ? now * 9 : 0, t: now, sit, mood: c.mood, scale: .92, eat: c.state === 'eat' });
      if ((c.vip || c.fake != null) && c.state !== 'leave') {   // vương miện khách VIP
        const hx = d.x * TW, hy = OY + d.y * TH - (sit ? 64 : 72);
        ctx.fillStyle = '#F2C14E'; ctx.strokeStyle = '#A9771B'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(hx - 10, hy); ctx.lineTo(hx - 10, hy - 9); ctx.lineTo(hx - 5, hy - 4); ctx.lineTo(hx, hy - 11);
        ctx.lineTo(hx + 5, hy - 4); ctx.lineTo(hx + 10, hy - 9); ctx.lineTo(hx + 10, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
  }
  // đồ đang bay (bị ném)
  if (V.fly) V.fly.forEach(f => {
    const k = f.d / Math.max(.01, f.max), lift = Math.sin(Math.PI * Math.min(1, k)) * 26;
    const sx = f.x * TW, sy = OY + f.y * TH;
    ell(ctx, sx, sy, 10, 3.5, 'rgba(0,0,0,.2)');
    ctx.save(); ctx.translate(sx, sy - 18 - lift); ctx.rotate(f.d * 4); drawItem(ctx, f.it, 0, 10, .8); ctx.restore();
  });
  if (V.dark > 0) drawDark(ctx, V, disp, Math.min(1, V.dark));
  // lớp trên cùng: bong bóng gọi món, tên người chơi
  V.custs.forEach(c => {
    const d = disp['c' + c.id];
    if (!d || c.state !== 'wait' || d.x * TW < VIEWX0 - 20 || d.x * TW > VIEWX1 + 20) return;
    if (vs) drawBubbleVS(ctx, c, d.x * TW, OY + d.y * TH + 8, d.x < COLS / 2 ? -1 : 1, myTeam);
    else drawBubble(ctx, c, d.x * TW, OY + d.y * TH + (c.type === 'dine' ? 8 : 0), c.type === 'take');
  });
  Object.keys(V.players).forEach(id => {
    const p = V.players[id], d = disp[id]; if (!d) return;
    const sx = d.x * TW, sy = OY + d.y * TH - 84, fz = Math.round(11 * UIZ);
    ctx.font = `800 ${fz}px ${Lang.font()}`; ctx.textAlign = 'center';
    const label = p.name + (id === me ? ' ★' : '');
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = pcol(p); rr(ctx, sx - w / 2, sy - fz - 1, w, fz + 5, (fz + 5) / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, sx, sy);
    const h = p.held, ings = h && h.k === 'b' && h.s === 'toast' ? h.i : h && h.k === 'c' && h.l ? ['chanh'] : [];
    if (ings.length) {
      const s = 16, gw = ings.length * (s + 2) + 6, gy = sy - fz - 6 - s - 6;
      ctx.fillStyle = 'rgba(255,247,226,.95)'; rr(ctx, sx - gw / 2, gy, gw, s + 6, 7); ctx.fill();
      ings.forEach((k, j) => pic(ctx, 'ing-' + k, () => ART.ing(k), sx - gw / 2 + 4 + j * (s + 2), gy + 3, s, s));
    }
  });
}
function shopSign(ctx) {
  const x = 11 * TW + 10, w = 8 * TW - 20, y = OY + TH + 2;
  ctx.fillStyle = '#C8352B'; rr(ctx, x, y, w, 32, 6); ctx.fill();
  ctx.strokeStyle = '#95231C'; ctx.lineWidth = 2; rr(ctx, x, y, w, 32, 6); ctx.stroke();
  ctx.fillStyle = '#FFD447'; ctx.font = `400 18px ${Lang.get() === 'ja' ? "'Dela Gothic One'" : "'Bungee'"}, sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(Lang.t('docTitle').toUpperCase(), x + w / 2, y + 23);
}
function takeSign(ctx) {
  const x = 2 * TW + 4, w = 5 * TW - 8, y = OY + 9 * TH + 26;
  ctx.fillStyle = '#FFD447'; ctx.font = `800 11px ${Lang.font()}`; ctx.textAlign = 'center';
  ctx.fillText('— ' + Lang.t('modeTake').toUpperCase() + ' —', x + w / 2, y + 8);
}
// biển tên 2 bếp và chợ (Bếp Chiến)
function vsSigns(ctx) {
  const font = `400 16px ${Lang.get() === 'ja' ? "'Dela Gothic One'" : "'Bungee'"}, sans-serif`;
  const sign = (x0, x1, text, bg, edge, ink) => {
    const x = x0 * TW + 10, w = (x1 - x0) * TW - 20, y = OY - 40;
    ctx.fillStyle = bg; rr(ctx, x, y, w, 28, 6); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 2; rr(ctx, x, y, w, 28, 6); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = font; ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + 20);
  };
  sign(1, 9, Lang.t('team0').toUpperCase(), '#D9443A', '#95231C', '#FFD447');
  sign(10, 15, Lang.t('marketSign').toUpperCase(), '#3E9B48', '#2A6E32', '#FFF7E2');
  sign(16, 24, Lang.t('team1').toUpperCase(), '#2F74B5', '#22578A', '#FFF7E2');
}

useMap('coop');
