/* versus.js — mô phỏng chế độ BẾP CHIẾN (2 đội đối kháng, 1v1 / 2v1 / 2v2).
   Chạy trên máy chủ phòng (hoặc khi luyện tập 1 mình). Hai bếp đối diện nhau, khách ngồi ở vỉa hè chung giữa bản đồ:
   đội nào mang đúng món tới trước thì được điểm. Nguyên liệu hiếm xuất hiện ở chợ giữa map để hai đội tranh nhau.
   Vật phẩm gây nhiễu: vỏ chuối (ném hoặc đặt trên sàn, ai giẫm phải trượt chân, đánh rơi đồ), chuông gọi khách VIP giả.
   30 giây cuối là GIỜ CAO ĐIỂM: khách đến dồn dập, mất điện, sàn bếp trôi, khay nguyên liệu bị đảo chỗ.
   Cùng giao diện với SIM (sim.js): create, update, interact (Nhặt/Thả), use (Tương tác/Ném), setPos, setHold, snap. */
const SIMV = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const foodsOf = ids => ids.filter(id => RECIPES[id].type === 'food');
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const fits = (ings, ids) => foodsOf(ids).some(id => ings.every(x => RECIPES[id].ings.includes(x)));
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const ALL = [...VS.menu, ...VS.vipMenu];
  const STREET_Y = 11.65, MIDX = 12.5;
  let S = null, fxId = 0, uid = 0;

  /* ---------- Tạo trận ---------- */
  // roster: [{ pid, name, cfg, slot, team }]
  function create(roster) {
    const spot = [[[3.5, 5.6], [6.5, 5.6]], [[21.5, 5.6], [18.5, 5.6]]];
    const n = [0, 0];
    roster.forEach(r => n[r.team === 1 ? 1 : 0]++);
    const boost = [1, 1];
    if (n[0] && n[1] && n[0] !== n[1]) boost[n[0] < n[1] ? 0 : 1] = VS.soloBoost;
    const ev = { dark1: [rand(26, 28), 0], shuffle: rand(15, 18), dark2: [rand(8, 10), 0] };
    ev.dark1[1] = ev.dark1[0] - 6; ev.dark2[1] = ev.dark2[0] - 4.5;
    // sàn trôi: bắt đầu ngay sau lần mất điện đầu, khay đổi chỗ xảy ra giữa lúc sàn đang trôi
    ev.slide = [ev.dark1[1] - 1.5, ev.dark1[1] - 1.5 - VS.slideLen];
    S = {
      mode: 'versus', time: VS.duration, phase: 'play', recipes: ALL.slice(), players: {}, tiles: {}, market: {},
      floor: [], fly: [], custs: [], tables: TABLES.map(() => ({ cust: null })),
      teams: [0, 1].map(() => ({ score: 0, served: 0, items: 0, vip: 0, rare: 0, tricks: 0, slips: 0, wrong: 0, burnt: 0, penalties: 0, combo: 0, comboMax: 0 })),
      n, boost, bellCd: [0, 0], peelCd: [0, 0], dark: 0, rush: false, ovr: null, ev, shuffled: false, darkOn: 0, slide: 0,
      spawnT: 1.2, vipT: rand(14, 18), marketT: rand(5, 7), fx: [], result: null,
    };
    const used = [0, 0];
    roster.forEach(r => {
      const t = r.team === 1 ? 1 : 0, [x, y] = spot[t][used[t]++ % 2];
      S.players[r.pid] = {
        x, y, dir: 3, mv: 0, held: null, name: r.name, slot: r.slot, team: t,
        cfg: { ...r.cfg, color: TEAMCOL[t] }, pose: '', poseT: 0, hold: false, stun: 0, svx: 0, svy: 0,
      };
    });
    MAP_CUR.forEach((row, y) => [...row].forEach((ch, x) => {
      const key = keyOf(x, y);
      if ('GP=K'.includes(ch)) S.tiles[key] = { kind: ch, item: null, t: 0, phase: '', p: 0 };
      if (ch === 'M') S.market[key] = { x, y, it: null, warn: 0, pend: null };
    }));
    OVR = null;
    return S;
  }

  /* ---------- Sự kiện gửi cho mọi máy ---------- */
  function fx(e) { e.id = ++fxId; S.fx.push(e); if (S.fx.length > 50) S.fx.shift(); }
  const sfx = n => fx({ k: 'sfx', n });
  const say = (pid, key, vars) => fx({ k: 'toast', to: pid, key, vars });
  function act(p, pose) { p.pose = pose || 'grab'; p.poseT = .3; }
  function penalty(team, kind, x, y) {
    const n = VS.penalty[kind], T = S.teams[team];
    T.penalties += n; T.score = Math.max(0, T.score - n);
    fx({ k: 'float', x, y, key: 'p' + cap(kind), vars: { n }, cls: 'loss' });
  }
  const reach = (p, x, y) => Math.hypot(p.x - x - .5, p.y - y - .5) <= 2.3;
  const ingOf = it => (it.k === 'e' && it.s === 'fried' ? 'trung' : it.k === 'i' && it.cut ? it.g : null);
  const isToast = it => it && it.k === 'b' && it.s === 'toast';
  function wrong(p, x, y, dropItem = true) {
    const T = S.teams[p.team];
    penalty(p.team, 'wrong', x, y);
    T.wrong++; T.combo = 0;
    if (dropItem) p.held = null;
    sfx('angry');
  }
  // thêm nguyên liệu vào ổ bánh; kẹp sai món thì bánh hỏng, trừ điểm
  function addTo(bread, ing, p, x, y) {
    bread.i.push(ing);
    sfx('place'); act(p, 'ing');
    if (!fits(bread.i, S.recipes)) return false;
    return true;
  }
  function dishOf(h) {
    if (isToast(h)) { const r = foodsOf(S.recipes).find(id => sameSet(RECIPES[id].ings, h.i)); return r || null; }
    if (h.k === 'c' && h.f) return h.l ? 'trachanh' : 'trada';
    return null;
  }
  function peelsOf(team) {
    let n = 0;
    S.floor.forEach(f => { if (f.it.k === 'peel' && f.it.team === team) n++; });
    S.fly.forEach(f => { if (f.it.k === 'peel' && f.it.team === team) n++; });
    Object.values(S.players).forEach(q => { if (q.held && q.held.k === 'peel' && q.held.team === team) n++; });
    return n;
  }

  /* ---------- Đồ trên sàn ---------- */
  function dropAt(it, x, y) {
    if (!it) return;
    S.floor.push({ id: ++uid, it, x, y, armT: it.k === 'peel' ? .5 : 0, life: it.k === 'peel' ? VS.peelLife : 0 });
    if (S.floor.length > 40) { const i = S.floor.findIndex(f => f.it.k !== 'peel'); S.floor.splice(i >= 0 ? i : 0, 1); }
  }
  function nearestFloor(p, max) {
    let best = null, bd = max;
    S.floor.forEach(f => { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; best = f; } });
    return best;
  }
  function frontSpot(p, dist) {
    const [dx, dy] = DIRV[p.dir], x = p.x + dx * dist, y = p.y + dy * dist;
    return isWalk(Math.floor(x), Math.floor(y)) ? [x, y] : [p.x, p.y];
  }

  /* ---------- Nhặt / Thả ---------- */
  function interact(pid, key) {
    const p = S && S.players[pid];
    if (!p || S.phase !== 'play' || p.stun > 0) return;
    let x = -1, y = -1, ch = null;
    if (key) {
      [x, y] = String(key).split(',').map(Number);
      ch = tileAt(x, y);
      if (STATION[ch] === undefined || !reach(p, x, y)) ch = null;
    }
    // tay trống: ưu tiên nhặt đồ rơi ngay dưới chân
    if (!p.held) {
      const f = nearestFloor(p, ch ? .55 : .9);
      if (f) { S.floor.splice(S.floor.indexOf(f), 1); p.held = f.it; sfx('place'); return act(p); }
    }
    // đang cầm đồ mà không quay mặt thẳng vào khu nào (chỉ đứng gần): thả xuống sàn
    if (ch && p.held) {
      const [dx, dy] = DIRV[p.dir];
      if (keyOf(Math.floor(p.x + dx * .75), Math.floor(p.y + dy * .75)) !== key) ch = null;
    }
    if (ch) return station(p, pid, key, x, y, ch);
    if (p.held) {   // không đứng trước khu nào: thả xuống sàn
      const [fx0, fy0] = frontSpot(p, .55);
      dropAt(p.held, fx0, fy0); p.held = null; sfx('place'); act(p);
    }
  }
  function station(p, pid, key, x, y, ch) {
    const h = p.held, ts = S.tiles[key], T = S.teams[p.team];
    if (isLocked(ch, S.recipes)) return say(pid, 'tLocked');
    switch (ch) {
      case 'B': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'b', s: 'raw', i: [], w: '' }; sfx('place'); return act(p);
      case 'E': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'e', s: 'raw' }; sfx('place'); return act(p);
      case 'C': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'c', g: 'plastic', f: 0, l: false }; sfx('place'); return act(p);
      case 'Z': if (h) return say(pid, 'tHandsFull'); p.held = { k: 'i', g: 'cha', cut: false }; sfx('place'); return act(p);
      case 'N':
        if (h) return say(pid, 'tHandsFull');
        if (S.peelCd[p.team] > 0) return say(pid, 'tPeelWait', { n: Math.ceil(S.peelCd[p.team]) });
        if (peelsOf(p.team) >= VS.maxPeels) return say(pid, 'tPeelMax', { n: VS.maxPeels });
        p.held = { k: 'peel', team: p.team }; S.peelCd[p.team] = VS.peelCooldown; sfx('place'); return act(p);
      case 'Q': return say(pid, 'tBellUse');
      case 'M': {
        const mk = S.market[key];
        if (!mk.it) return say(pid, mk.warn > 0 ? 'tMarketSoon' : 'tMarketEmpty');
        if (h) return say(pid, 'tHandsFull');
        p.held = mk.it; mk.it = null; T.rare++;
        fx({ k: 'float', x: x + .5, y: y + .2, key: 'gotRare', vars: { team: '@team:' + p.team }, cls: 't' + p.team });
        sfx('coin'); return act(p, 'happy');
      }
      case 'G': case 'P': return cooker(p, pid, ts, ch === 'G' ? 'b' : 'e', x, y);
      case 'J':
        if (!h || h.k !== 'c' || h.f) return say(pid, 'tNeedCup');
        h.f = 1; sfx('pour'); return act(p, 'pour');
      case 'L':
        if (!h || h.k !== 'c' || !h.f) return say(pid, 'tNeedTea');
        if (!h.l) { h.l = true; sfx('place'); act(p); }
        return;
      case 'K': return board(p, pid, ts, x, y);
      case '=': return counter(p, pid, ts, x, y);
      case 'X': return trash(p, pid, x, y);
      case 'T': return serve(p, pid, TABLE_AT[key], x, y);
      default:
        if (BIN[ch]) {
          if (!isToast(h)) return say(pid, 'tBakeFirst');
          if (h.i.includes(BIN[ch])) return say(pid, 'tHasIng', { ing: '@ing:' + BIN[ch] });
          if (!addTo(h, BIN[ch], p, x, y)) wrong(p, x + .5, y);
        }
    }
  }
  function cooker(p, pid, ts, kind, x, y) {
    const h = p.held;
    if (ts.item) {
      if (!h) { p.held = ts.item; ts.item = null; ts.t = 0; ts.phase = ''; sfx('place'); return act(p); }
      if (kind === 'e' && isToast(h) && ts.item.s === 'fried') {
        if (h.i.includes('trung')) return say(pid, 'tHasIng', { ing: '@ing:trung' });
        ts.item = null; ts.t = 0; ts.phase = '';
        if (!addTo(h, 'trung', p, x, y)) wrong(p, x + .5, y);
        return;
      }
      return say(pid, 'tHandsFull');
    }
    if (!h) return say(pid, 'tNothing');
    if ((kind === 'b' && h.k === 'b' && h.s === 'raw') || (kind === 'e' && h.k === 'e' && h.s === 'raw')) {
      ts.item = h; ts.t = 0; p.held = null; sfx('place'); return act(p, 'grill');
    }
    return say(pid, 'tCantPlace');
  }
  function board(p, pid, ts, x, y) {
    const h = p.held, it = ts.item;
    if (!it) {
      if (h && h.k === 'i' && !h.cut) { ts.item = h; ts.p = 0; p.held = null; sfx('place'); return act(p); }
      return say(pid, h ? 'tBoardNeed' : 'tNothing');
    }
    if (!h) { p.held = it; ts.item = null; ts.p = 0; sfx('place'); return act(p); }
    if (isToast(h) && it.cut) {
      if (h.i.includes(it.g)) return say(pid, 'tHasIng', { ing: '@ing:' + it.g });
      ts.item = null; ts.p = 0;
      if (!addTo(h, it.g, p, x, y)) wrong(p, x + .5, y);
      return;
    }
    if (isToast(h) && !it.cut) return say(pid, 'tChopFirst');
    return say(pid, 'tHandsFull');
  }
  function counter(p, pid, ts, x, y) {
    const h = p.held, it = ts.item;
    if (!it) {
      if (!h) return say(pid, 'tNothing');
      ts.item = h; p.held = null; sfx('place'); return act(p);
    }
    if (!h) { p.held = it; ts.item = null; sfx('place'); return act(p); }
    // ghép: bánh trên quầy + nguyên liệu trên tay, hoặc ngược lại
    const [bread, other, breadOnCounter] = isToast(it) ? [it, h, true] : isToast(h) ? [h, it, false] : [null, null];
    if (bread) {
      if (other.k === 'i' && !other.cut) return say(pid, 'tChopFirst');
      const g = ingOf(other);
      if (g) {
        if (bread.i.includes(g)) return say(pid, 'tHasIng', { ing: '@ing:' + g });
        if (breadOnCounter) p.held = null; else ts.item = null;
        if (!addTo(bread, g, p, x, y)) {
          penalty(p.team, 'wrong', x + .5, y); S.teams[p.team].wrong++; sfx('angry');
          if (breadOnCounter) ts.item = null; else p.held = null;
        }
        return;
      }
    }
    return say(pid, 'tHandsFull');
  }
  function trash(p, pid, x, y) {
    const h = p.held;
    if (!h) return say(pid, 'tNothing');
    const free = h.k === 'peel' || h.s === 'burnt' || (h.k === 'c' && !h.f) || (h.k === 'b' && h.s === 'raw' && !h.i.length) ||
      (h.k === 'e' && h.s === 'raw') || (h.k === 'i' && h.g === 'cha' && !h.cut);
    if (!free) penalty(p.team, 'waste', x + .5, y);
    p.held = null;
    sfx('trash'); act(p, 'trash');
  }

  /* ---------- Phục vụ khách ở vỉa hè ---------- */
  function serve(p, pid, ti, x, y) {
    const t = S.tables[ti], h = p.held;
    const c = t && t.cust != null ? S.custs.find(k => k.id === t.cust) : null;
    if (!c || c.state !== 'wait') return say(pid, 'tNothing');
    if (!h) return say(pid, 'tNothing');
    if (h.k === 'peel' || h.k === 'i' || h.k === 'e') return say(pid, 'tCantPlace');
    // khách VIP giả do một đội gọi ra
    if (c.fake != null) {
      if (c.fake === p.team) return say(pid, 'tFakeOwn');
      p.held = null;
      const F = S.teams[c.fake];
      F.score += VS.trickBonus; F.tricks++;
      fx({ k: 'float', x: c.x, y: c.y - 1.8, key: 'tricked', cls: 'loss' });
      fx({ k: 'float', x: c.x, y: c.y - 2.5, raw: '+' + VS.trickBonus, cls: 't' + c.fake });
      sfx('laugh'); act(p, 'sad');
      leave(c, true);
      return;
    }
    const id = dishOf(h);
    if (!id) {
      if (isToast(h)) return say(pid, 'tNotReady');
      if (h.k === 'c' && !h.f) return say(pid, 'tNeedTea');
      return say(pid, 'tCantPlace');
    }
    const it = c.items.find(i => !i.done && i.id === id);
    if (!it) return wrong(p, x + .5, y);
    const R = RECIPES[id], T = S.teams[p.team];
    const pts = R.price + Math.round(R.price * .3 * Math.max(0, c.pat / c.max)) + (R.vip ? VS.vipBonus : 0);
    it.done = true; it.by = p.team; p.held = null;
    T.score += pts; T.items++;
    if (R.vip) T.vip++;
    fx({ k: 'float', x: c.x, y: c.y - 1.8, raw: '+' + pts, cls: 't' + p.team });
    sfx('coin'); act(p, 'serve');
    if (c.items.every(i => i.done)) {
      T.served++; T.combo++; T.comboMax = Math.max(T.comboMax, T.combo);
      const bonus = VS.finishBonus + (T.combo >= 2 ? Math.min(5, T.combo - 1) : 0);
      T.score += bonus;
      if (T.combo >= 2) fx({ k: 'banner', key: 'comboTeam', vars: { team: '@team:' + p.team, n: T.combo } });
      Object.values(S.players).forEach(q => { if (q.team === p.team) act(q, 'happy'); });
      leave(c, true);
    }
  }

  /* ---------- Tương tác / Ném ---------- */
  function use(pid, key) {
    const p = S && S.players[pid];
    if (!p || S.phase !== 'play' || p.stun > 0) return;
    let ch = null, x = -1, y = -1;
    if (key) {
      [x, y] = String(key).split(',').map(Number);
      ch = tileAt(x, y);
      if (STATION[ch] === undefined || !reach(p, x, y)) ch = null;
    }
    if (ch === 'Q') return ringBell(p, pid, x);
    if (ch === 'K') {
      const ts = S.tiles[key];
      if (ts.item && !ts.item.cut && !p.held) { chop(ts, .22 * S.boost[p.team], p); return; }
    }
    if (p.held) return throwItem(p, pid);
    if (ch === 'K') return say(pid, S.tiles[key].item ? 'tHandsFull' : 'tBoardNeed');
  }
  function chop(ts, amount, p) {
    ts.p += amount;
    act(p, 'ing');
    if ((ts.chopSfx = (ts.chopSfx || 0) - amount) <= 0) { ts.chopSfx = .18; sfx('chop'); }
    if (ts.p >= 1) { ts.item.cut = true; ts.p = 0; sfx('place'); }
  }
  function ringBell(p, pid, x) {
    const team = teamOfX(x);
    if (team !== p.team) return say(pid, 'tBellEnemy');
    if (S.bellCd[team] > 0) return say(pid, 'tBellWait', { n: Math.ceil(S.bellCd[team]) });
    if (!spawn(true, team)) return say(pid, 'tNoSeat');
    S.bellCd[team] = VS.bellCooldown;
    sfx('bell'); act(p, 'happy');
    fx({ k: 'toast', team, key: 'tBellOk' });
  }
  function throwItem(p, pid) {
    const [dx, dy] = DIRV[p.dir];
    S.fly.push({ id: ++uid, it: p.held, x: p.x + dx * .35, y: p.y + dy * .35, dx, dy, d: 0, max: VS.throwRange, by: pid });
    p.held = null;
    sfx('throw'); act(p, 'trash');
  }
  function stepFly(dt) {
    for (let i = S.fly.length - 1; i >= 0; i--) {
      const f = S.fly[i], step = VS.throwSpeed * dt;
      const nx = f.x + f.dx * step, ny = f.y + f.dy * step;
      let land = false;
      if (!isWalk(Math.floor(nx), Math.floor(ny))) land = true;
      else { f.x = nx; f.y = ny; f.d += step; if (f.d >= f.max) land = true; }
      // đồng đội (hoặc đối thủ) tay trống đứng gần thì bắt được
      if (!land && f.d > .6) {
        const catcher = Object.keys(S.players).find(k => {
          const q = S.players[k];
          return k !== f.by && !q.held && !(q.stun > 0) && Math.hypot(q.x - f.x, q.y - f.y) < .55;
        });
        if (catcher) { S.players[catcher].held = f.it; act(S.players[catcher]); sfx('place'); S.fly.splice(i, 1); continue; }
      }
      if (land) { dropAt(f.it, f.x, f.y); sfx(f.it.k === 'peel' ? 'plop' : 'place'); S.fly.splice(i, 1); }
    }
  }
  function stepFloor(dt) {
    for (let i = S.floor.length - 1; i >= 0; i--) {
      const f = S.floor[i];
      if (S.slide) {   // sàn trôi: đồ rơi trên sàn cũng bị đẩy đi
        const vx = slideVX(f.x, f.y, S.slide), nx = f.x + vx * dt;
        if (vx && isWalk(Math.floor(nx), Math.floor(f.y))) f.x = nx;
      }
      if (f.it.k !== 'peel') continue;
      if (f.armT > 0) f.armT -= dt;
      if ((f.life -= dt) <= 0) { S.floor.splice(i, 1); continue; }
      if (f.armT > 0) continue;
      const vic = Object.values(S.players).find(q => !(q.stun > 0) && Math.hypot(q.x - f.x, q.y - f.y) < .42);
      if (vic) { S.floor.splice(i, 1); slip(vic, f.it.team); }
    }
  }
  function slip(p, byTeam) {
    p.stun = VS.stun;
    const [dx, dy] = DIRV[p.dir];
    p.svx = dx * 3.4; p.svy = dy * 3.4;
    if (p.held) {   // đánh rơi đồ đang cầm
      const [x, y] = frontSpot(p, .9);
      dropAt(p.held, x, y); p.held = null;
    }
    S.teams[p.team].slips++;
    if (byTeam != null && byTeam !== p.team) S.teams[byTeam].tricks++;
    fx({ k: 'float', x: p.x, y: p.y - 2, key: 'slipped', cls: 'loss' });
    sfx('slip');
  }
  function stepPlayers(dt) {
    for (const id in S.players) {
      const p = S.players[id];
      if (p.stun > 0) {
        p.stun -= dt; p.mv = 0;
        const nx = p.x + p.svx * dt, ny = p.y + p.svy * dt;
        if (canStand(nx, p.y)) p.x = nx; else p.svx = 0;
        if (canStand(p.x, ny)) p.y = ny; else p.svy = 0;
        p.svx *= Math.pow(.05, dt); p.svy *= Math.pow(.05, dt);
        if (p.stun <= 0) { p.stun = 0; p.pose = ''; }
        continue;
      }
      if (p.poseT > 0 && (p.poseT -= dt) <= 0) p.pose = '';
      // giữ nút Tương tác ở thớt: cắt dần
      if (p.hold && !p.held) {
        const key = findTarget(p);
        if (key && tileAt(...key.split(',').map(Number)) === 'K') {
          const ts = S.tiles[key];
          if (ts.item && !ts.item.cut) chop(ts, dt / VS.chop * S.boost[p.team], p);
        }
      }
    }
  }

  /* ---------- Khách ---------- */
  function freeSeats() { return S.tables.map((t, i) => (t.cust == null ? i : -1)).filter(i => i >= 0); }
  // vip: khách VIP (gọi món nguyên liệu hiếm); fakeTeam: đội rung chuông gọi khách giả
  function spawn(vip, fakeTeam) {
    const seats = freeSeats();
    if (!seats.length) return false;
    const ti = pick(seats), seat = TABLES[ti].seat;
    const fake = fakeTeam != null ? fakeTeam : null;
    const look = { skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), shirt: vip || fake != null ? '#F2C14E' : pick(LOOKS.shirt), style: pick(['short', 'long', 'bun', 'cap']), helmet: pick(LOOKS.helmet), glasses: vip || fake != null || Math.random() < .2 };
    let ids;
    if (vip || fake != null) {
      const onMarket = Object.values(S.market).map(m => m.it && m.it.g).filter(Boolean);
      const main = onMarket.length && Math.random() < .7 ? (onMarket[0] === 'bo' ? 'bo' : 'nam') : pick(VS.vipMenu);
      ids = Math.random() < .4 ? [main, pick(['trada', 'trachanh'])] : [main];
    } else {
      const k = 1 - S.time / VS.duration;
      ids = Math.random() < .25 + .3 * k ? [pick(['pate', 'thit', 'trung']), pick(['trada', 'trachanh'])] : [pick(VS.menu)];
    }
    const max = fake != null ? VS.fakeLife : (vip ? VS.vipPatience : VS.patience * (.8 + .2 * S.time / VS.duration)) + (ids.length - 1) * 8;
    const left = Math.random() < .5;
    const c = {
      id: ++uid, type: 'dine', vip: !!vip, fake, cfg: CHAR.custCfg(look), items: ids.map(id => ({ id, done: false, by: -1 })),
      pat: max, max, mood: 'normal', state: 'enter', x: left ? -1 : COLS + 1, y: STREET_Y, dir: left ? 2 : 1, mv: 1, left, table: ti,
      path: [[MIDX, STREET_Y], [MIDX, seat.y + .75], [seat.x + .5, seat.y + .75]],
    };
    S.tables[ti].cust = c.id;
    S.custs.push(c);
    return true;
  }
  function leave(c, happy) {
    c.state = 'leave'; c.mood = happy ? 'happy' : 'angry';
    S.tables[c.table].cust = null;
    c.path = [[MIDX, c.y], [MIDX, STREET_Y], [c.left ? COLS + 1 : -1, STREET_Y]];
  }
  function stepCust(c, dt) {
    if (c.path && c.path.length) {
      const [tx, ty] = c.path[0], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = 2.8 * dt;
      c.mv = 1;
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      if (d <= sp) { c.x = tx; c.y = ty; c.path.shift(); } else { c.x += dx / d * sp; c.y += dy / d * sp; }
      if (!c.path.length) {
        c.mv = 0;
        if (c.state === 'enter') {
          c.state = 'wait'; c.dir = 0;
          if (c.vip || c.fake != null) fx({ k: 'banner', key: 'vipArrive' });
          sfx('bell');
        } else if (c.state === 'leave') c.gone = true;
      }
      return;
    }
    if (c.state === 'wait') {
      c.pat -= dt;
      const r = c.pat / c.max;
      c.mood = c.fake != null ? 'happy' : r < .2 ? 'angry' : r < .45 ? 'worried' : 'normal';
      if (c.pat <= 0) {
        if (c.fake == null) fx({ k: 'float', x: c.x, y: c.y - 1.8, key: 'leftAngry', cls: 'loss' });
        leave(c, c.fake != null);
      }
    }
  }

  /* ---------- Chợ nguyên liệu hiếm ---------- */
  function stepMarket(dt) {
    const stalls = Object.values(S.market);
    stalls.forEach(m => {
      if (m.warn > 0 && (m.warn -= dt) <= 0) {
        m.warn = 0; m.it = { k: 'i', g: m.pend, cut: false }; m.pend = null;
        fx({ k: 'toast', key: 'marketNew', vars: { ing: '@ing:' + m.it.g } });
        sfx('coin');
      }
    });
    if (S.time <= 3) return;
    if ((S.marketT -= dt) <= 0) {
      S.marketT = rand(...VS.marketEvery) * (S.rush ? .7 : 1);
      const busy = stalls.filter(m => m.it || m.warn > 0).length;
      const free = stalls.filter(m => !m.it && !(m.warn > 0));
      if (busy < 2 && free.length) {
        const m = pick(free);
        m.warn = VS.marketWarn; m.pend = pick(VS.vipMenu);
      }
    }
  }

  /* ---------- Bếp ---------- */
  function cook(ts, key, dt) {
    if (ts.kind === 'K' || ts.kind === '=') return;
    const it = ts.item;
    if (!it) { ts.phase = ''; return; }
    const [x, y] = key.split(',').map(Number), team = teamOfX(x);
    ts.t += dt * (team >= 0 ? S.boost[team] : 1);
    const bread = ts.kind === 'G', A = bread ? [COOK.bread, COOK.breadWarn, COOK.breadBurn] : [COOK.egg, COOK.eggWarn, COOK.eggBurn];
    if (ts.t < A[0]) { ts.phase = 'cook'; ts.p = ts.t / A[0]; return; }
    if (it.s === 'raw') it.s = bread ? 'toast' : 'fried';
    if (ts.t < A[1]) { ts.phase = 'ready'; return; }
    if (ts.t < A[2]) { ts.phase = 'warn'; ts.p = (ts.t - A[1]) / (A[2] - A[1]); return; }
    ts.phase = 'burnt';
    if (it.s !== 'burnt') {
      it.s = 'burnt';
      if (team >= 0) { S.teams[team].burnt++; penalty(team, 'burnt', x + .5, y - .6); }
      sfx('burn');
    }
  }

  /* ---------- Giờ cao điểm ---------- */
  function shuffleTrays() {
    S.ovr = {};
    [0, 1].forEach(team => {
      const xs = team === 0 ? [3, 4, 5, 6, 7] : [21, 20, 19, 18, 17], y = 4;
      const chars = xs.map(x => MAP_CUR[y][x]);
      let perm;
      do { perm = chars.slice().sort(() => Math.random() - .5); } while (perm.some((c, i) => c === chars[i]));
      xs.forEach((x, i) => { S.ovr[keyOf(x, y)] = perm[i]; });
    });
    OVR = S.ovr;
  }
  function stepRush(dt) {
    if (!S.rush && S.time <= VS.rush) {
      S.rush = true;
      fx({ k: 'banner', key: 'rushHour' }); sfx('level');
    }
    const inDark = [S.ev.dark1, S.ev.dark2].some(([a, b]) => S.time <= a && S.time > b);
    if (inDark && !S.darkOn) { S.darkOn = 1; fx({ k: 'banner', key: 'blackout' }); sfx('blackout'); }
    if (!inDark && S.darkOn) { S.darkOn = 0; fx({ k: 'toast', key: 'lightsBack' }); }
    S.dark += ((inDark ? 1 : 0) - S.dark) * Math.min(1, dt * 4);
    if (S.dark < .01) S.dark = 0;
    if (!S.shuffled && S.time <= S.ev.shuffle) {
      S.shuffled = true; shuffleTrays();
      fx({ k: 'banner', key: 'shuffle' }); sfx('angry');
    }
    // sàn bếp trôi, nửa sau đổi chiều; người chơi bị đẩy trên máy của mình (main.js), đồ trên sàn bị đẩy ở đây
    const [sa, sb] = S.ev.slide;
    const sl = S.time <= sa && S.time > sb ? (S.time > (sa + sb) / 2 ? 1 : -1) : 0;
    if (sl !== S.slide) {
      if (sl) { fx({ k: 'banner', key: S.slide ? 'slideFlip' : 'slideFloor' }); sfx('slide'); }
      else fx({ k: 'toast', key: 'slideStop' });
      S.slide = sl;
    }
  }

  /* ---------- Vòng lặp ---------- */
  function update(dt) {
    if (!S || S.phase !== 'play') return;
    S.time -= dt;
    stepRush(dt);
    if (S.time > 4) {
      S.spawnT -= dt;
      if (S.spawnT <= 0) S.spawnT = spawn(false) ? rand(...(S.rush ? VS.rushSpawn : VS.spawn)) : .6;
      S.vipT -= dt;
      if (S.vipT <= 0) S.vipT = spawn(true) ? rand(...VS.vipEvery) * (S.rush ? .6 : 1) : 2;
    }
    stepMarket(dt);
    for (const key in S.tiles) cook(S.tiles[key], key, dt);
    S.custs.forEach(c => stepCust(c, dt));
    S.custs = S.custs.filter(c => !c.gone);
    stepFly(dt);
    stepFloor(dt);
    stepPlayers(dt);
    [0, 1].forEach(t => { S.bellCd[t] = Math.max(0, S.bellCd[t] - dt); S.peelCd[t] = Math.max(0, S.peelCd[t] - dt); });
    if (S.time <= 0) {
      S.time = 0; S.phase = 'end'; S.dark = 0;
      const [a, b] = S.teams.map(t => t.score);
      const practice = !(S.n[0] && S.n[1]);
      S.result = { mode: 'versus', teams: S.teams, winner: practice ? -1 : a === b ? -1 : a > b ? 0 : 1, practice, n: S.n };
    }
  }

  /* ---------- Từ máy người chơi khác ---------- */
  function setPos(pid, x, y, dir, mv) {
    const p = S && S.players[pid];
    if (!p || p.stun > 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (canStand(x, y)) { p.x = x; p.y = y; }
    p.dir = dir & 3; p.mv = mv ? 1 : 0;
  }
  function setHold(pid, on) { const p = S && S.players[pid]; if (p) p.hold = !!on; }
  function removePlayer(pid) {
    const p = S && S.players[pid];
    if (!p) return;
    if (p.held) dropAt(p.held, p.x, p.y);
    delete S.players[pid];
  }
  function snap() {
    return {
      mode: 'versus', time: S.time, phase: S.phase, recipes: S.recipes, result: S.result,
      players: S.players, tiles: S.tiles, market: S.market, floor: S.floor,
      fly: S.fly.map(f => ({ it: f.it, x: f.x, y: f.y, d: f.d, max: f.max })),
      tables: S.tables, teams: S.teams, bellCd: S.bellCd, peelCd: S.peelCd, dark: S.dark, rush: S.rush, slide: S.slide, ovr: S.ovr, fx: S.fx,
      custs: S.custs.map(c => ({ id: c.id, type: c.type, vip: c.vip, fake: c.fake, cfg: c.cfg, items: c.items, pat: c.pat, max: c.max, mood: c.mood, state: c.state, x: c.x, y: c.y, dir: c.dir, mv: c.mv, table: c.table })),
    };
  }
  return { create, update, interact, use, setPos, setHold, removePlayer, snap, get S() { return S; } };
})();
