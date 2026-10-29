/* world.js — bản đồ quán nhìn chéo 2.5D: va chạm, chọn khu đang đứng gần, vẽ sàn, quầy, đồ ăn và khách.
   Toạ độ thế giới tính bằng ô (x cột, y hàng; y là chân nhân vật). Màn hình logic 960×600. */
const TW = 48, TH = 40, OY = 100, VW = 960, VH = 640;
let UIZ = 1;                                                        // phóng to chữ trên canvas khi màn hình nhỏ (main.js đặt)
const COLS = MAP[0].length, ROWS = MAP.length;
const PCOL = ['#D9443A', '#2F74B5', '#3E9B48', '#E0A21A'];          // màu người chơi 1–4

const tileAt = (x, y) => (MAP[y] && MAP[y][x]) || '#';
const keyOf = (x, y) => x + ',' + y;
const STATION = {
  B: 'stBread', G: 'stGrill', E: 'stEgg', P: 'stPan', J: 'stJug', L: 'stLemon', C: 'stCups', S: 'stSink',
  R: 'stPlates', V: 'stGlasses', X: 'stTrash', W: 'stWrap', m: 'stTake', '=': 'stCounter', T: 'stTable',
  p: 'ing', q: 'ing', u: 'ing', r: 'ing', o: 'ing',
};
const BIN = { p: 'pate', q: 'cha', u: 'dua', r: 'rau', o: 'ot' };
const WINDOW_COLS = [2, 4, 6];                                      // 3 chỗ khách mang về đứng ngoài quầy
const isInteract = (x, y) => STATION[tileAt(x, y)] !== undefined;
const isWalk = (x, y) => '.,c'.includes(tileAt(x, y));
const usesIng = (k, recipes) => recipes.some(r => RECIPES[r].type === 'food' && RECIPES[r].ings.includes(k));
// khu chưa mở theo thực đơn hiện tại
function isLocked(ch, recipes) {
  if (ch === 'E' || ch === 'P') return !usesIng('trung', recipes);
  if (ch === 'L') return !recipes.includes('trachanh');
  if (BIN[ch]) return !usesIng(BIN[ch], recipes);
  return false;
}
const winOfCol = col => Math.max(0, Math.min(2, Math.floor((col - 1.5) / 2)));
// bàn ăn và ghế (khách ngồi bên phải bàn, quay sang trái)
const TABLES = [], TABLE_AT = {};
MAP.forEach((row, y) => [...row].forEach((ch, x) => {
  if (ch === 'T') { TABLE_AT[keyOf(x, y)] = TABLES.length; TABLES.push({ x, y, seat: { x: x + 1, y } }); }
}));

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
  ctx.restore();
}

