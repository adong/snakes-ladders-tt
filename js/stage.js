/* TT Snakes & Ladders: the renderer, the table, the board, the ladders, the friendly slides, the pawns and the die.
   The board is a chunky slab on a wooden table, printed (on a canvas) with 100 squares in rainbow rows and big
   numbers, a START pad and a die mat on the tray at the front. The ladders are 3D, in bright colours; the slides are
   smiling 3D snakes with spots. Teddy's and Tommy's pawns are little figures of the boys; Foxy's and Froggy's are
   chunky pawns with their faces. The die sits on the tray and tumbles when it's rolled (red 1 and 4).
     setBoard(name)        build the ladders and slides for 'easy' or 'normal' (and reprint the shadows)
     set(st) / settle(st)  every pawn where the state says, straight away / gliding there (pawns sharing huddle up)
     hops(seat, path, ...) the pawn hops square by square (one at a time when the kids count), then climbs or slides
     path(p) / hint(h) / turnRing(seat) / roll(v, seat, done) / dieWait(seat, tapMe) / shake(secs)
     pickDie(x, y), toScreen(v), fit(points, elev, az, margins) */
(function () {
  'use strict';
  const T = THREE;
  const SL = (window.SL = window.SL || {});
  const R = SL.rules;
  const { makeCanvas, toTexture, std, rand, radialTexture, emojiTexture, FONT, shade, roundRect } = Kit.gfx;

  const TOP = 0.5;                      // the board's top
  const X0 = -5.45, X1 = 5.45;          // the slab, left to right
  const Z0 = -5.45, Z1 = 7.75;          // the slab, back to front (the tray is the front 2.3)
  const TRAY = 6.6;                     // the tray's middle (z)
  const START_AT = { x: -3.1, z: TRAY };
  const DIE_AT = { x: 3.1, z: TRAY };
  const COL = ['#ff4b4b', '#ffc414', '#2f7cf0', '#2fc25a'];
  const ROWS = ['#ff8f8f', '#ffb066', '#ffdc5c', '#b7e66e', '#6fd88f', '#5fd3c9', '#72c3ff', '#8fa3ff', '#c39bff', '#ff9bd0'];
  const LADDER_COLS = ['#ff7a1a', '#2f7cf0', '#e8372c', '#9b5cff', '#18b8a8', '#ff3d7f', '#3fae3a', '#ffb000'];
  const SNAKE_COLS = [['#58c94b', '#fff26b'], ['#a46bff', '#ffd1f0'], ['#ff8a3d', '#fff0a8'], ['#ff5fa2', '#ffe3f0'], ['#2fa8ff', '#d6fbff'], ['#18b8a8', '#fff26b'], ['#e8c22a', '#7a4cff'], ['#ff6b6b', '#ffffff']];
  const DIE = 1.5, KID = 0.46;
  const RAIL_Y = TOP + 0.2;
  const V3 = T.Vector3;

  let renderer = null, W = 1, H = 1;
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(27, 1, 0.1, 400);
  const camBase = new V3();
  const pawns = [];                     // pawns[seat]
  const fx = { t: 0, shake: 0, hint: null, path: null, turn: -1, dieSeat: -1, tapMe: false, hintT: 0 };
  let flyers = null, bursts = null, die = null, boardTop = null, links = null, boardName = '';
  const linkObjs = { ladders: {}, slides: {} }; // by the square they start on
  let linkGroup = null;

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    buildRoom();
    buildBoard();
    buildDie();
    buildMarks();
    resize();
  }
  function useFx(fl, bu) {
    flyers = fl;
    bursts = bu;
  }
  function resize() {
    W = Math.max(1, innerWidth || 1);
    H = Math.max(1, innerHeight || 1);
    if (renderer) renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  }

  // square n (0 is START) to the world: square centres are 1 apart, 1 at the front left, 100 at the back left
  function sq(n, y = TOP, out = new V3()) {
    if (n <= 0) return out.set(START_AT.x, y, START_AT.z);
    const [c, r] = R.cell(n);
    return out.set(c - 4.5, y, 4.5 - r);
  }

  // ---------------------------------------------------------------- shapes

  // A rounded slab, w wide (x) and d deep (z), h tall, centred on the origin.
  function slab(w, d, h, r, bevel = 0.06) {
    const s = new T.Shape();
    const x = -w / 2 + bevel, y = -d / 2 + bevel, ww = w - 2 * bevel, dd = d - 2 * bevel, rr = Math.max(0.01, r - bevel);
    s.moveTo(x + rr, y);
    s.lineTo(x + ww - rr, y);
    s.quadraticCurveTo(x + ww, y, x + ww, y + rr);
    s.lineTo(x + ww, y + dd - rr);
    s.quadraticCurveTo(x + ww, y + dd, x + ww - rr, y + dd);
    s.lineTo(x + rr, y + dd);
    s.quadraticCurveTo(x, y + dd, x, y + dd - rr);
    s.lineTo(x, y + rr);
    s.quadraticCurveTo(x, y, x + rr, y);
    const g = new T.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -(h - 2 * bevel) / 2, 0);
    return g;
  }

  // a cylinder from a to b (world points), radius r
  function rod(a, b, r, mat, parent, seg = 10) {
    const d = new V3().subVectors(b, a), len = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r, r, len, seg), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    parent.add(m);
    return m;
  }

  // ---------------------------------------------------------------- the room and the table

  function woodTexture() {
    const [c, g] = makeCanvas(512, 512);
    g.fillStyle = '#d9a46a';
    g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 4; k++) {
      const y = k * 128;
      g.fillStyle = k % 2 ? '#d49c60' : '#ddaa72';
      g.fillRect(0, y, 512, 128);
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = `rgba(120, 70, 30, ${rand(0.05, 0.13)})`;
        g.lineWidth = rand(1, 3);
        const yy = y + rand(4, 124);
        g.beginPath();
        g.moveTo(0, yy);
        g.bezierCurveTo(170, yy + rand(-6, 6), 340, yy + rand(-6, 6), 512, yy + rand(-3, 3));
        g.stroke();
      }
      g.fillStyle = 'rgba(90, 50, 20, 0.35)';
      g.fillRect(0, y, 512, 3);
    }
    return toTexture(c, true);
  }

  function buildRoom() {
    scene.background = new T.Color('#9fdcff');
    scene.fog = new T.Fog('#9fdcff', 95, 220);
    scene.add(new T.HemisphereLight('#ffffff', '#b07a48', 0.95));
    const sun = new T.DirectionalLight('#fff1d6', 0.85);
    sun.position.set(-6, 14, 9);
    scene.add(sun);
    const tex = woodTexture();
    tex.repeat.set(9, 9);
    const table = new T.Mesh(new T.PlaneGeometry(130, 130), std('#ffffff', { map: tex, roughness: 0.8 }));
    table.rotation.x = -Math.PI / 2;
    scene.add(table);
    const sh = new T.Mesh(new T.PlaneGeometry((X1 - X0) * 1.4, (Z1 - Z0) * 1.35), new T.MeshBasicMaterial({
      map: radialTexture(256, [[0, 'rgba(60,30,10,0.45)'], [0.62, 'rgba(60,30,10,0.3)'], [1, 'rgba(60,30,10,0)']]), transparent: true, depthWrite: false,
    }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set((X0 + X1) / 2, 0.01, (Z0 + Z1) / 2);
    scene.add(sh);
    // a few toy blocks on the table
    const block = (x, z, c, s, ry, y = 0) => {
      const m = new T.Mesh(slab(s, s, s, 0.12, 0.05), std(c, { roughness: 0.6 }));
      m.position.set(x, s / 2 + y, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    block(-8.6, -4.6, '#ff6fa8', 1.3, 0.3);
    block(-7.8, -3.0, '#ffd23f', 1.0, 0.8);
    block(-8.4, -4.4, '#5ad1ff', 0.9, 0.1, 1.3);
    block(8.8, -5.2, '#7ed957', 1.2, -0.4);
    block(9.4, -3.6, '#a77bff', 1.0, 0.5);
  }

  // ---------------------------------------------------------------- the printed board

  const PX = 2048 / (X1 - X0);                          // canvas pixels per square
  const CW = 2048, CH = Math.round((Z1 - Z0) * PX);
  const PXx = (x) => (x - X0) * PX, PXz = (z) => (z - Z0) * PX;

  function boardTexture() {
    const [c, g] = makeCanvas(CW, CH);
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, CW, CH);
    // the squares: a rainbow row by row, checked light and lighter, with big numbers near the front of each
    for (let n = 1; n <= 100; n++) {
      const [cc, r] = R.cell(n), p = sq(n);
      const x = PXx(p.x - 0.5), y = PXz(p.z - 0.5), s = PX;
      g.fillStyle = (cc + r) % 2 ? ROWS[r] : shade(ROWS[r], 0.3);
      g.fillRect(x, y, s + 1, s + 1);
      if (n === 100) {
        g.fillStyle = '#ffd400';
        g.fillRect(x, y, s, s);
        star(g, x + s / 2, y + s * 0.4, s * 0.36, '#ffffff');
      }
      if (n === 1) {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(x, y, s, s);
      }
    }
    // a soft frame line between the squares
    g.strokeStyle = 'rgba(20,18,31,0.18)';
    g.lineWidth = 4;
    for (let i = 0; i <= 10; i++) {
      g.beginPath();
      g.moveTo(PXx(-5 + i), PXz(-5));
      g.lineTo(PXx(-5 + i), PXz(5));
      g.stroke();
      g.beginPath();
      g.moveTo(PXx(-5), PXz(-5 + i));
      g.lineTo(PXx(5), PXz(-5 + i));
      g.stroke();
    }
    // which way each row goes: a little arrow at the end of every row, round the bend
    for (let r = 0; r < 9; r++) {
      const n = r * 10 + 10, a = sq(n), b = sq(n + 1);
      const right = a.x > 0;
      const x = PXx(a.x + (right ? 0.36 : -0.36)), y0 = PXz(a.z + 0.05), y1 = PXz(b.z - 0.05);
      g.save();
      g.strokeStyle = 'rgba(20,18,31,0.45)';
      g.lineWidth = 10;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, y1 + 18);
      g.stroke();
      arrow(g, x, y1, -Math.PI / 2, 30, 'rgba(20,18,31,0.5)');
      g.restore();
    }
    // the numbers
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let n = 1; n <= 100; n++) {
      const p = sq(n);
      const big = n === 100;
      g.font = `${big ? 74 : 68}px ${FONT}`;
      g.lineJoin = 'round';
      g.lineWidth = 14;
      g.strokeStyle = '#ffffff';
      const x = PXx(p.x), y = PXz(p.z + (big ? 0.26 : 0.22));
      g.strokeText(String(n), x, y);
      g.fillStyle = '#14121f';
      g.fillText(String(n), x, y);
    }
    // the tray at the front: the START pad (where every pawn waits) and the die mat
    const tz = PXz(5.45);
    g.fillStyle = '#ffe9b8';
    g.fillRect(0, tz, CW, CH - tz);
    g.fillStyle = 'rgba(20,18,31,0.12)';
    g.fillRect(0, tz, CW, 8);
    const st = START_AT;
    g.fillStyle = '#ffffff';
    roundRect(g, PXx(st.x - 1.55), PXz(st.z - 0.92), 3.1 * PX, 1.84 * PX, 70);
    g.fill();
    g.lineWidth = 12;
    g.setLineDash([34, 22]);
    g.strokeStyle = '#ff8a1f';
    g.stroke();
    g.setLineDash([]);
    // an arrow from START up to square 1
    const one = sq(1);
    g.strokeStyle = '#ff8a1f';
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(PXx(st.x - 1.15), PXz(st.z - 0.55));
    g.quadraticCurveTo(PXx(one.x), PXz(st.z - 0.55), PXx(one.x), PXz(one.z + 0.55));
    g.stroke();
    arrow(g, PXx(one.x), PXz(one.z + 0.5), -Math.PI / 2, 34, '#ff8a1f');
    // the die mat
    const dm = DIE_AT;
    g.beginPath();
    g.arc(PXx(dm.x), PXz(dm.z), 1.0 * PX, 0, Math.PI * 2);
    g.fillStyle = '#fff6dc';
    g.fill();
    g.lineWidth = 12;
    g.strokeStyle = '#e8c48a';
    g.stroke();
    // a thin frame
    g.lineWidth = 16;
    g.strokeStyle = '#f0e2c2';
    roundRect(g, 10, 10, CW - 20, CH - 20, 70);
    g.stroke();
    return { c, g };
  }
  function arrow(g, x, y, a, s, color) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(-s * 0.55, -s * 0.85);
    g.lineTo(-s * 0.2, 0);
    g.lineTo(-s * 0.55, s * 0.85);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.restore();
  }
  function star(g, x, y, r, color) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }

  let printed = null; // the plain board, kept so the shadows of a new set of links can go on a fresh copy
  function buildBoard() {
    const body = new T.Mesh(slab(X1 - X0, Z1 - Z0, TOP, 0.6, 0.1), std('#fbf3e0', { roughness: 0.55 }));
    body.position.set((X0 + X1) / 2, TOP / 2, (Z0 + Z1) / 2);
    scene.add(body);
    printed = boardTexture();
    const [c] = makeCanvas(CW, CH);
    const tex = toTexture(c);
    tex.anisotropy = 8;
    boardTop = new T.Mesh(new T.PlaneGeometry(X1 - X0 - 0.2, Z1 - Z0 - 0.2), new T.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
    boardTop.rotation.x = -Math.PI / 2;
    boardTop.position.set((X0 + X1) / 2, TOP + 0.003, (Z0 + Z1) / 2);
    boardTop.userData.canvas = c;
    // the plane is 0.2 smaller than the slab: map the canvas onto it exactly
    const uv = boardTop.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, (0.1 + uv.getX(i) * (X1 - X0 - 0.2)) / (X1 - X0));
      uv.setY(i, (0.1 + uv.getY(i) * (Z1 - Z0 - 0.2)) / (Z1 - Z0));
    }
    scene.add(boardTop);
    // a stripe round the slab's sides in the four colours
    for (let s = 0; s < 4; s++) {
      const along = s % 2 ? Z1 - Z0 - 1.2 : X1 - X0 - 1.2;
      const m = new T.Mesh(new T.BoxGeometry(along, 0.14, 0.04), std(COL[s], { roughness: 0.5 }));
      const pos = [[(X0 + X1) / 2, Z0 - 0.005], [X1 + 0.005, (Z0 + Z1) / 2], [(X0 + X1) / 2, Z1 + 0.005], [X0 - 0.005, (Z0 + Z1) / 2]][s];
      m.position.set(pos[0], TOP * 0.5, pos[1]);
      m.rotation.y = s % 2 ? Math.PI / 2 : 0;
      scene.add(m);
    }
    linkGroup = new T.Group();
    scene.add(linkGroup);
  }

  // ---------------------------------------------------------------- the ladders and the friendly slides

  function snakeCurve(from, to) {
    const a = sq(from), b = sq(to);
    const d = new V3().subVectors(b, a), len = d.length();
    const perp = new V3(-d.z, 0, d.x).normalize();
    const waves = Math.max(1, Math.round(len / 2.6));
    const amp = Math.min(0.42, 0.18 + len * 0.04);
    const pts = [], N = Math.max(6, Math.ceil(len * 2));
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const p = a.clone().addScaledVector(d, t);
      const w = Math.sin(t * Math.PI * waves) * amp * Math.pow(Math.sin(t * Math.PI), 0.6);
      p.addScaledVector(perp, w);
      p.x = Math.max(-4.85, Math.min(4.85, p.x));
      p.z = Math.max(-4.85, Math.min(4.85, p.z));
      p.y = TOP + 0.17;
      pts.push(p);
    }
    return new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }
  // how thick a slide is along its length (t = 0 at the head, 1 at the tip of the tail)
  const girth = (t) => 0.19 - 0.12 * t - (t > 0.9 ? (t - 0.9) * 0.5 : 0);

  const skinCache = {};
  function skinTexture(c1, c2) {
    const key = c1 + c2;
    if (skinCache[key]) return skinCache[key];
    const [c, g] = makeCanvas(128, 64);
    g.fillStyle = c1;
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = shade(c1, -0.12);
    g.fillRect(0, 44, 128, 20); // a darker underside
    g.fillStyle = c2;
    for (const [x, y, r] of [[22, 22, 11], [74, 30, 9], [108, 14, 7], [52, 8, 6]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const tex = toTexture(c, true);
    return (skinCache[key] = tex);
  }

  function buildSlide(from, to, k) {
    const [c1, c2] = SNAKE_COLS[k % SNAKE_COLS.length];
    const curve = snakeCurve(from, to);
    const len = curve.getLength();
    const tubular = Math.max(24, Math.round(len * 14)), radial = 10;
    const geo = new T.TubeGeometry(curve, tubular, 1, radial, false);
    // taper the tube: pull each ring of vertices toward the middle of the body
    const pos = geo.attributes.position, P = new V3(), v = new V3();
    for (let i = 0; i <= tubular; i++) {
      curve.getPointAt(i / tubular, P);
      const r = girth(i / tubular);
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j;
        v.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(r).add(P);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    const tex = skinTexture(c1, c2).clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(2, Math.round(len * 1.6)), 1);
    const body = new T.Mesh(geo, std('#ffffff', { map: tex, roughness: 0.45 }));
    const g = new T.Group();
    g.add(body);
    // the head: round and smiling, looking out at the players
    const head = new T.Group();
    const a = sq(from);
    head.position.set(a.x, TOP + 0.28, a.z);
    head.scale.setScalar(1.15);
    const skin = std(c1, { roughness: 0.45 });
    const ball = new T.Mesh(new T.SphereGeometry(0.31, 20, 14), skin);
    ball.scale.set(1.12, 0.82, 1.08);
    head.add(ball);
    const white = std('#ffffff', { roughness: 0.3 }), black = std('#14121f', { roughness: 0.3 }), pink = std('#ff8fb8', { roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.095, 14, 10), white);
      eye.position.set(sx * 0.12, 0.13, 0.15);
      head.add(eye);
      const pupil = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), black);
      pupil.position.set(sx * 0.12, 0.14, 0.235);
      head.add(pupil);
      const glint = new T.Mesh(new T.SphereGeometry(0.017, 6, 6), white);
      glint.position.set(sx * 0.12 + 0.018, 0.165, 0.28);
      head.add(glint);
      const cheek = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), pink);
      cheek.scale.set(1, 0.6, 0.4);
      cheek.position.set(sx * 0.2, 0.0, 0.2);
      head.add(cheek);
    }
    const smile = new T.Mesh(new T.TorusGeometry(0.085, 0.02, 6, 16, Math.PI), black);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.02, 0.27);
    smile.rotation.x = -0.35;
    head.add(smile);
    g.add(head);
    linkGroup.add(g);
    return { from, to, kind: 'slide', curve, len, head, group: g };
  }

  function buildLadder(from, to, k) {
    const color = LADDER_COLS[k % LADDER_COLS.length];
    const a = sq(from, RAIL_Y), b = sq(to, RAIL_Y);
    const d = new V3().subVectors(b, a), len = d.length();
    const perp = new V3(-d.z, 0, d.x).normalize().multiplyScalar(0.22);
    const g = new T.Group();
    const rail = std(color, { roughness: 0.45 }), rung = std('#fff6de', { roughness: 0.5 });
    // the rails run a little past each end, on little feet
    const ext = d.clone().normalize().multiplyScalar(0.18);
    const a2 = a.clone().sub(ext), b2 = b.clone().add(ext);
    for (const s of [-1, 1]) {
      rod(a2.clone().addScaledVector(perp, s), b2.clone().addScaledVector(perp, s), 0.055, rail, g);
      for (const e of [a2, b2]) {
        const foot = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, RAIL_Y - TOP, 8), rail);
        foot.position.copy(e).addScaledVector(perp, s);
        foot.position.y = (RAIL_Y + TOP) / 2;
        g.add(foot);
      }
    }
    const n = Math.max(2, Math.floor(len / 0.34));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().addScaledVector(d, i / n);
      rod(p.clone().add(perp), p.clone().sub(perp), 0.04, rung, g, 8);
    }
    linkGroup.add(g);
    return { from, to, kind: 'ladder', a, b, len, group: g };
  }

  // the soft shadows of the ladders and slides, printed on a fresh copy of the board
  function printShadows() {
    const c = boardTop.userData.canvas, g = c.getContext('2d');
    g.clearRect(0, 0, CW, CH);
    g.drawImage(printed.c, 0, 0);
    g.save();
    g.translate(PX * 0.07, PX * 0.07);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(40,25,10,0.22)';
    for (const o of Object.values(linkObjs.ladders)) {
      const perp = new V3(-(o.b.z - o.a.z), 0, o.b.x - o.a.x).normalize().multiplyScalar(0.22);
      g.lineWidth = 0.12 * PX;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(PXx(o.a.x + perp.x * s), PXz(o.a.z + perp.z * s));
        g.lineTo(PXx(o.b.x + perp.x * s), PXz(o.b.z + perp.z * s));
        g.stroke();
      }
    }
    for (const o of Object.values(linkObjs.slides)) {
      const N = 60;
      for (let i = 0; i < N; i++) {
        const p = o.curve.getPointAt(i / N), q = o.curve.getPointAt((i + 1) / N);
        g.lineWidth = girth(i / N) * 2.2 * PX;
        g.beginPath();
        g.moveTo(PXx(p.x), PXz(p.z));
        g.lineTo(PXx(q.x), PXz(q.z));
        g.stroke();
      }
      const h = sq(o.from);
      g.beginPath();
      g.arc(PXx(h.x), PXz(h.z), 0.3 * PX, 0, Math.PI * 2);
      g.fillStyle = 'rgba(40,25,10,0.2)';
      g.fill();
    }
    g.restore();
    boardTop.material.map.needsUpdate = true;
  }

  // Build the ladders and slides for a board ('easy' or 'normal').
  function setBoard(name) {
    if (name === boardName) return;
    boardName = name;
    for (const o of Object.values(linkObjs.ladders).concat(Object.values(linkObjs.slides))) {
      linkGroup.remove(o.group);
      o.group.traverse((m) => {
        if (m.isMesh) {
          m.geometry.dispose();
          if (m.material.map && m.material.map !== null) m.material.map.dispose && m.material.map.dispose();
        }
      });
    }
    linkObjs.ladders = {};
    linkObjs.slides = {};
    links = R.linksOf(name);
    const B = R.BOARDS[name];
    B.ladders.forEach(([a, z], k) => (linkObjs.ladders[a] = buildLadder(a, z, k)));
    B.slides.forEach(([a, z], k) => (linkObjs.slides[a] = buildSlide(a, z, k)));
    printShadows();
  }

  // ---------------------------------------------------------------- the pawns

  function makePawn(seat, kid, look, emoji) {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const c = COL[seat];
    const base = new T.Mesh(new T.CylinderGeometry(0.27, 0.3, 0.08, 26), std(c, { roughness: 0.45 }));
    base.position.y = 0.04;
    body.add(base);
    const rim = new T.Mesh(new T.TorusGeometry(0.27, 0.025, 6, 26), std('#ffffff', { roughness: 0.4 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    body.add(rim);
    let person = null, face = null;
    if (kid) {
      person = Kit.people.build(look);
      person.root.scale.setScalar(KID);
      person.root.position.y = 0.08;
      person.root.rotation.y = Math.PI;
      body.add(person.root);
      Kit.people.pose(person, 0, 'idle', 1);
    } else {
      // a chunky pawn: a skirt, a neck and the friend's face on top
      const m = std(c, { roughness: 0.4 });
      const skirt = new T.Mesh(new T.CylinderGeometry(0.11, 0.23, 0.36, 22), m);
      skirt.position.y = 0.26;
      body.add(skirt);
      const collar = new T.Mesh(new T.TorusGeometry(0.11, 0.035, 6, 20), std('#ffffff', { roughness: 0.4 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.44;
      body.add(collar);
      face = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(emoji), depthWrite: false, transparent: true }));
      face.scale.setScalar(0.8);
      face.position.y = 0.78;
      face.renderOrder = 12;
      body.add(face);
    }
    if (!shadowTex) shadowTex = radialTexture(128, [[0, 'rgba(20,30,10,0.5)'], [0.6, 'rgba(20,30,10,0.22)'], [1, 'rgba(20,30,10,0)']]);
    const shadow = new T.Mesh(new T.PlaneGeometry(0.8, 0.8), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 2;
    scene.add(shadow);
    scene.add(g);
    const pw = {
      seat, kid, g, body, person, face, shadow, q: [], rest: new V3(), restH: Math.PI, heading: Math.PI, want: Math.PI, scale: 1, scaleNow: 1,
      pose: 'idle', phase: Math.random() * 6, land: -1, party: null, square: 0,
    };
    pawns[seat] = pw;
    return pw;
  }
  let shadowTex = null;

  const face = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z));
  // where the pawns on each square stand: alone in the middle (a little back, so the number shows), or huddled
  const OFFS = { 1: [[0, -0.1]], 2: [[-0.2, -0.1], [0.2, -0.1]], 3: [[-0.22, -0.2], [0.22, -0.2], [0, 0.12]], 4: [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.18], [0.22, 0.18]] };
  const START_OFFS = [[-0.75, -0.3], [0.75, -0.3], [-0.75, 0.32], [0.75, 0.32]];
  function restSpots(st) {
    const at = {};
    for (const s of st.seats) (at[st.pos[s]] = at[st.pos[s]] || []).push(s);
    const out = {};
    for (const [n, list] of Object.entries(at)) {
      list.forEach((s, k) => {
        const p = sq(+n);
        if (+n === 0) {
          const o = START_OFFS[st.seats.indexOf(s) % 4];
          out[s] = { pos: new V3(p.x + o[0], TOP, p.z + o[1]), scale: 1 };
        } else {
          const o = OFFS[Math.min(4, list.length)][Math.min(k, 3)];
          out[s] = { pos: new V3(p.x + o[0], TOP, p.z + o[1]), scale: list.length > 1 ? 0.82 : 1 };
        }
      });
    }
    return out;
  }

  // every pawn in the game where the state says (others hidden), straight away
  function set(st) {
    setBoard(st.board);
    const spots = restSpots(st);
    for (const pw of pawns) {
      if (!pw) continue;
      const on = st.seats.includes(pw.seat);
      pw.g.visible = pw.shadow.visible = on;
      pw.q = [];
      pw.party = null;
      pw.body.rotation.set(0, 0, 0);
      pw.body.scale.set(1, 1, 1);
      if (!on) continue;
      const sp = spots[pw.seat];
      pw.rest.copy(sp.pos);
      pw.g.position.copy(sp.pos);
      pw.scale = pw.scaleNow = sp.scale;
      pw.heading = pw.want = pw.restH = Math.PI;
      pw.square = st.pos[pw.seat];
    }
  }
  // glide every pawn to its resting spot (after a move, pawns sharing a square make room)
  function settle(st) {
    const spots = restSpots(st);
    for (const s of st.seats) {
      const pw = pawns[s], sp = spots[s];
      pw.rest.copy(sp.pos);
      pw.scale = sp.scale;
      pw.restH = Math.PI;
      pw.square = st.pos[s];
    }
  }

  // ---------------------------------------------------------------- a move

  // Hop the pawn of `seat` along `path` (square numbers), then climb or slide `link` if there is one.
  // manual: hops wait for go() (one per call: the kids count them); otherwise they all go one after another.
  // hooks: hop(k, square) on each landing, bounce(), climb(), slide(), top(), done()
  function move(seat, from, ev, hooks = {}, manual = false) {
    const pw = pawns[seat];
    pw.party = null;
    let k = 0;
    const queueHop = () => {
      const i = k++;
      const n = ev.path[i], prev = i ? ev.path[i - 1] : from;
      const to = sq(n, TOP);
      to.z -= 0.1;
      const bounce = n < prev;
      pw.q.push({
        kind: 'hop', to, dur: manual ? 0.26 : 0.3, arc: 0.55,
        begin() { if (bounce && ev.path[i - 1] === R.LAST && hooks.bounce) hooks.bounce(); },
        end() {
          pw.square = n;
          pw.land = 0;
          if (hooks.hop) hooks.hop(i + 1, n);
          if (i === ev.path.length - 1) afterHops();
        },
      });
    };
    const afterHops = () => {
      const L = ev.link;
      if (L && L.kind === 'ladder') {
        const o = linkObjs.ladders[L.from];
        pw.q.push({
          kind: 'climb', to: o.b.clone(), from: o.a.clone(), dur: Math.max(0.8, o.len * 0.2), arc: 0,
          begin() { if (hooks.climb) hooks.climb(o); },
          end() { pw.square = L.to; },
        });
      } else if (L && L.kind === 'slide') {
        const o = linkObjs.slides[L.from];
        pw.q.push({
          kind: 'slide', curve: o.curve, to: sq(L.to, TOP), dur: Math.max(0.9, o.len * 0.14), arc: 0,
          begin() {
            if (hooks.slide) hooks.slide(o);
          },
          end() {
            pw.square = L.to;
            pw.land = 0;
            if (hooks.plop) hooks.plop();
          },
        });
      }
      pw.q.push({
        kind: 'glide', to: null, dur: 0.3, arc: 0,
        end() {
          if (ev.finished && hooks.top) hooks.top();
          if (hooks.done) hooks.done();
        },
      });
    };
    if (!ev.path.length) afterHops();
    else if (!manual) while (k < ev.path.length) queueHop();
    return {
      // the next hop (manual moves): false when there are none left or the pawn is still in the air
      go() {
        if (k >= ev.path.length || pw.q.length) return false;
        queueHop();
        return true;
      },
      get left() { return ev.path.length - k; },
      get hopped() { return k; },
    };
  }

  // ---------------------------------------------------------------- the die

  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function faceTexture(v) {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#e9e1d2';
    g.fillRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(110, 100, 20, 128, 128, 170);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f1ebe0');
    g.fillStyle = grad;
    roundRect(g, 10, 10, 236, 236, 46);
    g.fill();
    const red = v === 1 || v === 4;
    for (const [x, y] of PIPS[v]) {
      const r = v === 1 ? 40 : 25;
      g.beginPath();
      g.arc(128 + x * 64, 128 + y * 64, r, 0, Math.PI * 2);
      g.fillStyle = red ? '#e8372c' : '#2a2433';
      g.fill();
      g.beginPath();
      g.arc(128 + x * 64 - r * 0.25, 128 + y * 64 - r * 0.3, r * 0.35, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fill();
    }
    return toTexture(c);
  }
  // the face up for each value (box faces: +x 3, -x 4, +y 1, -y 6, +z 2, -z 5)
  const UP = {
    1: new T.Euler(0, 0, 0), 6: new T.Euler(Math.PI, 0, 0), 2: new T.Euler(-Math.PI / 2, 0, 0), 5: new T.Euler(Math.PI / 2, 0, 0),
    3: new T.Euler(0, 0, Math.PI / 2), 4: new T.Euler(0, 0, -Math.PI / 2),
  };
  function buildDie() {
    const mats = [3, 4, 1, 6, 2, 5].map((v) => new T.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.35 }));
    const mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), mats);
    mesh.scale.setScalar(DIE);
    scene.add(mesh);
    const glow = new T.Mesh(new T.RingGeometry(0.95, 1.18, 48), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(DIE_AT.x, TOP + 0.02, DIE_AT.z);
    glow.renderOrder = 3;
    scene.add(glow);
    const shadow = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), new T.MeshBasicMaterial({ map: radialTexture(128, [[0, 'rgba(30,20,10,0.55)'], [0.5, 'rgba(30,20,10,0.25)'], [1, 'rgba(30,20,10,0)']]), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(DIE_AT.x, TOP + 0.01, DIE_AT.z);
    shadow.renderOrder = 2;
    scene.add(shadow);
    const finger = sprite('👆', 0.95);
    die = { mesh, glow, shadow, finger, value: 6, t: -1, dur: 0.9, q0: new T.Quaternion(), q1: new T.Quaternion(), axis: new V3(), angle: 0, done: null, yaw: 0 };
    mesh.position.set(DIE_AT.x, TOP + DIE / 2, DIE_AT.z);
    showValue(6, 0.5);
  }
  function showValue(v, yaw = die.yaw) {
    die.value = v;
    die.yaw = yaw;
    die.q1.setFromEuler(UP[v]).premultiply(new T.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw));
    die.mesh.quaternion.copy(die.q1);
  }
  // Tumble the die and land on v, then done(v). seat: whose colour the ring glows.
  function roll(v, seat, done) {
    die.t = 0;
    die.done = done;
    die.value = v;
    die.yaw = rand(-0.5, 0.5);
    die.q0.copy(die.mesh.quaternion);
    die.q1.setFromEuler(UP[v]).premultiply(new T.Quaternion().setFromAxisAngle(new V3(0, 1, 0), die.yaw));
    die.axis.set(rand(-1, 1), rand(0.2, 1), rand(-1, 1)).normalize();
    die.angle = Math.PI * rand(5, 7);
    fx.dieSeat = seat;
    fx.tapMe = false;
  }
  function dieWait(seat, tapMe) {
    fx.dieSeat = seat;
    fx.tapMe = !!tapMe;
  }
  const rolling = () => die.t >= 0;
  const tq = new T.Quaternion();
  function updateDie(dt) {
    const base = TOP + DIE / 2, X = DIE_AT.x, Z = DIE_AT.z;
    die.glow.material.color.set(fx.dieSeat >= 0 ? COL[fx.dieSeat] : '#ffffff');
    if (die.t >= 0) {
      die.t += dt;
      const u = Math.min(1, die.t / die.dur);
      const e = 1 - Math.pow(1 - u, 3);
      // up, then two bounces
      const y = u < 0.62 ? Math.sin((u / 0.62) * Math.PI) * 2.6 : u < 0.85 ? Math.sin(((u - 0.62) / 0.23) * Math.PI) * 0.5 : Math.sin(((u - 0.85) / 0.15) * Math.PI) * 0.12;
      die.mesh.position.set(X + Math.sin(u * 9) * 0.15 * (1 - u), base + y, Z + Math.cos(u * 7) * 0.12 * (1 - u));
      tq.setFromAxisAngle(die.axis, die.angle * (1 - e));
      die.mesh.quaternion.copy(die.q1).multiply(tq);
      die.shadow.scale.setScalar(1 / (1 + y * 0.4));
      if (u >= 1) {
        die.t = -1;
        die.mesh.quaternion.copy(die.q1);
        die.mesh.position.set(X, base, Z);
        if (flyers) for (let i = 0; i < 6; i++) flyers.add('✨', X + rand(-0.6, 0.6), TOP + 0.4, Z + rand(-0.6, 0.6), rand(-1.5, 1.5), rand(1, 2.4), 0.3, 0.6, rand(-3, 3), 4);
        const d = die.done;
        die.done = null;
        if (d) d(die.value);
      }
    } else {
      // waiting for a tap: a little bob
      const hop = fx.tapMe ? Math.abs(Math.sin(fx.t * 3.2)) * 0.22 : 0;
      die.mesh.position.set(X, base + hop, Z);
      die.shadow.scale.setScalar(1 / (1 + hop * 0.6));
    }
    die.glow.scale.setScalar(fx.tapMe ? 1 + Math.sin(fx.t * 6) * 0.08 : 1);
    die.glow.visible = fx.dieSeat >= 0;
    die.finger.visible = fx.tapMe && die.t < 0;
    if (die.finger.visible) die.finger.position.set(X + 0.15, TOP + DIE + 0.95 + Math.abs(Math.sin(fx.t * 4)) * 0.3, Z + 0.3);
  }

  // ---------------------------------------------------------------- marks: the counting bubbles, the landing, the hint

  function sprite(emoji, size, order = 24) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(emoji), depthTest: false, depthWrite: false, transparent: true }));
    s.scale.setScalar(size);
    s.renderOrder = order;
    s.visible = false;
    s.userData.emo = emoji;
    scene.add(s);
    return s;
  }
  function flat(geo, color, opacity = 0.95, order = 4) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = order;
    m.visible = false;
    scene.add(m);
    return m;
  }
  const numCache = {};
  // a round counting bubble: n in white on the seat's colour
  function numberTexture(seat, n) {
    const key = seat + ':' + n;
    if (numCache[key]) return numCache[key];
    const [c, g] = makeCanvas(128, 128);
    g.beginPath();
    g.arc(64, 64, 52, 0, Math.PI * 2);
    g.fillStyle = seat >= 0 ? COL[seat] : '#ffd400';
    g.fill();
    g.lineWidth = 9;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = '#14121f';
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.stroke();
    g.font = `${n > 9 ? 48 : 64}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#14121f';
    g.strokeText(String(n), 64, 68);
    g.fillStyle = '#ffffff';
    g.fillText(String(n), 64, 68);
    return (numCache[key] = toTexture(c));
  }

  const marks = { bubbles: [], pops: [] };
  let landRing = null, landIcon = null, hintRing = null, hintGlow = null, finger = null, tapFinger = null, turnRing = null, endRing = null;
  function buildMarks() {
    for (let k = 0; k < 6; k++) {
      const b = new T.Sprite(new T.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true }));
      b.renderOrder = 26;
      b.visible = false;
      scene.add(b);
      marks.bubbles.push(b);
      const p = new T.Sprite(new T.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true }));
      p.renderOrder = 27;
      p.visible = false;
      p.userData.t = -1;
      scene.add(p);
      marks.pops.push(p);
    }
    landRing = flat(new T.RingGeometry(0.34, 0.48, 36), '#ffffff', 0.95, 5);
    endRing = flat(new T.RingGeometry(0.3, 0.42, 36), '#ffffff', 0.8, 5);
    landIcon = sprite('🪜', 0.6, 25);
    hintGlow = flat(new T.CircleGeometry(0.5, 36), '#ffd400', 0.75, 3);
    hintRing = flat(new T.RingGeometry(0.5, 0.7, 40), '#ffd400', 1, 6);
    finger = sprite('👇', 1.0, 27);
    tapFinger = sprite('👆', 0.8, 27);
    turnRing = flat(new T.RingGeometry(0.33, 0.43, 36), '#ffffff', 0.95, 4);
  }

  // path({ seat, from, ev, next }): the counting bubbles 1, 2, 3... on the squares the pawn will hop to, where it lands
  // (with 🪜 for a ladder, 🐍 for a slide, 🏆 for 100, ↩️ for a bounce) and where a ladder or slide takes it.
  // next: the bubble the kid taps for (counting mode), or -1.
  function showPath(p) {
    fx.path = p || null;
    fx.pathT = 0;
    if (!p) return;
    p.done = p.done || 0;
  }
  // the pawn reached bubble k (1 - 6): it pops off the board, up over the pawn
  function popBubble(seat, k, n) {
    const pop = marks.pops[(k - 1) % 6];
    pop.material.map = numberTexture(seat, k);
    pop.material.needsUpdate = true;
    sq(n, TOP + 1.1, pop.position);
    pop.userData.t = 0;
    pop.visible = true;
    if (fx.path) fx.path.done = Math.max(fx.path.done, k);
  }
  function hint(h) {
    fx.hint = h || null;
    fx.hintT = 0;
  }
  function setTurn(seat) { fx.turn = seat; }
  function shake(secs) { fx.shake = Math.max(fx.shake, secs); }

  const tmp = new V3(), tmp2 = new V3();
  function updateMarks(dt) {
    const t = fx.t;
    fx.pathT = (fx.pathT || 0) + dt;
    const P = fx.path;
    const grow = Math.min(1, fx.pathT * 5);
    for (let k = 0; k < 6; k++) {
      const b = marks.bubbles[k];
      const on = !!P && k < P.ev.path.length && k >= P.done;
      b.visible = on;
      if (!on) continue;
      const n = P.ev.path[k];
      b.material.map = numberTexture(P.seat, k + 1);
      // a bounce back passes squares twice: lift the second bubble a little
      const twice = P.ev.path.indexOf(n) < k;
      sq(n, TOP + 0.42 + (twice ? 0.5 : 0), b.position);
      b.position.z += 0.05;
      const isNext = P.next === k;
      b.scale.setScalar(grow * (isNext ? 0.62 + Math.sin(t * 7) * 0.06 : 0.46));
    }
    // the pops: up and away over the pawn
    for (const p of marks.pops) {
      if (p.userData.t < 0) continue;
      p.userData.t += dt;
      const u = p.userData.t / 0.75;
      if (u >= 1) {
        p.userData.t = -1;
        p.visible = false;
        continue;
      }
      p.position.y += dt * 1.6;
      p.scale.setScalar(0.75 + Math.sin(Math.min(1, u * 3) * Math.PI) * 0.35);
      p.material.opacity = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
    }
    // where it lands, and the ladder's top or the slide's tail
    landRing.visible = landIcon.visible = endRing.visible = false;
    tapFinger.visible = false;
    if (P && P.ev.path.length) {
      const ev = P.ev;
      sq(ev.landed, TOP + 0.02, tmp);
      landRing.visible = true;
      landRing.material.color.set(COL[P.seat]);
      landRing.position.copy(tmp);
      landRing.scale.setScalar(grow * (1 + Math.sin(t * 5) * 0.1));
      const emo = ev.finished ? '🏆' : ev.link ? (ev.link.kind === 'ladder' ? '🪜' : '🐍') : ev.bounced ? '↩️' : null;
      if (emo) {
        landIcon.visible = P.done < ev.path.length;
        if (landIcon.userData.emo !== emo) {
          landIcon.material.map = emojiTexture(emo);
          landIcon.material.needsUpdate = true;
          landIcon.userData.emo = emo;
        }
        landIcon.position.set(tmp.x + 0.3, TOP + 1.25 + Math.abs(Math.sin(t * 4)) * 0.12, tmp.z - 0.1);
        landIcon.scale.setScalar(0.62 * grow);
      }
      if (ev.link) {
        sq(ev.link.to, TOP + 0.02, tmp2);
        endRing.visible = true;
        endRing.material.color.set(ev.link.kind === 'ladder' ? '#ffffff' : '#14121f');
        endRing.material.opacity = ev.link.kind === 'ladder' ? 0.9 : 0.35;
        endRing.position.copy(tmp2);
        endRing.scale.setScalar(grow);
      }
      if (P.next >= 0 && P.next < ev.path.length) {
        sq(ev.path[P.next], 0, tmp2);
        tapFinger.visible = true;
        tapFinger.position.set(tmp2.x + 0.32, TOP + 0.95 + Math.abs(Math.sin(t * 5)) * 0.18, tmp2.z + 0.35);
      }
    }
    // your brother's hint: a gold ring round the die, or gold under where you'll land with a bouncing 👇
    const h = fx.hint;
    hintRing.visible = hintGlow.visible = finger.visible = !!h;
    if (h) {
      fx.hintT += dt;
      const gr = Math.min(1, fx.hintT * 4);
      if (h.die) {
        hintRing.position.set(DIE_AT.x, TOP + 0.03, DIE_AT.z);
        hintRing.scale.setScalar(gr * 1.9 * (1 + Math.sin(t * 6) * 0.06));
        hintGlow.visible = finger.visible = false;
      } else {
        sq(h.square, TOP + 0.03, tmp);
        hintRing.position.copy(tmp);
        hintRing.scale.setScalar(gr * (1 + Math.sin(t * 6 + 1.5) * 0.12));
        hintGlow.position.set(tmp.x, TOP + 0.012, tmp.z);
        hintGlow.scale.setScalar(gr * (1 + Math.sin(t * 6) * 0.12));
        finger.position.set(tmp.x, TOP + 1.45 + Math.abs(Math.sin(t * 5)) * 0.3, tmp.z);
      }
    }
    // whose turn: a ring under their pawn
    const pw = fx.turn >= 0 ? pawns[fx.turn] : null;
    turnRing.visible = !!pw && pw.g.visible && !pw.q.length;
    if (turnRing.visible) {
      turnRing.material.color.set(COL[pw.seat]);
      turnRing.position.set(pw.g.position.x, TOP + 0.015, pw.g.position.z);
      turnRing.scale.setScalar(pw.scaleNow * (1.15 + Math.sin(t * 5) * 0.1));
    }
  }

  // ---------------------------------------------------------------- every frame

  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const SPEED = { idle: 2.2, jump: 3, run: 14, peace: 4.2, boxing: 6, jumpshot: 3, wave: 5 };
  function updatePawn(pw, dt) {
    const a = pw.q[0];
    let mode = 'idle';
    if (a) {
      if (a.t === undefined) {
        a.t = 0;
        a.from0 = pw.g.position.clone();
        if (a.kind === 'glide') a.to = pw.rest.clone();
        if (a.begin) a.begin();
      }
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      if (a.kind === 'hop' || a.kind === 'glide') {
        const k = a.kind === 'glide' ? 1 - Math.pow(1 - u, 3) : u;
        pw.g.position.lerpVectors(a.from0, a.to, k);
        pw.g.position.y += Math.sin(u * Math.PI) * a.arc;
        if (a.kind === 'hop' && a.from0.distanceTo(a.to) > 0.05) pw.want = face(a.from0, a.to);
        mode = a.kind === 'hop' ? 'jump' : 'idle';
      } else if (a.kind === 'climb') {
        // a quick hop onto the bottom rung, then up the ladder
        const k = ease(u);
        if (k < 0.08) pw.g.position.lerpVectors(a.from0, a.from, k / 0.08);
        else pw.g.position.lerpVectors(a.from, a.to, (k - 0.08) / 0.92);
        pw.want = face(a.from, a.to);
        mode = 'run';
      } else if (a.kind === 'slide') {
        // down the slide, faster and faster
        const k = Math.pow(u, 1.6);
        a.curve.getPointAt(Math.min(1, k), tmp);
        a.curve.getTangentAt(Math.min(0.999, k), tmp2);
        pw.g.position.set(tmp.x, tmp.y + girth(k) * 0.9 - 0.02, tmp.z);
        if (tmp2.lengthSq() > 1e-6) pw.want = Math.atan2(-tmp2.x, -tmp2.z);
        pw.body.rotation.z = Math.sin(u * Math.PI * 4) * 0.15;
        mode = 'jump';
        if (flyers && Math.random() < dt * 10) flyers.add('💨', tmp.x, TOP + 0.3, tmp.z, rand(-0.5, 0.5), rand(0.3, 0.8), 0.32, 0.5, 0, 0);
      }
      if (u >= 1) {
        pw.q.shift();
        if (a.kind !== 'climb' && a.kind !== 'slide') pw.g.position.copy(a.to);
        else if (a.kind === 'climb') pw.g.position.copy(a.to);
        pw.body.rotation.set(0, 0, 0);
        if (a.end) a.end();
      }
    } else if (pw.g.position.distanceToSquared(pw.rest) > 0.0004) {
      pw.g.position.lerp(pw.rest, Math.min(1, dt * 10));
    }
    if (!pw.q.length) pw.want = pw.restH;
    let da = pw.want - pw.heading;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    pw.heading += da * Math.min(1, dt * 14);
    pw.g.rotation.y = pw.heading - Math.PI; // the figure is built facing the camera
    pw.scaleNow += (pw.scale - pw.scaleNow) * Math.min(1, dt * 10);
    pw.g.scale.setScalar(pw.scaleNow);
    // landing squash
    if (pw.land >= 0) {
      pw.land += dt;
      const kk = pw.land / 0.22;
      const s = Math.sin(Math.min(1, kk) * Math.PI) * 0.16 * (1 - Math.min(1, kk));
      pw.body.scale.set(1 + s, 1 - s * 1.3, 1 + s);
      if (kk >= 1) {
        pw.land = -1;
        pw.body.scale.set(1, 1, 1);
      }
    }
    // a party on the square (the win): his signature move, over and over; a friend spins
    if (pw.party && !pw.q.length) {
      pw.party.t += dt;
      if (pw.kid) mode = pw.party.pose;
      else pw.face.material.rotation = Math.sin(pw.party.t * 8) * 0.3;
      pw.body.position.y = Math.abs(Math.sin(pw.party.t * 5)) * 0.25;
    } else {
      pw.body.position.y = 0;
      if (pw.face) pw.face.material.rotation = 0;
    }
    if (pw.person) {
      pw.phase += dt * (SPEED[mode] || 2.2);
      Kit.people.pose(pw.person, pw.phase, mode, 1 - Math.exp(-18 * dt));
      if (mode === 'idle') {
        const b = Math.sin(pw.phase) * 0.03;
        pw.person.armL.rotation.z = -0.08 - b;
        pw.person.armR.rotation.z = 0.08 + b;
      }
      if (mode === 'peace') {
        pw.person.legL.rotation.x *= 0.35;
        pw.person.legR.rotation.x *= 0.35;
      }
    }
    pw.shadow.position.set(pw.g.position.x, TOP + 0.012, pw.g.position.z);
    const air = Math.max(0, pw.g.position.y - TOP);
    pw.shadow.scale.setScalar(pw.scaleNow / (1 + air * 0.8));
    pw.shadow.material.opacity = 1 / (1 + air * 1.5);
  }

  function update(dt) {
    fx.t += dt;
    for (const pw of pawns) if (pw && pw.g.visible) updatePawn(pw, dt);
    updateDie(dt);
    updateMarks(dt);
    if (fx.shake > 0) {
      fx.shake = Math.max(0, fx.shake - dt);
      const amp = fx.shake * 0.25;
      cam.position.set(camBase.x + (Math.random() - 0.5) * amp, camBase.y + (Math.random() - 0.5) * amp, camBase.z + (Math.random() - 0.5) * amp);
      cam.updateMatrixWorld(true);
    } else if (!cam.position.equals(camBase) && camBase.lengthSq()) {
      cam.position.copy(camBase);
      cam.updateMatrixWorld(true);
    }
  }

  // ---------------------------------------------------------------- camera and picking

  // Aim the camera down at `elev` radians, from the direction `az` (0: from +z, the front), so the world points `pts`
  // fill the screen minus margins { l, r, t, b } in pixels. (From TT Jungle Chess, by way of TT Flying Chess.)
  const right = new V3(), up = new V3();
  function fit(pts, elev, az, m) {
    cam.clearViewOffset();
    const dir = new V3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
    const center = new V3();
    pts.forEach((p) => center.add(p));
    center.multiplyScalar(1 / pts.length);
    const hw = Math.max(0.1, (W - m.l - m.r) / W), hh = Math.max(0.1, (H - m.t - m.b) / H);
    const box = { x0: -hw, x1: hw, y0: -hh, y1: hh };
    const place = (d) => {
      cam.position.copy(center).addScaledVector(dir, d);
      cam.up.set(0, 1, 0);
      cam.lookAt(center);
      cam.updateMatrixWorld(true);
    };
    const bounds = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        tmp.copy(p).project(cam);
        x0 = Math.min(x0, tmp.x);
        x1 = Math.max(x1, tmp.x);
        y0 = Math.min(y0, tmp.y);
        y1 = Math.max(y1, tmp.y);
      }
      return { x0, x1, y0, y1 };
    };
    for (let iter = 0; iter < 4; iter++) {
      let lo = 2, hi = 400;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const b = bounds();
        if (b.x0 >= box.x0 && b.x1 <= box.x1 && b.y0 >= box.y0 && b.y1 <= box.y1) hi = mid;
        else lo = mid;
      }
      place(hi);
      const b = bounds();
      const dx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2;
      const dy = (b.y0 + b.y1) / 2 - (box.y0 + box.y1) / 2;
      const d = cam.position.distanceTo(center);
      const halfH = d * Math.tan((cam.fov * Math.PI) / 360), halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      center.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH);
    }
    const bx = (m.l + W - m.r) / 2, by = (m.t + H - m.b) / 2;
    cam.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);
    cam.updateMatrixWorld(true);
    camBase.copy(cam.position);
    return center;
  }

  function toScreen(v, out = { x: 0, y: 0 }) {
    tmp2.copy(v).project(cam);
    out.x = ((tmp2.x + 1) / 2) * W;
    out.y = ((1 - tmp2.y) / 2) * H;
    return out;
  }
  // how many screen pixels one square is, near point v
  function pxPerSquare(v = new V3(0, TOP, 0)) {
    const a = toScreen(v, {}), b = toScreen(tmp.set(v.x + 1, v.y, v.z), {});
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  // a tap on (or near) the die
  function pickDie(x, y) {
    const a = toScreen(die.mesh.position, {});
    const r = Math.max(56, pxPerSquare() * DIE * 0.95);
    return Math.hypot(a.x - x, a.y - y) <= r;
  }

  function render() {
    if (renderer) renderer.render(scene, cam);
  }

  SL.stage = {
    init, useFx, resize, render, update, fit, toScreen, pxPerSquare, setBoard, makePawn, set, settle, move, showPath, popBubble,
    hint, setTurn, shake, roll, dieWait, showValue, pickDie, sq, scene, cam, TOP, COL, DIE, X0, X1, Z0, Z1, START_AT, DIE_AT,
    busy: () => rolling() || pawns.some((p) => p && p.q.length),
    rolling,
    pawn: (s) => pawns[s],
    party(seat, pose) {
      const pw = pawns[seat];
      if (pw) pw.party = pose ? { pose, t: 0 } : null;
    },
    links: () => ({ ladders: linkObjs.ladders, slides: linkObjs.slides }),
    get board() { return boardName; },
    get dieValue() { return die.value; },
    get dieMesh() { return die.mesh; },
    get W() { return W; },
    get H() { return H; },
    get renderer() { return renderer; },
    get hintNow() { return fx.hint; },
    get pathNow() { return fx.path; },
  };
})();
