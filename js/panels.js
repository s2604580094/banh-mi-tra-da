/* panels.js — 2 thẻ chữ to bằng HTML (dễ đọc cả trên điện thoại):
   "Đang cầm":  những gì đã cho vào bánh / cốc, đủ món chưa, còn thiếu gì
   "Trước mặt": khu đang đứng sát, và nếu có khách ở đó thì hiện đơn của khách thật to */
const PANEL = { held: $('#heldCard'), look: $('#lookCard'), hh: '', lh: '' };
const ingName = k => Lang.name(INGS[k].name);
const dishName = r => Lang.name(RECIPES[r].name);
const sameIngs = (a, b) => a.length === b.length && a.every(x => b.includes(x));

/* ---------- Biểu tượng SVG cho thẻ ---------- */
function plasticSvg(f, l) {
  return '<svg viewBox="0 0 40 56" aria-hidden="true">' +
    (f ? '<path d="M9.6 19H30.4L28 52H12Z" fill="#B8641C"/>' : '') +
    '<path d="M8 12H32L28 52H12Z" fill="rgba(255,255,255,.35)" stroke="#8FA6B5" stroke-width="2"/>' +
    '<ellipse cx="20" cy="12" rx="12.5" ry="3.5" fill="rgba(255,255,255,.85)" stroke="#8FA6B5" stroke-width="1.5"/>' +
    '<path d="M22 12L27 1" stroke="#D8261E" stroke-width="3" stroke-linecap="round"/>' +
    (l ? '<circle cx="11" cy="15" r="6.5" fill="#5FB236"/><circle cx="11" cy="15" r="5" fill="#D8F0A2"/>' : '') + '</svg>';
}
function dirtySvg(n) {
  let s = '<svg viewBox="0 0 60 40" aria-hidden="true">';
  for (let i = 0; i < Math.min(n, 4); i++) s += `<ellipse cx="30" cy="${34 - i * 6}" rx="26" ry="6" fill="#E9E6DE" stroke="#8E9AA6" stroke-width="1.5"/><ellipse cx="${24 + i * 3}" cy="${33 - i * 6}" rx="6" ry="2" fill="#A07040"/>`;
  return s + '</svg>';
}
function breadSvg(st, ings, w) {
  const inner = ART.bread(st, ings).replace('<svg class="bread" viewBox="0 0 100 54" aria-hidden="true">', '<svg x="0" y="2" width="100" height="54" viewBox="0 0 100 54">');
  const plate = w === 'plate' ? '<ellipse cx="50" cy="56" rx="48" ry="9" fill="#fff" stroke="#2F74B5" stroke-width="3"/>' : '';
  const paper = w === 'paper' ? '<path d="M8 32H92L86 62H14Z" fill="#C9A06A" stroke="#8C6436" stroke-width="2"/><path d="M34 32L32 62M66 32L68 62" stroke="#A9814E" stroke-width="2"/>' : '';
  return `<svg viewBox="0 0 100 66" aria-hidden="true">${plate}${inner}${paper}</svg>`;
}
function itemIcon(it) {
  if (it.k === 'b') return breadSvg(it.s === 'raw' ? 'raw' : it.s === 'burnt' ? 'burnt' : 'toast', it.i, it.w);
  if (it.k === 'e') return it.s === 'raw' ? ART.ing('trung') : ART.egg(it.s === 'fried' ? 'ready' : 'burnt');
  if (it.k === 'c') return it.g === 'glass' ? ART.cup(it.f ? 1 : 0, it.l) : plasticSvg(it.f, it.l);
  if (it.k === 'i') return ART.ing(it.cut ? it.g + '_cut' : it.g);
  if (it.k === 'peel') return ART.peel();
  return dirtySvg(it.n.length);
}
const pchip = (icon, label, cls = '') => `<span class="chip-i ${cls}">${icon}${esc(label)}</span>`;
const ingChips = (ings, cls) => ings.map(k => pchip(ART.ing(k), ingName(k), cls)).join('');
const TEA_ICON = () => ART.cup(1, false);

