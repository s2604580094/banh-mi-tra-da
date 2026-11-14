/* pho.js — bản đồ PHỐ CỔ cho Bếp Chiến: hai xe đẩy trên hai vỉa hè đối diện, giữa là phố đi bộ.
   Vẽ nền (gạch vỉa hè, đường nhựa, dãy nhà ống), khối riêng (mép vỉa hè, thân xe đẩy, tủ kính), đồ trang trí
   (xe máy, chậu cây, cột điện, gánh hàng rong…) và dây đèn trên phố. Hình đồ trang trí do Gemini vẽ (img/spr/p_*.webp). */

// đèn còn sáng khi mất điện: [x, y, bán kính] (toạ độ thế giới; bán kính tính theo lớp tối thu nửa)
const PHO_LAMPS = [[11.5 * 48, 92, 30], [13.5 * 48, 92, 30], [2.5 * 48, 100 + 3 * 40 - 30, 26], [22.5 * 48, 100 + 3 * 40 - 30, 26]];

/* ---------- Nền ---------- */
function buildFloorPho() {
  const c = document.createElement('canvas');
  c.width = VW * 2; c.height = VH * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // đường nhựa
  g.fillStyle = '#5E636A'; g.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)';
    g.fillRect(rnd() * VW, OY + rnd() * (VH - OY), 2, 2);
  }
  // vỉa hè: gạch đỏ đất (Đội Đỏ), gạch đá xám xanh (Đội Xanh)
  const PAV = [['#CB866A', '#BF7A5D', '#A3604A'], ['#AEB7C2', '#A2ACB8', '#87919C']];
  for (let y = 0; y <= 10; y++) for (let x = 0; x < COLS; x++) {
    const t = teamOfX(x), ch = tileAt(x, y);
    if (t < 0 || ch === ':') continue;
    const x0 = x * TW, y0 = OY + y * TH, [a, b, grout] = PAV[t];
    g.fillStyle = grout; g.fillRect(x0, y0, TW, TH);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j + x + y) % 2 ? a : b;
      g.fillRect(x0 + i * 24 + 1, y0 + j * 20 + 1, 22, 18);
    }
  }
  // lối xuống phố ở mép vỉa hè: dốc nhỏ, mũi tên màu đội
  for (let y = 1; y <= 10; y++) [9, 15].forEach(x => {
    if (tileAt(x, y) !== ':') return;
    const x0 = x * TW, y0 = OY + y * TH, t = teamOfX(x), col = TEAMCOL[t];
    g.fillStyle = '#7A7F86'; g.fillRect(x0, y0, TW, TH);
    g.fillStyle = col; g.globalAlpha = .75;
    const dir = t === 0 ? -1 : 1, cx = x0 + TW / 2;
    g.beginPath(); g.moveTo(cx + dir * 10, y0 + 10); g.lineTo(cx - dir * 8, y0 + TH / 2); g.lineTo(cx + dir * 10, y0 + TH - 10); g.closePath(); g.fill();
    g.globalAlpha = 1;
  });
  // bó vỉa (viền đá) giữa vỉa hè và phố
  g.fillStyle = '#D9D3C6';
  g.fillRect(10 * TW - 3, OY + TH, 4, 10 * TH); g.fillRect(15 * TW - 1, OY + TH, 4, 10 * TH);
  g.fillRect(0, OY + 11 * TH - 2, 10 * TW, 4); g.fillRect(15 * TW, OY + 11 * TH - 2, 10 * TW, 4);
  // phố đi bộ: nắp cống, lá rơi
  ell(g, 12.5 * TW, OY + 6.5 * TH, 13, 6, '#4A4E54', '#3A3D42', 2);
  g.strokeStyle = '#3A3D42'; g.lineWidth = 1;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(12.5 * TW - 10, OY + 6.5 * TH + k * 2); g.lineTo(12.5 * TW + 10, OY + 6.5 * TH + k * 2); g.stroke(); }
  for (let i = 0; i < 26; i++) {
    const lx = 10 * TW + rnd() * 5 * TW, ly = OY + TH * 2 + rnd() * TH * 8.5;
    g.fillStyle = ['#7FA34A', '#C9A33A', '#A8742E'][i % 3];
    g.save(); g.translate(lx, ly); g.rotate(rnd() * 3); g.beginPath(); g.ellipse(0, 0, 3.5, 1.8, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // ghế nhựa
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tileAt(x, y) !== 'c') continue;
    const col = (x + y) % 2 ? '#D9443A' : '#2F74B5', cx = x * TW + TW / 2, cy = OY + y * TH + TH * .62;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, cy + 9, 13, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = CHAR.shade(col, -.25); g.fillRect(cx - 10, cy - 2, 4, 11); g.fillRect(cx + 6, cy - 2, 4, 11);
    g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy - 3, 12, 5, 0, 0, Math.PI * 2); g.fill();
  }
  // phố dưới: vạch qua đường trước lối vào, vạch vàng giữa đường
  const ry = OY + 11 * TH;
  g.fillStyle = 'rgba(255,255,255,.82)';
  for (let x = 10 * TW + 6; x < 15 * TW - 6; x += 22) g.fillRect(x, ry + 6, 12, 2 * TH - 12);
  g.fillStyle = '#E8C547';
  for (let x = 12; x < VW; x += 72) if (x < 10 * TW - 30 || x > 15 * TW) g.fillRect(x, ry + 2 * TH + 22, 40, 4);
  phoHouses(g, rnd);
  floorCanvas = c;
}