/* ---------- Sàn (vẽ 1 lần vào canvas phụ) ---------- */
let floorCanvas = null;
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
        if (y === 11) { g.fillStyle = '#8E877B'; g.fillRect(x0, y0 + TH - 6, TW, 6); }
      } else if (ch === '.' && !(x > 10 && y > 1 && y < 9)) {
        g.fillStyle = (x + y) % 2 ? '#E6DFCF' : '#D9D0BC'; g.fillRect(x0, y0, TW, TH);
      } else if ('.,cD'.includes(ch)) {
        // gạch bông
        g.save(); g.beginPath(); g.rect(x0, y0, TW, TH); g.clip();
        g.fillStyle = '#EFE6D2'; g.fillRect(x0, y0, TW, TH);
        g.fillStyle = '#2E6B50';
        [[0, 0], [TW, 0], [0, TH], [TW, TH]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(x0 + dx, y0 + dy, 11, 9, 0, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = '#C8352B'; g.beginPath(); g.ellipse(x0 + TW / 2, y0 + TH / 2, 5, 4, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.08)'; g.strokeRect(x0 + .5, y0 + .5, TW - 1, TH - 1);
        g.restore();
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
const BLOCKS = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  const ch = tileAt(x, y);
  if (!'.,c_'.includes(ch)) BLOCKS.push({ x, y, ch, key: keyOf(x, y) });
}
function blockStyle(ch, x, y) {
  if (ch === '#') {
    const tall = y <= 1 || ((x === 10 || x === 19) && y < 9);
    return { h: tall ? 46 : 20, top: '#A8782F', front: '#E3B04B', front2: '#C9922F' };
  }
  if (ch === 'g') return { h: 46, top: '#2E6B50', front: '#2E6B50', front2: '#1D4636', glass: true };
  if (ch === 'D') return { h: 46, top: '#5A3A24', front: '#5A3A24', front2: '#3B2618', door: true, glass: true };
  if (ch === 'T') return { h: 14, top: '#C98B4E', front: '#8E5A35', front2: '#6C4024' };
  if (ch === '=') return { h: 20, top: '#C69157', front: '#8E5A35', front2: '#6C4024' };
  if (ch === 'm') return { h: 20, top: '#E9ECEE', front: '#C8352B', front2: '#95231C' };
  if (ch === 'W') return { h: 20, top: '#E9ECEE', front: '#C8352B', front2: '#95231C' };
  return { h: 20, top: '#DCE1E5', front: '#A4ADB5', front2: '#7E8891' };
}
function drawBlock(ctx, b, V, now, target) {
  const st = blockStyle(b.ch, b.x, b.y), x0 = b.x * TW, y0 = OY + b.y * TH, H = st.h;
  if (st.glass) ctx.globalAlpha = .4;
  const top = y0 - H, cx = x0 + TW / 2, cy = top + TH / 2;
  // mặt trước
  const gr = ctx.createLinearGradient(0, y0 + TH - H, 0, y0 + TH);
  gr.addColorStop(0, st.front); gr.addColorStop(1, st.front2);
  ctx.fillStyle = gr; ctx.fillRect(x0, y0 + TH - H, TW, H);
  if (b.ch === 'g') {      // cửa kính
    ctx.fillStyle = '#BFE3F2'; ctx.fillRect(x0 + 5, y0 + TH - H + 6, TW - 10, H - 12);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 + 12, y0 + TH - 10); ctx.lineTo(x0 + 26, y0 + TH - H + 10); ctx.stroke();
  }
  if (st.door) { ctx.fillStyle = '#EFE6D2'; ctx.fillRect(x0 + 6, y0 + TH - H + 6, TW - 12, H - 6); }
  // mặt trên
  ctx.fillStyle = st.top; ctx.fillRect(x0, top, TW, TH);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, top + .5, TW - 1, TH - 1);
  ctx.globalAlpha = 1;
  if (H > 20 || b.ch === '#') return;
  const locked = isLocked(b.ch, V.recipes), ts = V.tiles[b.key] || {};
  // nội dung từng khu
  switch (b.ch) {
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
    case 'T': {
      const t = V.tables[TABLE_AT[b.key]];
      if (t) {
        if (t.dirty.length) { ctx.save(); ctx.translate(cx, cy + 8); dirtyStack(ctx, t.dirty); ctx.restore(); }
        t.food.forEach((it, i) => drawItem(ctx, it, x0 + 14 + i * 20, cy + 10, .72));
      }
      break;
    }
    default:
      if (BIN[b.ch]) {
        ctx.fillStyle = '#C3CAD1'; rr(ctx, x0 + 4, top + 4, TW - 8, TH - 8, 5); ctx.fill();
        pic(ctx, 'ing-' + BIN[b.ch], () => ART.ing(BIN[b.ch]), cx - 15, top + 5, 30, 30);
      }
  }
  if (ts.item && (b.ch === '=')) drawItem(ctx, ts.item, cx, cy + 10);
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
  const bx = Math.max(4, Math.min(VW - w - 4, x - w / 2));
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

/* ---------- Vẽ cả cảnh ---------- */
// V = trạng thái để vẽ; disp = vị trí hiển thị đã làm mượt; me = id người chơi trên máy này; target = khu đang nhắm
function drawWorld(ctx, V, disp, me, target, now) {
  if (!floorCanvas) buildFloor();
  ctx.drawImage(floorCanvas, 0, 0, VW, VH);
  const list = BLOCKS.map((b, i) => ({ y: b.y + 1, b, o: i }));
  Object.keys(V.players).forEach(id => { const d = disp[id]; if (d) list.push({ y: d.y, p: id }); });
  V.custs.forEach(c => { const d = disp['c' + c.id]; if (d) list.push({ y: d.y + (c.state === 'eat' || (c.state === 'wait' && c.type === 'dine') ? .05 : 0), c }); });
  list.sort((a, b) => a.y - b.y || (a.b ? 0 : 1) - (b.b ? 0 : 1) || (a.o || 0) - (b.o || 0));
  for (const e of list) {
    if (e.b) {
      drawBlock(ctx, e.b, V, now, target);
      if (e.b.x === 19 && e.b.y === 1) shopSign(ctx);
      if (e.b.x === 6 && e.b.y === 9) takeSign(ctx);
    } else if (e.p) {
      const p = V.players[e.p], d = disp[e.p];
      const sx = d.x * TW, sy = OY + d.y * TH;
      ell(ctx, sx, sy, 15, 5.5, null, PCOL[p.slot % 4], 2.5);
      CHAR.draw(ctx, p.cfg, sx, sy, {
        dir: d.dir, walk: d.mv ? now * 11 : 0, t: now, pose: p.pose,
        held: p.held ? (g, hx, hy) => drawItem(g, p.held, hx, hy, .85) : null,
      });
    } else {
      const c = e.c, d = disp['c' + c.id];
      const sit = c.type === 'dine' && (c.state === 'wait' || c.state === 'eat');
      CHAR.draw(ctx, c.cfg, d.x * TW, OY + d.y * TH, { dir: d.dir, walk: d.mv ? now * 9 : 0, t: now, sit, mood: c.mood, scale: .92, eat: c.state === 'eat' });
    }
  }
  // lớp trên cùng: tên người chơi, bong bóng gọi món
  Object.keys(V.players).forEach(id => {
    const p = V.players[id], d = disp[id]; if (!d) return;
    const sx = d.x * TW, sy = OY + d.y * TH - 84, fz = Math.round(11 * UIZ);
    ctx.font = `800 ${fz}px ${Lang.font()}`; ctx.textAlign = 'center';
    const label = p.name + (id === me ? ' ★' : '');
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = PCOL[p.slot % 4]; rr(ctx, sx - w / 2, sy - fz - 1, w, fz + 5, (fz + 5) / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, sx, sy);
    const h = p.held, ings = h && h.k === 'b' && h.s === 'toast' ? h.i : h && h.k === 'c' && h.l ? ['chanh'] : [];
    if (ings.length) {
      const s = 16, gw = ings.length * (s + 2) + 6, gy = sy - fz - 6 - s - 6;
      ctx.fillStyle = 'rgba(255,247,226,.95)'; rr(ctx, sx - gw / 2, gy, gw, s + 6, 7); ctx.fill();
      ings.forEach((k, j) => pic(ctx, 'ing-' + k, () => ART.ing(k), sx - gw / 2 + 4 + j * (s + 2), gy + 3, s, s));
    }
  });
  V.custs.forEach(c => {
    const d = disp['c' + c.id];
    if (d && c.state === 'wait') drawBubble(ctx, c, d.x * TW, OY + d.y * TH + (c.type === 'dine' ? 8 : 0), c.type === 'take');
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
