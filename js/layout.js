/* layout.js — bố cục tự thích ứng cho máy tính, điện thoại (ngang / dọc) và iPad, cộng với camera.
   - Đọc vùng an toàn (tai thỏ, thanh home của iPhone) để không đặt nút dưới đó.
   - Màn hình cảm ứng cầm ngang: thử 2 cách xếp (thẻ + nút ở 2 bên, hoặc ở dải phía dưới) rồi chọn cách cho cảnh to nhất.
   - Khi cảnh quá nhỏ để nhìn rõ: phóng to cảnh, camera đi theo nhân vật, mũi tên ở mép báo khách ngoài khung. */
const CAM = { x: 0, y: 0, w: VW, h: VH, s: 1, follow: false, ready: false };
let LAY = { kind: 'desk', big: false };
const MIN_S = .62;      // cầm dọc: rộng hơn mức này thì cảnh hiện đủ chiều ngang
const ZOOM_S = .74;     // màn hình cảm ứng nhỏ: phóng tới mức này (nhân vật cao ~60px), camera đi theo nhân vật
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const SAFE_PROBE = (() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(d);
  return d;
})();
function safeInsets() {
  const cs = getComputedStyle(SAFE_PROBE), n = v => parseFloat(v) || 0;
  return { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
}

// cỡ cảnh cho một khung w×h: vừa khung; trên màn hình cảm ứng nhỏ thì phóng to và cho camera đi theo
// (người chơi bấm nút kính lúp để chuyển sang xem toàn cảnh: prog.zoom = 'all')
function viewFor(w, h) {
  w = Math.max(80, w); h = Math.max(80, h);
  const fit = Math.min(w / VW, h / VH);
  if (!isTouch || prog.zoom === 'all' || fit >= ZOOM_S) return { s: fit, cw: VW * fit, ch: VH * fit, follow: false, fit };
  // phóng to nhưng vẫn thấy ít nhất khoảng 9 cột và 8 hàng ô
  const s = Math.max(fit, Math.min(ZOOM_S, w / (9 * TW), h / (8 * TH + 70)));
  return { s, cw: Math.min(w, VW * s), ch: Math.min(h, VH * s), follow: s > fit + .001, fit };
}

function setBox(el, o) {
  ['left', 'top', 'right', 'bottom', 'width', 'height', 'maxHeight'].forEach(k => {
    el.style[k] = o[k] == null ? '' : typeof o[k] === 'number' ? Math.round(o[k]) + 'px' : o[k];
  });
}

function fit() {
  const W = innerWidth, H = innerHeight, ins = safeInsets(), g = 8;
  const L = ins.l, Tp = ins.t, aw = W - ins.l - ins.r, ah = H - ins.t - ins.b;
  portrait = isTouch && ah > aw;
  LAY = { kind: 'desk', big: isTouch && Math.min(W, H) >= 700, ins, W, H, L, Tp, aw, ah };
  let c;
  if (!isTouch) {
    const v = viewFor(aw - 2 * g, ah - 2 * g);
    c = { ...v, x: L + (aw - v.cw) / 2, y: Tp + (ah - v.ch) / 2 };
  } else if (portrait) {
    // cầm dọc: cảnh ở trên, 2 thẻ ở giữa, nút điều khiển ở dưới
    const ctrl = clamp(ah * .2, 150, 230), fitW = (aw - 2 * g) / VW;
    const boxH = fitW >= MIN_S ? VH * fitW : Math.min(ah - ctrl - 150 - 3 * g, VH * .66);
    const v = viewFor(aw - 2 * g, boxH);
    c = { ...v, x: L + (aw - v.cw) / 2, y: Tp + g };
    Object.assign(LAY, { kind: 'port', ctrl });
  } else {
    // cầm ngang: so cách "2 bên" với cách "dải dưới", lấy cách cho cảnh to hơn
    const S = clamp(aw * .17, 118, 240), Bh = clamp(ah * .24, 150, 240);
    const side = viewFor(aw - 2 * S, ah - 2 * g), band = viewFor(aw - 2 * g, ah - Bh - 3 * g);
    if (band.s > side.s * 1.04 && aw - 2 * Bh >= 460) {
      c = { ...band, x: L + (aw - band.cw) / 2, y: Tp + g };
      Object.assign(LAY, { kind: 'band', Bh });
    } else {
      c = { ...side, x: L + S + (aw - 2 * S - side.cw) / 2, y: Tp + (ah - side.ch) / 2 };
      Object.assign(LAY, { kind: 'side', S });
    }
  }
  LAY.c = c;
  // nút kính lúp: chỉ hiện khi phóng to thật sự có tác dụng
  const zb = $('#btnZoom');
  zb.hidden = !(isTouch && c.fit < ZOOM_S * .97);
  zb.classList.toggle('near', prog.zoom !== 'all');
  setBox(wrap, { left: c.x, top: c.y, width: c.cw, height: c.ch });
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(c.cw * dpr); cv.height = Math.round(c.ch * dpr);
  cssScale = CAM.s = c.s;
  CAM.w = c.cw / c.s; CAM.h = c.ch / c.s; CAM.follow = c.follow; CAM.ready = false;
  UIZ = Math.min(1.8, Math.max(1, .85 / c.s));
  placeUI();
}

// đặt 2 thẻ chữ to và nút điều khiển ảo theo bố cục đã chọn
function placeUI() {
  const { kind, ins, W, H, L, Tp, aw, ah, c, big } = LAY, g = 8;
  const held = PANEL.held, look = PANEL.look, zone = $('#stickZone'), act = $('#btnAct'), use = $('#btnUse'), small = $('#tsmall');
  const right = W - ins.r, bottom = H - ins.b;
  document.body.classList.toggle('touch', isTouch);
  // ub = nút cam Tương tác/Ném (Bếp Chiến); nhỏ hơn nút đỏ
  const ctrl = (bs, ab, z, a, sm, ub) => {
    zone.style.setProperty('--bs', bs + 'px');
    zone.style.setProperty('--bb', z.bb + 'px');
    act.style.setProperty('--ab', ab + 'px');
    setBox(zone, z); setBox(act, a); setBox(small, sm); setBox(use, ub);
    use.style.setProperty('--ub', (ub.width || 0) + 'px');
    use.classList.toggle('tiny', (ub.width || 0) < 66);    // nút cam nhỏ: bỏ dòng "giữ: thái" cho đỡ chật
  };
  const vs = GMODE === 'versus';
  const smw = [...small.children].filter(b => !b.hidden).length * 48 - 8;   // bề rộng hàng nút nhỏ
  if (kind === 'desk') {
    const w = clamp(c.cw * .25, 210, 290);
    setBox(look, { left: c.x + c.cw - w - 10, bottom: H - (c.y + c.ch) + 10, width: w, maxHeight: c.ch * .5 });
    setBox(held, { left: c.x + c.cw - 2 * w - 18, bottom: H - (c.y + c.ch) + 10, width: w, maxHeight: c.ch * .5 });
  } else if (kind === 'side') {
    const S = LAY.S, bs = clamp(Math.min(S - 16, ah * .34), 90, 150);
    const ab = clamp(Math.min(S - 24, ah * (vs ? .24 : .28)), 74, 120), u = vs ? Math.round(ab * .82) : 0, ug = vs ? u + 10 : 0;
    setBox(held, { left: L + 6, top: Tp + g, width: S - 12, maxHeight: Math.max(80, ah - bs - 44) });
    setBox(look, { left: right - S + 6, top: Tp + g, width: S - 12, maxHeight: Math.max(70, ah - ab - ug - 92) });
    ctrl(bs, ab, { left: L, top: Tp + ah * .3, width: S, height: H - Tp - ah * .3, bb: ins.b + 14 },
      { left: right - S / 2 - ab / 2, bottom: ins.b + 14, width: ab, height: ab },
      { left: right - S / 2 - smw / 2, bottom: ins.b + 14 + ab + 10 + ug },
      { left: right - S / 2 - u / 2, bottom: ins.b + 14 + ab + 10, width: u, height: u });
  } else if (kind === 'band') {
    const y0 = c.y + c.ch + g, bh = bottom - g - y0;
    const bs = clamp(bh - 10, 110, 180), ab = clamp(bh - 64, 90, 140), u = vs ? Math.round(ab * .72) : 0;
    const x0 = L + g + bs + 2 * g, x1 = right - g - Math.max(ab, 88) - 2 * g - (vs ? u + g : 0);
    const cw = Math.min(420, (x1 - x0 - g) / 2), cx = (x0 + x1) / 2;
    setBox(held, { left: cx - cw - g / 2, top: y0, width: cw, maxHeight: bh });
    setBox(look, { left: cx + g / 2, top: y0, width: cw, maxHeight: bh });
    ctrl(bs, ab, { left: L, top: y0 - g, width: g + bs + 2 * g, height: H - y0 + g, bb: H - bottom + 4 },
      { left: right - g - ab, bottom: H - bottom + 4, width: ab, height: ab },
      { left: right - g - ab / 2 - smw / 2, bottom: H - bottom + 4 + ab + 10 },
      { left: right - 2 * g - ab - u, bottom: H - bottom + 4 + ab * .45, width: u, height: u });
  } else {
    const ctl = LAY.ctrl, top = c.y + c.ch + g, cw = (aw - 3 * g) / 2;
    const mh = Math.max(96, bottom - ctl - g - top);
    setBox(held, { left: L + g, top, width: cw, maxHeight: mh });
    setBox(look, { left: L + 2 * g + cw, top, width: cw, maxHeight: mh });
    const bs = clamp(Math.min(aw * .34, ctl - 20), 110, 170), ab = clamp(Math.min(aw * .27, ctl - 74), 84, 130);
    const u = vs ? Math.round(ab * .68) : 0, ax = vs ? L + aw - g - ab : L + aw * .75 - ab / 2;
    ctrl(bs, ab, { left: L, top: bottom - ctl, width: aw / 2, height: H - (bottom - ctl), bb: ins.b + 16 },
      { left: ax, bottom: ins.b + 16, width: ab, height: ab },
      { left: Math.min(ax + ab / 2 - smw / 2, right - g - smw), bottom: ins.b + 16 + Math.max(ab, vs ? ab * .45 + u : 0) + 10 },
      { left: ax - g - u, bottom: ins.b + 16 + ab * .45, width: u, height: u });
  }
  [held, look].forEach(el => {
    el.classList.toggle('narrow', parseFloat(el.style.width) < 230);
    el.style.fontSize = big ? '15px' : '13px';
  });
}

/* ---------- Camera ---------- */
// fx, fy = vị trí (ô) cần nhìn theo — thường là nhân vật của mình
function updateCamera(dt, fx, fy) {
  const wx = fx * TW, wy = OY + fy * TH;
  const tx = CAM.w >= VW ? (VW - CAM.w) / 2 : clamp(wx - CAM.w / 2, 0, VW - CAM.w);
  const ty = CAM.h >= VH ? (VH - CAM.h) / 2 : clamp(wy - CAM.h * .55, 0, VH - CAM.h);
  if (!CAM.ready) { CAM.x = tx; CAM.y = ty; CAM.ready = true; }
  else { const k = 1 - Math.exp(-dt * 5); CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k; }
  VIEWX0 = CAM.x; VIEWX1 = CAM.x + CAM.w;
}
// mũi tên ở mép màn hình: có khách đang chờ ở phần quán ngoài khung nhìn
function drawEdgeHints(g, V, disp, t) {
  if (CAM.w >= VW - 1 && CAM.h >= VH - 1) return;
  const z = UIZ, hudH = 56 * z, sides = { l: [], r: [], u: [], d: [] };
  V.custs.forEach(c => {
    if (c.state !== 'wait') return;
    const d = disp['c' + c.id]; if (!d) return;
    const sx = d.x * TW - CAM.x, sy = OY + d.y * TH - CAM.y;
    if (sx < 12) sides.l.push(c); else if (sx > CAM.w - 12) sides.r.push(c);
    else if (sy < hudH + 10) sides.u.push(c); else if (sy > CAM.h + 30) sides.d.push(c);
  });
  ['l', 'r', 'u', 'd'].forEach(k => {
    const list = sides[k]; if (!list.length) return;
    const r = Math.min(...list.map(c => Math.max(0, c.pat / c.max)));
    const col = r < .2 ? '#D9443A' : r < .45 ? '#F2A516' : '#3E9B48';
    const w = 50 * z, h = 42 * z, pulse = r < .2 ? Math.sin(t * 10) * 3 * z : 0;
    const x = k === 'l' ? 6 + pulse : k === 'r' ? CAM.w - w - 6 - pulse : CAM.w / 2 - w / 2;
    const y = k === 'u' ? hudH + 6 + pulse : k === 'd' ? CAM.h - h - 6 - pulse : CAM.h * .45 - h / 2;
    const label = { l: '◀ ' + list.length, r: list.length + ' ▶', u: '▲ ' + list.length, d: '▼ ' + list.length }[k];
    g.fillStyle = '#FFF7E2'; rr(g, x, y, w, h, 10 * z); g.fill();
    g.strokeStyle = col; g.lineWidth = 3 * z; rr(g, x, y, w, h, 10 * z); g.stroke();
    g.fillStyle = '#2B2118'; g.font = `800 ${Math.round(15 * z)}px ${Lang.font()}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, x + w / 2, y + h * .42);
    g.fillStyle = col; rr(g, x + 7 * z, y + h - 9 * z, (w - 14 * z) * Math.max(.08, r), 4 * z, 2 * z); g.fill();
    g.textBaseline = 'alphabetic';
  });
}

/* ---------- Mẹo cho điện thoại cầm dọc ---------- */
function maybeRotateTip() {
  if (portrait && Math.min(innerWidth, innerHeight) < 600) setTimeout(() => toast(T('rotateTip')), 600);
}

/* ---------- Đổi cỡ màn hình, xoay máy ---------- */
let fitTimer = 0;
const refit = () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 60); };
addEventListener('resize', refit);
addEventListener('orientationchange', () => setTimeout(fit, 300));
if (window.visualViewport) visualViewport.addEventListener('resize', refit);