// dãy nhà ống phố cổ ở trên cùng (hàng 0 và phía trên): mái ngói, cửa chớp xanh, ban công, biển hiệu
function phoHouses(g, rnd) {
  const bottom = OY + TH, WALL = ['#E9C46A', '#F2DDB0', '#B9D8BE', '#F3B9A6', '#E7B35A', '#D7E3EC'];
  const SIGNS = ['PHỞ BÒ', 'CÀ PHÊ', 'TẠP HOÁ', 'GIẢI KHÁT', 'BÚN ỐC', 'CHÈ'];
  g.fillStyle = '#9CC9E6'; g.fillRect(0, 0, VW, bottom);                      // trời
  let x = -10, i = 0;
  while (x < VW) {
    const w = (2 + (i % 3 === 1 ? 1 : 0)) * TW - 4 + Math.round(rnd() * 8), far = x + w / 2 > 10 * TW && x + w / 2 < 15 * TW;
    const top = far ? 26 : 6 + (i % 3) * 7, col = WALL[i % WALL.length];
    g.save();
    if (far) g.globalAlpha = .9;
    g.fillStyle = col; g.fillRect(x, top, w, bottom - top);
    // mái ngói
    g.fillStyle = '#B5603E'; g.fillRect(x - 3, top - 8, w + 6, 10);
    g.fillStyle = '#8E4630';
    for (let k = x; k < x + w; k += 8) { g.beginPath(); g.arc(k + 4, top + 2, 4, 0, Math.PI); g.fill(); }
    // cửa sổ chớp xanh tầng trên
    const nWin = w > 2.5 * TW ? 2 : 1, ww = 20, wy = top + 16;
    for (let k = 0; k < nWin; k++) {
      const wx = x + (w / (nWin + 1)) * (k + 1) - ww / 2;
      g.fillStyle = '#FFF7E2'; g.fillRect(wx - 3, wy - 3, ww + 6, 30);
      g.fillStyle = '#2E7A50'; g.fillRect(wx, wy, ww / 2 - 1, 24); g.fillRect(wx + ww / 2 + 1, wy, ww / 2 - 1, 24);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
      for (let s = wy + 4; s < wy + 24; s += 4) { g.beginPath(); g.moveTo(wx + 1, s); g.lineTo(wx + ww - 1, s); g.stroke(); }
    }
    // ban công + chậu cây
    g.fillStyle = '#5A4636'; g.fillRect(x + 4, wy + 30, w - 8, 3);
    for (let k = x + 10; k < x + w - 8; k += 18) { g.fillStyle = '#3E9B48'; g.beginPath(); g.arc(k, wy + 27, 5, 0, Math.PI * 2); g.fill(); }
    // tầng trệt: cửa hàng, mái hiên sọc, biển hiệu
    const gy = bottom - 44;
    g.fillStyle = 'rgba(60,44,34,.75)'; g.fillRect(x + 8, gy + 8, w - 16, 36);
    const aw = ['#D9443A', '#2E7A50', '#2F74B5', '#E0A21A'][i % 4];
    for (let k = 0; k < w; k += 10) { g.fillStyle = (k / 10) % 2 ? '#FFF7E2' : aw; g.fillRect(x + k, gy, Math.min(10, w - k), 9); }
    if (!far && i % 2 === 0) {
      const sw = Math.min(w - 12, 74), sx = x + w / 2 - sw / 2, sy = top + 4 + 46;
      g.fillStyle = '#C8352B'; rr(g, sx, sy, sw, 14, 3); g.fill();
      g.fillStyle = '#FFD447'; g.font = "700 9px 'Be Vietnam Pro', sans-serif"; g.textAlign = 'center';
      g.fillText(SIGNS[(i / 2) % SIGNS.length], sx + sw / 2, sy + 10.5);
    }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + w - 2, top, 2, bottom - top);
    g.restore();
    x += w; i++;
  }
  // hàng trên cùng của phố đi bộ: phố ngang xa hơn, hơi mờ
  g.fillStyle = 'rgba(200,225,240,.18)'; g.fillRect(10 * TW, 0, 5 * TW, bottom);
}