/* ---------- Mô tả đồ đang cầm ---------- */
function describe(it) {
  const d = { title: '', sub: '', chips: '', stat: null, note: '' };
  if (!it) { d.title = T('handsEmpty'); d.note = T('hintEmpty'); return d; }
  if (it.k === 'b') {
    if (it.s === 'raw') { d.title = T('itRawBread'); d.note = T('noteRawBread'); return d; }
    if (it.s === 'burnt') { d.title = T('itBurnt'); d.stat = ['bad', T('noteBurnt')]; return d; }
    d.title = T('itToast');
    d.sub = V.mode === 'versus' ? '' : T(it.w === 'plate' ? 'onPlate' : it.w === 'paper' ? 'inPaper' : 'notWrapped');
    const foods = V.recipes.filter(r => RECIPES[r].type === 'food');
    const match = foods.find(r => sameIngs(RECIPES[r].ings, it.i));
    let miss = [];
    if (match) {
      d.stat = ['ok', '✓ ' + T('doneDish', { dish: dishName(match) })];
      if (!it.w && V.mode !== 'versus') d.note = T('wrapHint');
    } else {
      const poss = foods.filter(r => it.i.every(k => RECIPES[r].ings.includes(k)))
        .sort((a, b) => RECIPES[a].ings.length - RECIPES[b].ings.length);
      if (poss.length) {
        miss = RECIPES[poss[0]].ings.filter(k => !it.i.includes(k));
        d.stat = ['warn', T('canBe', { list: poss.map(dishName).join(', ') })];
      } else d.stat = ['bad', T('noMatch')];
    }
    d.chips = (it.i.length ? `<div class="chips">${ingChips(it.i)}</div>` : '') +
      (miss.length ? `<div class="chips"><em class="lbl">${T('missingLbl')}</em>${ingChips(miss, 'miss')}</div>` : '');
    return d;
  }
  if (it.k === 'e') {
    if (it.s === 'raw') { d.title = T('itRawEgg'); d.note = T('noteRawEgg'); }
    else if (it.s === 'fried') { d.title = T('itFried'); d.note = T('noteFried'); }
    else { d.title = T('itBurnt'); d.stat = ['bad', T('noteBurnt')]; }
    return d;
  }
  if (it.k === 'c') {
    d.title = T(it.g === 'glass' ? 'itGlass' : 'itPlastic');
    d.sub = T(it.g === 'glass' ? 'forDine' : 'forTake');
    const parts = (it.f ? pchip(TEA_ICON(), T('teaIce')) : '') + (it.l ? pchip(ART.ing('chanh'), ingName('chanh')) : '');
    if (parts) d.chips = `<div class="chips">${parts}</div>`;
    if (!it.f) d.note = T('noteEmptyCup');
    else if (it.l) d.stat = V.recipes.includes('trachanh') ? ['ok', '✓ ' + dishName('trachanh')] : ['bad', T('noMatch')];
    else {
      d.stat = ['ok', '✓ ' + dishName('trada')];
      if (V.recipes.includes('trachanh')) d.note = T('noteAddLemon');
    }
    return d;
  }
  if (it.k === 'i') {
    const nm = ingName(it.g);
    d.title = T(it.cut ? 'itIngCut' : 'itIngRaw', { ing: nm });
    if (it.cut) d.stat = ['ok', '✓ ' + T('boardCut')], d.note = T('noteCutReady');
    else d.stat = ['warn', T('noteNeedChop')];
    return d;
  }
  if (it.k === 'peel') { d.title = T('itPeel'); d.note = T('notePeel'); return d; }
  d.title = T('itDirty', { n: it.n.length }); d.stat = ['warn', T('noteDirty')];
  return d;
}
function itemBlock(it) {
  const d = describe(it);
  return `<div class="pmain"><span class="pic${it ? '' : ' none'}">${it ? itemIcon(it) : ''}</span>` +
    `<span class="ptx"><b>${esc(d.title)}</b>${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span></div>` +
    d.chips + (d.stat ? `<div class="pstat ${d.stat[0]}">${esc(d.stat[1])}</div>` : '') +
    (d.note ? `<p class="pnote hint">${esc(d.note)}</p>` : '');
}

