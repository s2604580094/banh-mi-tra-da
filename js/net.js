/* net.js — kết nối nhiều máy. Mặc định dùng WebRTC qua PeerJS (máy ghép phòng miễn phí, không cần tài khoản).
   Thêm ?local vào cuối địa chỉ để thử nhiều người trên các tab của cùng một máy (BroadcastChannel). */
const Net = (() => {
  const PREFIX = 'bmtd3-';
  const LOCAL = /[?&]local\b/.test(location.search);
  const LIBS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  const newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  let libP = null;
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    if (libP) return libP;
    libP = LIBS.reduce((chain, url) => chain.catch(() => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url; s.onload = () => (window.Peer ? res() : rej(new Error('lib'))); s.onerror = () => rej(new Error('lib'));
      document.head.appendChild(s);
    })), Promise.reject(new Error('start')));
    libP.catch(() => { libP = null; });
    return libP;
  }

  /* ---------- Máy chủ phòng ---------- */
  // h = { join(id), leave(id), msg(id, m) } → trả về { code, send(id, m), broadcast(m), close() }
  async function host(h) {
    if (LOCAL) return localHost(h);
    await loadPeer();
    for (let tries = 0; tries < 3; tries++) {
      const code = newCode();
      try { return await peerHost(code, h); } catch (e) { if (e.type !== 'unavailable-id') throw e; }
    }
    throw new Error('net');
  }
  function peerHost(code, h) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(PREFIX + code, { debug: 0 });
      const conns = new Map();
      let open = false;
      peer.on('open', () => {
        open = true;
        resolve({
          code,
          send: (id, m) => { const c = conns.get(id); if (c && c.open) c.send(m); },
          broadcast: m => conns.forEach(c => { if (c.open) c.send(m); }),
          drop: id => { const c = conns.get(id); if (c) c.close(); },
          close: () => peer.destroy(),
        });
      });
      peer.on('error', e => { if (!open) reject(e); });
      peer.on('connection', conn => {
        conn.on('open', () => { conns.set(conn.peer, conn); h.join(conn.peer); });
        conn.on('data', d => h.msg(conn.peer, d));
        conn.on('close', () => { if (conns.delete(conn.peer)) h.leave(conn.peer); });
        conn.on('error', () => { if (conns.delete(conn.peer)) h.leave(conn.peer); });
      });
      setTimeout(() => { if (!open) { peer.destroy(); reject(new Error('timeout')); } }, 12000);
    });
  }

  /* ---------- Người vào phòng ---------- */
  // h = { msg(m), close() } → trả về { send(m), close() }
  async function join(code, h) {
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) throw Object.assign(new Error('code'), { type: 'peer-unavailable' });
    if (LOCAL) return localJoin(code, h);
    await loadPeer();
    return new Promise((resolve, reject) => {
      const peer = new window.Peer({ debug: 0 });
      let done = false;
      const fail = e => { if (!done) { done = true; peer.destroy(); reject(e); } };
      peer.on('error', e => { if (!done) fail(e); else h.close(); });
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => {
          done = true;
          resolve({ send: m => { if (conn.open) conn.send(m); }, close: () => peer.destroy() });
        });
        conn.on('data', d => h.msg(d));
        conn.on('close', () => { if (done) h.close(); });
      });
      setTimeout(() => fail(Object.assign(new Error('timeout'), { type: 'peer-unavailable' })), 12000);
    });
  }

  /* ---------- Chế độ thử trên cùng máy (?local) ---------- */
  function localHost(h) {
    const code = newCode(), bc = new BroadcastChannel('bmtd-local-' + code), clients = new Set();
    bc.onmessage = ({ data: d }) => {
      if (d.to !== 'host') return;
      if (d.t === '_open') { clients.add(d.from); bc.postMessage({ to: d.from, t: '_ok' }); h.join(d.from); }
      else if (d.t === '_close') { if (clients.delete(d.from)) h.leave(d.from); }
      else h.msg(d.from, d.m);
    };
    return {
      code,
      send: (id, m) => bc.postMessage({ to: id, m }),
      broadcast: m => clients.forEach(id => bc.postMessage({ to: id, m })),
      drop: id => { bc.postMessage({ to: id, t: '_close' }); clients.delete(id); },
      close: () => { clients.forEach(id => bc.postMessage({ to: id, t: '_close' })); bc.close(); },
    };
  }
  function localJoin(code, h) {
    return new Promise((resolve, reject) => {
      const id = 'L' + Math.random().toString(36).slice(2, 8), bc = new BroadcastChannel('bmtd-local-' + code);
      let done = false;
      bc.onmessage = ({ data: d }) => {
        if (d.to !== id) return;
        if (d.t === '_ok') {
          done = true;
          window.addEventListener('beforeunload', () => bc.postMessage({ to: 'host', from: id, t: '_close' }));
          resolve({ send: m => bc.postMessage({ to: 'host', from: id, m }), close: () => { bc.postMessage({ to: 'host', from: id, t: '_close' }); bc.close(); } });
        } else if (d.t === '_close') h.close();
        else if (done) h.msg(d.m);
      };
      bc.postMessage({ to: 'host', from: id, t: '_open' });
      setTimeout(() => { if (!done) { bc.close(); reject(Object.assign(new Error('timeout'), { type: 'peer-unavailable' })); } }, 3000);
    });
  }

  return { host, join, local: LOCAL };
})();