/* ---------- Khối riêng của phố cổ ---------- */
function blockStylePho(ch, x, y) {
  const t = teamOfX(x);
  if (ch === '#') {
    if (y === 0) return { skip: true, h: 0 };
    if ((x === 0 || x === COLS - 1) && y <= 9) return { h: 46, top: '#B5603E', front: '#E9C46A', front2: '#D4A64A', house: true };
    return { h: 8, top: '#CFC8BA', front: '#A39C8E', front2: '#857E72' };                       // mép vỉa hè
  }
  if (ch === 'M') return { h: 12, top: '#D9B46E', front: '#A07A3E', front2: '#7E5C2A' };
  const cart = (y === 3 || y === 4) && t >= 0 && (t === 0 ? x >= 2 && x <= 7 : x >= 17 && x <= 22);
  if (cart) {                                                                                    // xe đẩy: thân màu đội
    const col = TEAMCOL[t], end = t === 0 ? [2, 7] : [17, 22];
    return {
      h: 20, top: ch === '=' ? '#C69157' : '#DCE1E5', front: col, front2: CHAR.shade(col, -.25),
      stripe: true, wheel: y === 4 ? (x === end[0] ? -1 : x === end[1] ? 1 : 0) : 0,
    };
  }
  if (ch === '=' && y === 7 && t >= 0) {                                                         // bàn nhựa thấp kê đồ
    const col = TEAMCOL[t];
    return { h: 14, top: CHAR.shade(col, .3), front: col, front2: CHAR.shade(col, -.3) };
  }
  return null;
}

