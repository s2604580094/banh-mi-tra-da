/* touch.js — điều khiển ảo trên điện thoại / máy tính bảng:
   cần điều khiển (trái) để di chuyển, nút đỏ (phải) để cầm / đặt / dùng — giữ nút để rửa bát,
   nút tạm dừng và toàn màn hình. Chỉ hiện khi máy có màn hình cảm ứng và đang chơi. */
const TOUCH = { x: 0, y: 0, on: false, hold: false, useHold: false };
const TOUCH_LAYER = $('#touch'), OVERLAYS = $$('.overlay');

(() => {
  const zone = $('#stickZone'), base = $('#stickBase'), knob = $('#stickKnob'), btn = $('#btnAct');
  let pid = null, cx = 0, cy = 0;

  function moveTo(e) {
    const R = base.offsetWidth * .38;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    TOUCH.x = dx / R; TOUCH.y = dy / R;
  }
  function release() {
    pid = null; TOUCH.on = false; TOUCH.x = TOUCH.y = 0;
    knob.style.transform = '';
    zone.classList.remove('active');
  }
  zone.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (pid !== null) return;
    pid = e.pointerId;
    try { zone.setPointerCapture(pid); } catch (err) { /* trình duyệt cũ */ }
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    TOUCH.on = true; zone.classList.add('active');
    Sound.unlock();
    moveTo(e);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === pid) moveTo(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => zone.addEventListener(t, e => { if (e.pointerId === pid) release(); }));

  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.unlock();
    TOUCH.hold = true; btn.classList.add('down');
    if (playing && !paused) doAct();
  });
  const up = () => { TOUCH.hold = false; btn.classList.remove('down'); };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, up));
  btn.addEventListener('contextmenu', e => e.preventDefault());

  // nút cam (Bếp Chiến): Tương tác / Ném — giữ để cắt thái
  const ub = $('#btnUse');
  ub.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.unlock();
    TOUCH.useHold = true; ub.classList.add('down');
    if (playing && !paused) doUse();
  });
  const uup = () => { TOUCH.useHold = false; ub.classList.remove('down'); };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => ub.addEventListener(t, uup));
  ub.addEventListener('contextmenu', e => e.preventDefault());

  $('#btnPauseT').addEventListener('click', () => togglePause());
  // kính lúp: phóng to (camera đi theo nhân vật) ↔ xem toàn cảnh
  $('#btnZoom').addEventListener('click', () => {
    prog.zoom = prog.zoom === 'all' ? 'near' : 'all'; save(); fit();
    toast(T(prog.zoom === 'all' ? 'zoomAll' : 'zoomNear'));
  });
  const fsBtn = $('#btnFull'), root = document.documentElement;
  const canFs = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  fsBtn.hidden = !canFs;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    Promise.resolve(req && req.call(root))
      .then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); })
      .catch(() => { /* máy không hỗ trợ khóa xoay: bỏ qua */ });
  });

  // iPhone / iPad: chặn phóng to bằng 2 ngón và bật âm thanh khi nhấc tay (Safari cần cử chỉ này)
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  addEventListener('touchend', () => Sound.unlock(), { passive: true });
  // lần chạm đầu tiên → bật chế độ cảm ứng (cho máy tính có màn hình cảm ứng)
  addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; fit(); } }, { passive: true });
})();

// hiện điều khiển ảo khi đang chơi và không có màn hình phủ nào
function syncTouch() {
  const on = isTouch && playing && OVERLAYS.every(o => o.hidden);
  TOUCH_LAYER.classList.toggle('vs', GMODE === 'versus');
  if (TOUCH_LAYER.hidden === on) {
    TOUCH_LAYER.hidden = !on;
    if (!on) { TOUCH.hold = false; TOUCH.useHold = false; TOUCH.on = false; TOUCH.x = TOUCH.y = 0; }
  }
}