/* ---------- Đơn của khách (phóng to) ---------- */
function orderHTML(c) {
  const vs = V.mode === 'versus', dine = c.type === 'dine' && !vs;
  const myTeam = vs && V.players[me] ? V.players[me].team : -1;
  const tag = !vs ? `<span class="mode ${c.type}">${T(dine ? 'modeDine' : 'modeTake')}</span>`
    : c.fake != null && c.fake === myTeam ? `<span class="mode fake">${T('custFake')}</span>`
    : c.vip || c.fake != null ? `<span class="mode vip">${T('custVip')}</span>` : '';
  return `<div class="ohead">${tag}<span class="pbar"><i></i></span></div>` +
    c.items.map(it => {
      const R = RECIPES[it.id], food = R.type === 'food';
      const icon = food ? breadSvg('toast', R.ings, vs ? '' : dine ? 'plate' : 'paper') : (dine ? ART.cup(1, R.lemon) : plasticSvg(1, R.lemon));
      const need = vs ? (R.vip ? '+' + VS.vipBonus + ' VIP' : '') : T(food ? (dine ? 'needPlate' : 'needPaper') : (dine ? 'needGlass' : 'needPlastic'));
      const chips = food ? ingChips(R.ings) : R.lemon ? ingChips(['chanh']) : '';
      return `<div class="oline${it.done ? ' done' : ''}"><span class="pic">${icon}</span>` +
        `<span class="ptx"><b>${esc(dishName(it.id))}</b>${need ? `<small>${esc(need)}</small>` : ''}${chips ? `<span class="chips">${chips}</span>` : ''}</span></div>`;
    }).join('');
}