// tủ kính trên xe đẩy (khu lấy bánh/xôi/chả sống), trên nóc có biển tên món của đội
function breadCabinet(ctx, x0, top, team) {
  const col = TEAMCOL[team], gx = x0 + 3, gw = TW - 6, gy = top - 24, gh = TH + 22, food = foodOfTeam(team);
  ctx.fillStyle = 'rgba(214,236,246,.5)'; rr(ctx, gx, gy, gw, gh, 4); ctx.fill();
  ctx.save(); rr(ctx, gx, gy, gw, gh, 4); ctx.clip();
  const raw = FOODS[food].rawKey;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) pic(ctx, raw, () => ART.bread('raw'), gx + 1 + i * 17 - r * 3, gy + 6 + r * 21, 24, 14);
  ctx.restore();
  ctx.strokeStyle = '#8E9AA6'; ctx.lineWidth = 2; rr(ctx, gx, gy, gw, gh, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx, gy + gh / 2); ctx.lineTo(gx + gw, gy + gh / 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(gx + 6, gy + gh - 6); ctx.lineTo(gx + 15, gy + 6); ctx.stroke();
  const label = T('food_' + food).toUpperCase(), sw = TW + 40, sx = x0 + TW / 2 - sw / 2, sy = gy - 22;
  ctx.fillStyle = col; rr(ctx, sx, sy, sw, 19, 5); ctx.fill();
  ctx.strokeStyle = CHAR.shade(col, -.35); ctx.lineWidth = 1.5; rr(ctx, sx, sy, sw, 19, 5); ctx.stroke();
  ctx.fillStyle = '#FFD447'; ctx.font = `400 11px ${Lang.get() === 'ja' ? "'Dela Gothic One'" : "'Bungee'"}, sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(label, x0 + TW / 2, sy + 14);
}

/* ---------- Đồ trang trí ---------- */
// mỗi món: n = tên sprite, x = giữa (px), base = đáy (px), h = cao (px), key = thứ tự vẽ (theo hàng)
function phoDecorList() {
  const out = [], at = (tx, ty) => ({ x: tx * TW + TW / 2, base: OY + (ty + 1) * TH });
  const put = (n, tx, ty, h, side, dy = 0, key) => {
    const p = at(side === 1 ? COLS - 1 - tx : tx, ty);
    out.push({ n, x: p.x, base: p.base - 2 + dy, h, flip: side === 1, key: key != null ? key : ty + 1.02 });
  };
  [0, 1].forEach(s => {
    put('p_pole', 9, 1, 128, s);
    put('p_cub', 9, 4, 50, s);
    put('p_potbig', 9, 5, 46, s);
    put('p_potsmall', 9, 6, 34, s);
    put('p_vespa', 9, 7, 50, s);
    put('p_stools', 9, 10, 40, s);
    put(s ? 'p_crate' : 'p_flowerbike', 1, 10, s ? 30 : 52, s);
    put('p_potsmall', 4, 10, 32, s);
    put(s ? 'p_flowerbike' : 'p_crate', 6, 10, s ? 52 : 30, s);
    put('p_potbig', 8, 10, 42, s);
    // cây ở 2 góc trên (đứng trước dãy nhà)
    out.push({ n: 'p_tree', x: s ? VW - 10 : 10, base: OY + TH + 4, h: 150, flip: !!s, key: .9 });
  });
  put('p_cat', 1, 9, 22, 0, -6, 9.7);
  put('p_nonla', 1, 9, 18, 1, -8, 9.7);
  // gánh hàng rong (chợ giữa phố): ô che, quang gánh, biển chợ
  out.push({ n: 'p_umbrella', x: 12.5 * TW, base: OY + TH + 8, h: 150, key: 1.5 });
  out.push({ n: 'p_ganh', x: 10.5 * TW, base: OY + 2 * TH - 3, h: 44, key: 2.02 });
  out.push({
    key: 2.02, draw: ctx => {
      SPR.prop(ctx, 'p_signboard', 14.5 * TW, OY + 2 * TH - 2, 40);
      ctx.fillStyle = '#2B2118'; ctx.font = `800 9px ${Lang.font()}`; ctx.textAlign = 'center';
      ctx.fillText(T('marketSign').toUpperCase(), 14.5 * TW + 1, OY + 2 * TH - 22);
    },
  });
  return out;
}
// đồ trang trí chuyển động: xe máy chạy ở phố dưới, chim sẻ nhảy trên phố đi bộ
function phoLive(now) {
  const out = [], span = VW + 200;
  const ride = (n, period, off, dir, y) => {
    const k = ((now + off) % period) / period, x = dir > 0 ? -100 + k * span : VW + 100 - k * span;
    out.push({ n, x, base: OY + y * TH, h: 46, flip: dir < 0, key: y });
  };
  ride('p_cub', 11, 0, 1, 12.95);
  ride('p_vespa', 15, 6, -1, 12.5);
  [[11.25, 2.75, 0], [13.7, 7.55, 2]].forEach(([bx, by, ph]) => {
    const hop = Math.max(0, Math.sin(now * 5 + ph)) * 4, sway = Math.sin(now * .7 + ph) * .25;
    out.push({ n: 'p_sparrow', x: (bx + sway) * TW, base: OY + by * TH - hop, h: 16, flip: Math.sin(now * .35 + ph) < 0, key: by });
  });
  return out;
}
// dây điện, dây đèn và 2 đèn lồng giăng ngang phố (lớp trên cùng)
function phoWires(ctx, now) {
  const L = [9.5 * TW, 32], R = [15.5 * TW, 32];
  const curve = (sag, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    ctx.moveTo(L[0], L[1]); ctx.quadraticCurveTo((L[0] + R[0]) / 2, L[1] + sag, R[0], R[1]); ctx.stroke();
  };
  curve(30, '#2B2118', 1.4); curve(52, '#2B2118', 1.2); curve(18, '#3A2C22', 1);
  // bóng đèn dây
  for (let i = 1; i < 14; i++) {
    const k = i / 14, x = L[0] + (R[0] - L[0]) * k, y = L[1] + 30 * 4 * k * (1 - k) + 3;
    const on = .7 + .3 * Math.sin(now * 3 + i);
    ctx.fillStyle = `rgba(255,214,120,${.35 * on})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // đèn lồng
  [11.5, 13.5].forEach((lx, j) => {
    const x = lx * TW, k = (x - L[0]) / (R[0] - L[0]), y = L[1] + 52 * 4 * k * (1 - k);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(now * 1.6 + j) * .06);
    SPR.prop(ctx, 'p_lantern', 0, 40, 40);
    ctx.restore();
  });
}
