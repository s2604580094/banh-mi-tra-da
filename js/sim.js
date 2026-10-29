/* sim.js — mô phỏng lượt chơi. Chạy trên máy chủ phòng (hoặc khi chơi 1 mình):
   khách đến, nấu nướng, phục vụ tại quán / mang về, rửa bát, tính điểm, trừ điểm, lên cấp.
   Máy khác chỉ gửi vị trí + thao tác và nhận ảnh chụp trạng thái (snap) để vẽ. */
const SIM = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const foodsOf = ids => ids.filter(id => RECIPES[id].type === 'food');
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const fits = (ings, ids) => foodsOf(ids).some(id => ings.every(x => RECIPES[id].ings.includes(x)));
  const recipesFor = lv => Object.keys(GAME.unlocks).filter(k => Number(k) <= lv).flatMap(k => GAME.unlocks[k]);
  const cap = s => s[0].toUpperCase() + s.slice(1);
  let SINK_KEY = '';
  MAP.forEach((row, y) => { const x = row.indexOf('S'); if (x >= 0) SINK_KEY = keyOf(x, y); });

  let S = null, fxId = 0;

  // cấp theo điểm: bậc đầu scoreStep[0], mỗi bậc sau dài thêm scoreStep[1]
  function scoreLevel(score) {
    let lv = 1, from = 0, step = GAME.scoreStep[0];
    while (score >= from + step) { from += step; step += GAME.scoreStep[1]; lv++; }
    return { lv, from, to: from + step };
  }

  /* ---------- Tạo lượt chơi ---------- */
  // roster: [{ pid, name, cfg, slot }]
  function create(roster) {
    const spawns = [[2.5, 6.6], [4.5, 6.6], [6.5, 6.6], [8.5, 6.6]];
    S = {
      time: GAME.duration, score: 0, level: 1, recipes: recipesFor(1), fresh: [], freshUntil: GAME.duration,
      players: {}, tiles: {}, plates: GAME.plates, glasses: GAME.glasses,
      sink: { dirty: [], prog: 0 },
      tables: TABLES.map(() => ({ cust: null, dirty: [], food: [] })),
      wins: [null, null, null], custs: [], uid: 0, spawnT: 1.5,
      stats: { served: 0, lost: 0, wrong: 0, burnt: 0, washed: 0, penalties: 0, combo: 0, comboMax: 0 },
      fx: [], phase: 'play', n: roster.length, result: null,
    };
    roster.forEach((r, i) => {
      S.players[r.pid] = { x: spawns[i][0], y: spawns[i][1], dir: 3, mv: 0, held: null, name: r.name, slot: r.slot, cfg: r.cfg, pose: '', poseT: 0, hold: false };
    });
    MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === 'G' || ch === 'P' || ch === '=') S.tiles[keyOf(x, y)] = { kind: ch, item: null, t: 0, phase: '', p: 0 };
    }));
    return S;
  }

  /* ---------- Sự kiện gửi cho mọi máy (chữ được dịch ở máy nhận) ---------- */
  function fx(e) { e.id = ++fxId; S.fx.push(e); if (S.fx.length > 40) S.fx.shift(); }
  const sfx = n => fx({ k: 'sfx', n });
  const say = (pid, key, vars) => fx({ k: 'toast', to: pid, key, vars });
  function penalty(kind, x, y) {
    const n = GAME.penalty[kind];
    S.stats.penalties += n;
    S.score = Math.max(0, S.score - n);
    fx({ k: 'float', x, y, key: 'p' + cap(kind), vars: { n }, cls: 'loss' });
  }
  function act(p, pose) { p.pose = pose || 'grab'; p.poseT = .3; }
  // đĩa / cốc thủy tinh không mất khi bỏ đồ: thành bát bẩn
  function toDirty(it) {
    if (it && it.k === 'b' && it.w === 'plate') return { k: 'x', n: ['plate'] };
    if (it && it.k === 'c' && it.g === 'glass') return { k: 'x', n: ['glass'] };
    return null;
  }
  function wrongDish(p, x, y) {
    penalty('wrong', x, y);
    S.stats.wrong++;
    S.stats.combo = 0;
    p.held = toDirty(p.held);
    sfx('angry');
  }
  function dishOf(h) {
    if (h.k === 'b' && h.s === 'toast' && h.w) {
      const r = foodsOf(S.recipes).find(id => sameSet(RECIPES[id].ings, h.i));
      return r ? { id: r, mode: h.w === 'plate' ? 'dine' : 'take' } : null;
    }
    if (h.k === 'c' && h.f) {
      const id = h.l ? 'trachanh' : 'trada';
      return S.recipes.includes(id) ? { id, mode: h.g === 'glass' ? 'dine' : 'take' } : null;
    }
    return null;
  }

  /* ---------- Thao tác ---------- */
  function interact(pid, key) {
    const p = S.players[pid];
    if (!p || S.phase !== 'play' || !key) return;
    const [x, y] = key.split(',').map(Number), ch = tileAt(x, y);
    if (STATION[ch] === undefined || Math.hypot(p.x - x - .5, p.y - y - .5) > 2.3) return;
    if (isLocked(ch, S.recipes)) return say(pid, 'tLocked');
    const h = p.held, ts = S.tiles[key];
    switch (ch) {
      case 'B': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'b', s: 'raw', i: [], w: '' }; sfx('place'); return act(p);
      case 'E': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'e', s: 'raw' }; sfx('place'); return act(p);
      case 'C': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'c', g: 'plastic', f: 0, l: false }; sfx('place'); return act(p);
      case 'V':
        if (h) return say(pid, 'tHandsFull');
        if (S.glasses <= 0) return say(pid, 'tNoGlass');
        S.glasses--; p.held = { k: 'c', g: 'glass', f: 0, l: false }; sfx('place'); return act(p);
      case 'G': return cooker(p, pid, ts, 'b', x, y);
      case 'P': return cooker(p, pid, ts, 'e', x, y);
      case 'J':
        if (!h || h.k !== 'c' || h.f) return say(pid, 'tNeedCup');
        h.f = 1; sfx('pour'); return act(p, 'pour');
      case 'L':
        if (!h || h.k !== 'c' || !h.f) return say(pid, 'tNeedTea');
        if (!h.l) { h.l = true; sfx('place'); act(p); }
        return;
      case 'R': case 'W':
        if (!h || h.k !== 'b' || h.s !== 'toast') return say(pid, 'tBakeFirst');
        if (h.w) return say(pid, 'tAlreadyWrapped');
        if (ch === 'R') { if (S.plates <= 0) return say(pid, 'tNoPlate'); S.plates--; h.w = 'plate'; }
        else h.w = 'paper';
        sfx('place'); return act(p);
      case 'X': return trash(p, pid, x, y);
      case 'S':
        if (h && h.k === 'x') { S.sink.dirty.push(...h.n); p.held = null; sfx('place'); return act(p); }
        if (h) return say(pid, 'tHandsFull');
        if (!S.sink.dirty.length) return say(pid, 'tNothing');
        return;   // rửa bằng cách giữ phím (setHold)
      case '=': return counter(p, pid, ts, x, y);
      case 'T': return table(p, pid, TABLE_AT[key], x, y);
      case 'm': return takeaway(p, pid, winOfCol(x), x, y);
      default: if (BIN[ch]) return addIng(p, pid, BIN[ch], x, y);
    }
  }
  function cooker(p, pid, ts, kind, x, y) {
    const h = p.held;
    if (ts.item) {
      if (!h) { p.held = ts.item; ts.item = null; ts.t = 0; ts.phase = ''; sfx('place'); return act(p); }
      // cầm bánh nướng tới chảo có trứng chín → kẹp trứng
      if (kind === 'e' && h.k === 'b' && h.s === 'toast' && ts.item.s === 'fried') {
        if (h.i.includes('trung')) return say(pid, 'tHasIng', { ing: '@ing:trung' });
        ts.item = null; ts.t = 0; ts.phase = '';
        h.i.push('trung'); sfx('place'); act(p, 'ing');
        if (!fits(h.i, S.recipes)) wrongDish(p, x + .5, y);
        return;
      }
      return say(pid, 'tHandsFull');
    }
    if (!h) return say(pid, 'tNothing');
    if ((kind === 'b' && h.k === 'b' && h.s === 'raw' && !h.w) || (kind === 'e' && h.k === 'e' && h.s === 'raw')) {
      ts.item = h; ts.t = 0; p.held = null; sfx('place'); return act(p, 'grill');
    }
    return say(pid, 'tCantPlace');
  }
  function addIng(p, pid, ing, x, y) {
    const h = p.held;
    if (!h || h.k !== 'b' || h.s !== 'toast') return say(pid, 'tBakeFirst');
    if (h.i.includes(ing)) return say(pid, 'tHasIng', { ing: '@ing:' + ing });
    h.i.push(ing); sfx('place'); act(p, 'ing');
    if (!fits(h.i, S.recipes)) wrongDish(p, x + .5, y);
  }
  function counter(p, pid, ts, x, y) {
    const h = p.held, it = ts.item;
    if (it) {
      if (!h) { p.held = it; ts.item = null; sfx('place'); return act(p); }
      if (h.k === 'e' && h.s === 'fried' && it.k === 'b' && it.s === 'toast' && !it.i.includes('trung')) {
        it.i.push('trung'); p.held = null; sfx('place'); act(p, 'ing');
        if (!fits(it.i, S.recipes)) { penalty('wrong', x + .5, y); S.stats.wrong++; ts.item = toDirty(it); sfx('angry'); }
        return;
      }
      if (h.k === 'b' && h.s === 'toast' && it.k === 'e' && it.s === 'fried' && !h.i.includes('trung')) {
        ts.item = null; h.i.push('trung'); sfx('place'); act(p, 'ing');
        if (!fits(h.i, S.recipes)) wrongDish(p, x + .5, y);
        return;
      }
      if (h.k === 'x' && it.k === 'x') { h.n.push(...it.n); ts.item = null; sfx('place'); return act(p); }
      return say(pid, 'tHandsFull');
    }
    if (!h) return say(pid, 'tNothing');
    ts.item = h; p.held = null; sfx('place'); act(p);
  }
  function trash(p, pid, x, y) {
    const h = p.held;
    if (!h) return say(pid, 'tNothing');
    if (h.k === 'x') return say(pid, 'tDirtyToSink');
    const free = h.s === 'burnt' || (h.k === 'c' && !h.f) || (h.k === 'b' && h.s === 'raw' && !h.i.length);
    if (!free) penalty('waste', x + .5, y);
    p.held = toDirty(h);
    sfx('trash'); act(p, 'trash');
  }
  function table(p, pid, ti, x, y) {
    const t = S.tables[ti], h = p.held;
    if (t.dirty.length && (!h || h.k === 'x')) {
      p.held = { k: 'x', n: [...(h ? h.n : []), ...t.dirty] }; t.dirty = []; sfx('place'); return act(p);
    }
    const c = t.cust != null ? S.custs.find(k => k.id === t.cust) : null;
    if (c && c.state === 'wait' && h) return serve(p, pid, c, 'dine', x, y);
    return say(pid, h ? 'tCantPlace' : 'tNothing');
  }
  function takeaway(p, pid, wi, x, y) {
    const id = S.wins[wi], c = id != null ? S.custs.find(k => k.id === id) : null;
    if (!c || c.state !== 'wait' || !p.held) return say(pid, 'tNothing');
    serve(p, pid, c, 'take', x, y);
  }
  function serve(p, pid, c, mode, x, y) {
    const h = p.held;
    if (h.k === 'x') return say(pid, 'tDirtyToSink');
    const d = dishOf(h);
    if (!d) {
      if (h.k === 'b' && h.s === 'toast') {
        const complete = foodsOf(S.recipes).some(id => sameSet(RECIPES[id].ings, h.i));
        return say(pid, complete && !h.w ? (mode === 'dine' ? 'tNeedDine' : 'tNeedTake') : 'tNotReady');
      }
      if (h.k === 'c' && !h.f) return say(pid, 'tNeedTea');
      return say(pid, 'tCantPlace');
    }
    const it = c.items.find(i => !i.done && i.id === d.id);
    if (!it) return wrongDish(p, x + .5, y);
    if (d.mode !== mode) return say(pid, mode === 'dine' ? 'tNeedDine' : 'tNeedTake');
    it.done = true; p.held = null; sfx('place'); act(p, 'serve');
    if (mode === 'dine') S.tables[c.table].food.push(h);
    if (c.items.every(i => i.done)) pay(c);
  }
  function pay(c) {
    const base = c.items.reduce((s, it) => s + RECIPES[it.id].price, 0);
    const tip = Math.round(base * .3 * Math.max(0, c.pat / c.max));
    const st = S.stats;
    st.combo++; st.comboMax = Math.max(st.comboMax, st.combo);
    const bonus = st.combo >= 2 ? Math.min(5, st.combo - 1) : 0;
    const total = base + tip + bonus;
    S.score += total; st.served++;
    fx({ k: 'float', x: c.x, y: c.y - 1.6, raw: '+' + total, cls: 'gain' });
    if (bonus) fx({ k: 'banner', key: 'combo', vars: { n: st.combo } });
    sfx('coin');
    for (const id in S.players) act(S.players[id], 'happy');
    if (c.type === 'take') leave(c, true);
    else { c.state = 'eat'; c.eatT = COOK.eat; c.mood = 'happy'; }
    checkLevel();
  }

  /* ---------- Khách ---------- */
  function makeOrder() {
    const foods = foodsOf(S.recipes), drinks = S.recipes.filter(r => RECIPES[r].type === 'drink');
    const fresh = S.time > S.freshUntil ? S.fresh : [];
    const choose = list => { const f = fresh.filter(r => list.includes(r)); return f.length && Math.random() < .4 ? pick(f) : pick(list); };
    if (drinks.length && Math.random() < GAME.double(S.level)) return [choose(foods), choose(drinks)];
    return [Math.random() < .7 || !drinks.length ? choose(foods) : choose(drinks)];
  }
  function spawn() {
    const freeT = S.tables.map((t, i) => (t.cust == null && !t.dirty.length ? i : -1)).filter(i => i >= 0);
    const freeW = [0, 1, 2].filter(i => S.wins[i] == null);
    let type;
    if (freeT.length && freeW.length) type = Math.random() < GAME.dineShare ? 'dine' : 'take';
    else if (freeT.length) type = 'dine';
    else if (freeW.length) type = 'take';
    else return false;
    const look = { skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), shirt: pick(LOOKS.shirt), style: pick(LOOKS.style), helmet: pick(LOOKS.helmet), glasses: Math.random() < .2 };
    const items = makeOrder().map(rid => ({ id: rid, mode: type, done: false }));
    const max = GAME.patience(S.level) + (items.length - 1) * 8;
    const left = Math.random() < .5, sy = 10.65;
    const c = { id: ++S.uid, type, cfg: CHAR.custCfg(look), items, pat: max, max, mood: 'normal', state: 'enter', x: left ? -1 : 21, y: sy, dir: left ? 2 : 1, mv: 1, left };
    if (type === 'take') {
      const w = pick(freeW); S.wins[w] = c.id; c.win = w;
      c.path = [[WINDOW_COLS[w] + .5, sy]];
    } else {
      const ti = pick(freeT), seat = TABLES[ti].seat; S.tables[ti].cust = c.id; c.table = ti;
      c.path = [[17.5, sy], [17.5, 8.6], [seat.x + .5, 8.6], [seat.x + .5, seat.y + .75]];
    }
    S.custs.push(c);
    return true;
  }
  function leave(c, happy) {
    c.state = 'leave'; c.mood = happy ? 'happy' : 'angry';
    if (!happy) {
      penalty('leave', c.x, c.y - 1.6);
      S.stats.lost++; S.stats.combo = 0;
      sfx('angry');
      for (const id in S.players) act(S.players[id], 'sad');
    }
    const out = c.left ? 21 : -1, sy = 10.65;
    if (c.type === 'take') { S.wins[c.win] = null; c.path = [[out, sy]]; }
    else {
      const t = S.tables[c.table], seat = TABLES[c.table].seat;
      t.dirty.push(...t.food.map(f => (f.k === 'b' ? 'plate' : 'glass')));
      t.food = []; t.cust = null;
      c.path = [[seat.x + .5, 8.6], [17.5, 8.6], [17.5, sy], [out, sy]];
    }
  }
  function stepCust(c, dt) {
    if (c.path && c.path.length) {
      const [tx, ty] = c.path[0], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = 2.6 * dt;
      c.mv = 1;
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      if (d <= sp) { c.x = tx; c.y = ty; c.path.shift(); } else { c.x += dx / d * sp; c.y += dy / d * sp; }
      if (!c.path.length) {
        c.mv = 0;
        if (c.state === 'enter') {
          c.state = 'wait'; c.dir = c.type === 'take' ? 3 : 1;
          const names = Object.values(S.players).map(p => p.name);
          if (Math.random() < .6) fx({ k: 'float', x: c.x, y: c.y - 2.4, key: 'greet', vars: { name: pick(names) }, cls: 'greet' });
          sfx('bell');
        } else if (c.state === 'leave') c.gone = true;
      }
      return;
    }
    if (c.state === 'wait') {
      c.pat -= dt;
      const r = c.pat / c.max;
      c.mood = r < .2 ? 'angry' : r < .45 ? 'worried' : 'normal';
      if (c.pat <= 0) leave(c, false);
    } else if (c.state === 'eat') {
      c.eatT -= dt;
      if (c.eatT <= 0) leave(c, true);
    }
  }

  /* ---------- Bếp, rửa bát, cấp độ ---------- */
  function cook(ts, key, dt) {
    const it = ts.item;
    if (!it) { ts.phase = ''; return; }
    ts.t += dt;
    const bread = ts.kind === 'G', A = bread ? [COOK.bread, COOK.breadWarn, COOK.breadBurn] : [COOK.egg, COOK.eggWarn, COOK.eggBurn];
    if (ts.t < A[0]) { ts.phase = 'cook'; ts.p = ts.t / A[0]; return; }
    if (it.s === 'raw') it.s = bread ? 'toast' : 'fried';
    if (ts.t < A[1]) { ts.phase = 'ready'; return; }
    if (ts.t < A[2]) { ts.phase = 'warn'; ts.p = (ts.t - A[1]) / (A[2] - A[1]); return; }
    ts.phase = 'burnt';
    if (it.s !== 'burnt') {
      it.s = 'burnt'; S.stats.burnt++;
      const [x, y] = key.split(',').map(Number);
      penalty('burnt', x + .5, y - .6);
      sfx('burn');
    }
  }
  function wash(dt) {
    const sk = S.sink;
    if (!sk.dirty.length) { sk.prog = 0; return; }
    const washers = Object.values(S.players).filter(p => p.hold && !p.held && findTarget(p) === SINK_KEY);
    if (!washers.length) return;
    washers.forEach(p => { p.pose = 'wash'; p.poseT = .2; });
    sk.prog += dt / COOK.wash * (1 + .5 * (washers.length - 1));
    if (sk.prog >= 1) {
      sk.prog = 0;
      if (sk.dirty.shift() === 'plate') S.plates++; else S.glasses++;
      S.stats.washed++;
      sfx('wash');
    }
  }
  function checkLevel() {
    const elapsed = GAME.duration - S.time;
    const lv = Math.max(S.level, 1 + Math.floor(elapsed / GAME.levelEvery), scoreLevel(S.score).lv);
    if (lv <= S.level) return;
    const before = S.recipes;
    S.level = lv; S.recipes = recipesFor(lv);
    const fresh = S.recipes.filter(r => !before.includes(r));
    if (fresh.length) { S.fresh = fresh; S.freshUntil = S.time - 25; }
    fx({ k: 'banner', key: 'levelUp', vars: { n: lv } });
    fx(fresh.length ? { k: 'toast', key: 'newDish', vars: { dish: '@dishes:' + fresh.join(',') } } : { k: 'toast', key: 'busier' });
    sfx('level');
  }
  function update(dt) {
    if (!S || S.phase !== 'play') return;
    S.time -= dt;
    checkLevel();
    if (S.time > 4) {
      S.spawnT -= dt;
      if (S.spawnT <= 0) { const [a, b] = GAME.spawn(S.level, S.n); S.spawnT = spawn() ? rand(a, b) : .5; }
    }
    for (const key in S.tiles) { const ts = S.tiles[key]; if (ts.kind !== '=') cook(ts, key, dt); }
    S.custs.forEach(c => stepCust(c, dt));
    S.custs = S.custs.filter(c => !c.gone);
    wash(dt);
    for (const id in S.players) { const p = S.players[id]; if (p.poseT > 0 && (p.poseT -= dt) <= 0) p.pose = ''; }
    if (S.time <= 0) {
      S.time = 0; S.phase = 'end';
      S.result = { score: S.score, level: S.level, ...S.stats };
    }
  }

  /* ---------- Từ máy người chơi khác ---------- */
  function setPos(pid, x, y, dir, mv) {
    const p = S && S.players[pid];
    if (!p || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (canStand(x, y)) { p.x = x; p.y = y; }
    p.dir = dir & 3; p.mv = mv ? 1 : 0;
  }
  function setHold(pid, on) { const p = S && S.players[pid]; if (p) p.hold = !!on; }
  function removePlayer(pid) { if (S) delete S.players[pid]; }

  // ảnh chụp gửi cho các máy khác (bỏ đường đi của khách cho gọn)
  function snap() {
    return {
      time: S.time, score: S.score, level: S.level, recipes: S.recipes, phase: S.phase, result: S.result,
      players: S.players, tiles: S.tiles, plates: S.plates, glasses: S.glasses, sink: S.sink,
      tables: S.tables, wins: S.wins, fx: S.fx,
      custs: S.custs.map(c => ({ id: c.id, type: c.type, cfg: c.cfg, items: c.items, pat: c.pat, max: c.max, mood: c.mood, state: c.state, x: c.x, y: c.y, dir: c.dir, mv: c.mv })),
    };
  }
  return { create, update, interact, setPos, setHold, removePlayer, snap, scoreLevel, get S() { return S; } };
})();