/* ---------- Thẻ "Trước mặt" ---------- */
const STATION_NOTE = { B: 'noteB', E: 'noteE', C: 'noteC', J: 'noteJ', L: 'noteL', W: 'noteW', X: 'noteX', Z: 'noteZ', N: 'noteN' };
function lookHTML(key) {
  const useKey = ['Q', 'K'].includes(key ? tileAt(...key.split(',').map(Number)) : '') && V.mode === 'versus';
  const head = name => `<div class="ph">${isTouch ? '' : `<kbd>${useKey ? 'E' : 'Space'}</kbd>`}<b>${esc(name)}</b></div>`;
  if (!key) return { html: `<div class="ph">${T('lookTitle')}</div><p class="pnote">${T('lookNone')}</p>`, cust: null };
  const [x, y] = key.split(',').map(Number), ch = tileAt(x, y);
  const name = BIN[ch] ? ingName(BIN[ch]) : T(STATION[ch]);
  const note = (t, hint) => `<p class="pnote${hint ? ' hint' : ''}">${esc(t)}</p>`, stat = (c, t) => `<div class="pstat ${c}">${esc(t)}</div>`;
  let body = '', cust = null;
  if (isLocked(ch, V.recipes)) body = stat('bad', T('lockedSt'));
  else if (ch === 'T' || ch === 'm') {
    if (ch === 'T') {
      const t = V.tables[TABLE_AT[key]];
      cust = t.cust != null ? V.custs.find(c => c.id === t.cust) : null;
      if (t.dirty && t.dirty.length) body = stat('warn', T('tableDirty', { n: t.dirty.length }));
    } else {
      const id = V.wins[winOfCol(x)];
      cust = id != null ? V.custs.find(c => c.id === id) : null;
    }
    if (cust && cust.state === 'wait') body = orderHTML(cust) + body;
    else {
      if (cust && cust.state === 'eat') body = note(T('custEating')) + body;
      else if (!body) body = note(T(ch === 'T' ? 'tableEmpty' : 'winEmpty'));
      cust = null;
    }
  } else if (ch === 'G' || ch === 'P') {
    const ts = V.tiles[key];
    if (!ts || !ts.item) body = note(T('ckEmpty'));
    else {
      const ph = ts.phase, msg = ph === 'cook' ? ['warn', T('ckCook')] : ph === 'ready' ? ['ok', T(ch === 'G' ? 'ckReadyBread' : 'ckReadyEgg')]
        : ph === 'warn' ? ['bad', T('ckWarn')] : ['bad', T('ckBurnt')];
      body = `<div class="pmain"><span class="pic">${itemIcon(ts.item)}</span>${stat(msg[0], msg[1])}</div>`;
    }
  } else if (ch === 'K') {
    const ts = V.tiles[key];
    if (!ts || !ts.item) body = note(T('noteK'), true);
    else body = `<div class="pmain"><span class="pic">${itemIcon(ts.item)}</span>` +
      (ts.item.cut ? stat('ok', '✓ ' + T('boardCut')) : stat('warn', ts.p > 0 ? T('chopProg', { n: Math.round(ts.p * 100) }) : T('noteNeedChop'))) + '</div>';
  } else if (ch === 'M') {
    const mk = V.market && V.market[key];
    body = mk && mk.it ? `<div class="pmain"><span class="pic">${itemIcon(mk.it)}</span>${stat('ok', T('mkHas', { ing: ingName(mk.it.g) }))}</div>`
      : mk && mk.warn > 0 ? stat('warn', T('mkSoon', { n: Math.ceil(mk.warn) })) : note(T('mkEmpty'));
  } else if (ch === 'Q') {
    const cd = V.bellCd ? V.bellCd[teamOfX(x)] : 0;
    body = note(T('noteQ')) + stat(cd > 0 ? 'warn' : 'ok', cd > 0 ? T('bellWait', { n: Math.ceil(cd) }) : T('bellReady'));
  } else if (ch === '=') {
    const ts = V.tiles[key];
    body = ts && ts.item ? itemBlock(ts.item) : note(T('counterFree'), true);
  } else if (ch === 'S') {
    const n = V.sink.dirty.length;
    body = note(T('sinkInfo', { n })) + (n ? stat('warn', T(isTouch ? 'sinkHoldTouch' : 'sinkHoldKey')) : '');
  } else if (ch === 'R') body = stat(V.plates ? 'ok' : 'bad', T('cleanPlates', { n: V.plates }));
  else if (ch === 'V') body = stat(V.glasses ? 'ok' : 'bad', T('cleanGlasses', { n: V.glasses }));
  else if (BIN[ch]) body = note(T('noteBin', { ing: ingName(BIN[ch]).toLowerCase() }), true);
  else if (STATION_NOTE[ch]) body = note(T(STATION_NOTE[ch]), true);
  return { html: head(name) + body, cust };
}

/* ---------- Cập nhật mỗi khung hình (chỉ vẽ lại HTML khi nội dung đổi) ---------- */
function updatePanels(target) {
  const on = !!(playing && V && local && V.phase === 'play');
  if (PANEL.held.hidden === on) PANEL.held.hidden = PANEL.look.hidden = !on;
  if (!on) return;
  const p = V.players[me];
  const hh = `<div class="ph">${T('heldTitle')}</div>` + itemBlock(p ? p.held : null);
  if (hh !== PANEL.hh) PANEL.held.innerHTML = PANEL.hh = hh;
  const { html, cust } = lookHTML(target);
  if (html !== PANEL.lh) PANEL.look.innerHTML = PANEL.lh = html;
  if (cust) {
    const bar = PANEL.look.querySelector('.pbar i');
    if (bar) {
      const r = Math.max(0, Math.min(1, cust.pat / cust.max));
      bar.style.width = (r * 100).toFixed(1) + '%';
      bar.className = r < .2 ? 'low' : r < .45 ? 'mid' : '';
    }
  }
}
