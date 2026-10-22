/* TT Snakes & Ladders: the menu, the game, the HUD, input and the main loop.
   Screens: home (who plays, the board, counting hops on or off), play, game over, pause, and the rules ("How to
   play", with pictures). Teddy plays blue and Tommy yellow; the other seats are CPU friends, 🦊 Foxy (red) and
   🐸 Froggy (green). 2 to 4 players. 🐣 EASY (the default, for Tommy) is the board with more ladders and short slides;
   🔥 NORMAL (for Teddy) has long slides.
   A turn: tap the die (or Space), it tumbles, and counting bubbles 1, 2, 3... show the squares the pawn will hop to.
   With 🔢 COUNT HOPS on, a kid taps once for every hop (counting practice); otherwise the pawn hops by itself. Then
   up the ladder or down the slide, and the next player's turn. The first on 100 (exactly) wins.
   When one brother plays, the other is the one you call for help (js/buddy.js: a treat and a lucky re-roll); when
   both play, T is a high five. The score keeps running until you change who plays or the board.
   window.game is a test hook: see the README. */
(function () {
  'use strict';
  const SL = window.SL;
  const R = SL.rules;
  const ST = SL.stage;
  const S = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const { rand } = Kit.gfx;

  const KEY = 'snakesLaddersTT.v1';
  const SCALE = 1.8; // the boys beside the board
  // the four seats, by colour: 0 red, 1 yellow, 2 blue, 3 green
  const SEATS = [
    { seat: 0, id: 'foxy', name: 'FOXY', emoji: '🦊', kid: false },
    { seat: 1, id: 'tommy', name: 'TOMMY', kid: true },
    { seat: 2, id: 'teddy', name: 'TEDDY', kid: true },
    { seat: 3, id: 'froggy', name: 'FROGGY', emoji: '🐸', kid: false },
  ];

  const prefs = Object.assign({ on: [true, true, true, false], level: 'easy', count: true }, load());
  const G = {
    state: 'boot', st: null, seats: [], level: 'easy', wins: [0, 0, 0, 0], setupKey: '', starter: -1, turnId: 0,
    jobs: [], rolling: false, pending: null, path: null, held: false, last: 0, auto: false, demo: null, nextDice: [],
    wide: true, rulesFrom: null, pausedFrom: null, hops: 0, climbs: 0, slides: 0, bounces: 0, taps: 0, rerolls: 0, time: 0,
  };
  const actors = [];
  const badges = [];
  let ui = null, flyers = null, bursts = null, spots = null, art = null;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (e) { /* private mode */ }
  }

  // ---------------------------------------------------------------- who's at the board

  const nameOf = (k) => SEATS[k].name;
  const cur = () => (G.st ? G.seats.find((s) => s.seat === G.st.turn) : null);
  const kidsIn = () => G.seats.filter((s) => s.kid);
  const isHuman = (s) => s && s.kid && !G.auto;
  const solo = () => (kidsIn().length === 1 ? kidsIn()[0] : null);

  function setActors(showAll) {
    for (const info of SEATS) actors[info.seat].visible = showAll || G.seats.some((s) => s.seat === info.seat);
    G.seats.forEach((s) => (s.actor = actors[s.seat]));
    const kids = kidsIn();
    if (kids.length === 1) SL.buddy.setFor(kids[0].id);
  }

  // the badge that bobs over whoever's turn it is: a 🎲 in their colour
  function badgeTexture(k) {
    const [c, g] = Kit.gfx.makeCanvas(128, 128);
    g.fillStyle = ST.COL[k];
    g.beginPath();
    g.arc(64, 64, 54, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = '#14121f';
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.stroke();
    g.font = `60px ${Kit.gfx.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🎲', 64, 68);
    return Kit.gfx.toTexture(c);
  }

  // ---------------------------------------------------------------- layout

  function layout() {
    ST.resize();
    SL.fx.overlay.resize();
    const W = ST.W, H = ST.H;
    if (W < 2 || H < 2) return;
    const wide = W / H >= 1.15;
    G.wide = wide;
    // beside the board on a wide screen while playing; in front and behind it on a tall one (and on the home screen)
    const P = wide && G.state !== 'home'
      ? { 0: { x: 7.7, z: -2.6 }, 1: { x: 7.7, z: 3.6 }, 2: { x: -7.7, z: 3.6 }, 3: { x: -7.7, z: -2.6 } }
      : { 0: { x: 4.5, z: 9.2 }, 1: { x: 1.5, z: 9.7 }, 2: { x: -1.5, z: 9.7 }, 3: { x: -4.5, z: 9.2 } };
    const one = G.state !== 'home' ? solo() : null;
    // your brother pops in beside you on a wide screen, and at his own place in the row on a tall one
    const bud = one ? (wide ? { x: P[one.seat].x, z: P[one.seat].z + 2.7 } : { x: P[3 - one.seat].x, z: P[3 - one.seat].z }) : { x: -7.8, z: 10.1 };
    spots = {
      seats: P, buddy: bud,
      meet: wide ? [{ x: -1, z: 9.4 }, { x: 1, z: 9.4 }] : [{ x: -1, z: 10.2 }, { x: 1, z: 10.2 }],
    };
    const V = THREE.Vector3, pts = [];
    for (const x of [ST.X0, ST.X1]) for (const z of [ST.Z0, ST.Z1]) pts.push(new V(x, 0, z), new V(x, ST.TOP + 0.4, z));
    pts.push(new V(ST.DIE_AT.x, ST.TOP + ST.DIE + 1.4, ST.DIE_AT.z));
    const shown = G.state === 'home' ? [0, 1, 2, 3] : G.seats.map((s) => s.seat);
    for (const k of shown) {
      // in a row in front of the board (tall screens), their heads stand up over the tray: only their feet count
      const p = P[k], tall = wide && G.state !== 'home' ? (SEATS[k].kid ? 2 * SCALE + 0.5 : 4.3) : 1.2;
      const half = wide && G.state !== 'home' ? 0.8 : 0.5;
      pts.push(new V(p.x - half, 0, p.z), new V(p.x + half, 0, p.z), new V(p.x, 0, p.z + 0.9), new V(p.x, tall, p.z));
    }
    if (one) pts.push(new V(bud.x, wide ? 2 * SCALE * 0.9 : 1.2, bud.z), new V(bud.x, 0, bud.z));
    // the kit's round ? and language buttons sit on the left edge: keep the board clear of them
    const m = { l: 58, r: 10, t: 10, b: 10 };
    if (G.state === 'home') {
      if (wide) m.r = W * 0.52 + 10;
      else {
        m.b = H * 0.58 + 6;
        m.t = 6;
      }
    } else {
      document.documentElement.style.setProperty('--toolsw', wide ? `${ui.tools.offsetWidth + 10}px` : '0px');
      const top = ui.hudtop.getBoundingClientRect();
      m.t = top.bottom + (ui.count.classList.contains('hidden') ? 6 : 6);
      const call = ui.callBtn.getBoundingClientRect();
      if (!wide) m.b = Math.max(10, H - call.top + 4);
      else m.r = Math.max(10, W - call.left + 4);
    }
    ST.fit(pts, G.state === 'home' ? (wide ? 0.95 : 1.02) : wide ? 1.0 : 1.1, 0, m);
    const cp = ST.cam.position;
    for (const info of SEATS) {
      const a = actors[info.seat], p = P[info.seat];
      p.face = Math.atan2(-(cp.x * 0.6 - p.x), -(cp.z * 0.75 - p.z));
      a.faceDefault = p.face;
      if (!SL.highFive.on) a.place(p.x, 0, p.z);
    }
    spots.buddy.face = Math.atan2(-(cp.x * 0.6 - bud.x), -(cp.z * 0.75 - bud.z));
    if (SL.buddy.on) SL.buddy.actor.place(bud.x, 0, bud.z); // the screen turned while he was here
  }

  // ---------------------------------------------------------------- the game

  const seatsOn = () => SEATS.filter((s, k) => prefs.on[k]).map((s) => s.seat);

  function startGame(opts = {}) {
    gesture();
    SL.highFive.cancel(); // (before the seats change: it puts the old game's brothers back)
    // at least 2 players, and Teddy or Tommy (the menu makes sure; so does this, for the test hook)
    if (opts.seats && opts.seats.length >= 2 && opts.seats.some((k) => SEATS[k] && SEATS[k].kid)) prefs.on = [0, 1, 2, 3].map((k) => opts.seats.includes(k));
    for (const k of ['level', 'count']) if (opts[k] !== undefined) prefs[k] = opts[k];
    save();
    const list = seatsOn();
    G.level = prefs.level;
    const key = `${list.join('')}:${G.level}`;
    if (key !== G.setupKey) {
      G.setupKey = key;
      G.wins = [0, 0, 0, 0];
      G.starter = -1;
    }
    G.seats = list.map((k) => Object.assign({}, SEATS[k]));
    if (G.starter < 0 || !list.includes(G.starter)) G.starter = (G.seats.find((s) => s.kid) || G.seats[0]).seat; // a kid starts the first game
    G.demo = null;
    setActors(false);
    show(ui.home, false);
    show(ui.hud, true);
    show(ui.tools, true);
    show(ui.callBtn, true);
    show(ui.gameOver, false);
    show(ui.rules, false);
    document.body.dataset.screen = 'play';
    G.state = 'play';
    setupHud();
    layout();
    S.music('title');
    newGame();
  }

  function newGame() {
    G.st = R.newGame({ seats: G.seats.map((s) => s.seat), board: G.level, starter: G.starter });
    Object.assign(G, { jobs: [], rolling: false, pending: null, path: null });
    ST.set(G.st);
    ST.showPath(null);
    ST.hint(null);
    SL.buddy.reset();
    SL.fx.overlay.clear();
    flyers.clear();
    bursts.clear();
    clearToasts();
    G.seats.forEach((s) => {
      s.actor.react('idle');
      s.actor.drop();
    });
    G.state = 'play';
    show(ui.gameOver, false);
    show(ui.pause, false);
    renderHud();
    beginTurn();
  }

  // run fn after `secs` of game time; `idle`: and only once nothing is moving on the board
  function after(secs, fn, idle = true) {
    G.jobs.push({ t: secs, fn, idle });
  }

  function beginTurn() {
    if (G.state !== 'play' || G.st.over) return;
    G.turnId++;
    G.pending = null;
    const s = cur();
    ST.showPath(null);
    ST.setTurn(s.seat);
    if (isHuman(s)) ST.dieWait(s.seat, true);
    else {
      ST.dieWait(s.seat, false);
      if (!s.kid) {
        s.actor.act('think', 0.6);
        SL.sfx.think();
      }
      after(G.auto ? 0.2 : 0.45, () => rollDie(false));
    }
    updateTurnText();
    renderHud();
  }

  const canRoll = () => G.state === 'play' && G.st && !G.st.over && G.st.phase === 'roll' && !G.rolling && !G.pending && !ST.busy() && !G.jobs.length;

  // Roll the die (a tap or Space for a kid; the CPU and the test bot call it themselves).
  function rollDie(human) {
    if (!canRoll()) return false;
    const s = cur();
    if (human && !isHuman(s)) return false;
    const v = G.nextDice.length ? G.nextDice.shift() : 1 + Math.floor(Math.random() * 6);
    G.rolling = true;
    SL.sfx.roll();
    ST.hint(null);
    SL.buddy.repoint();
    ST.roll(v, s.seat, dieLanded);
    updateTurnText();
    return true;
  }

  // the die has landed: show the counting bubbles and where the pawn will land, then wait for the move to start
  function dieLanded(v) {
    G.rolling = false;
    if (G.state !== 'play') return;
    SL.sfx.dieLand(v);
    const st = G.st, s = cur();
    const ev = R.roll(st, v);
    if (!ev) return;
    const counting = isHuman(s) && prefs.count;
    G.pending = { seat: s.seat, ev, ctrl: null, counting, readyAt: G.time + (isHuman(s) ? 0.75 : G.auto ? 0.25 : 0.55), hopped: 0 };
    G.path = { seat: s.seat, ev, next: counting ? 0 : -1, done: 0 };
    ST.showPath(G.path);
    renderCount();
    updateTurnText();
  }

  // your brother's lucky re-roll (js/buddy.js calls it): the die tumbles again to a value that goes furthest
  function reroll() {
    const p = G.pending;
    if (!p || p.ctrl || G.rolling || G.state !== 'play' || !isHuman(cur())) return null;
    const l = R.lucky(G.st);
    const w = G.nextDice.length ? G.nextDice.shift() : l.values[Math.floor(Math.random() * l.values.length)];
    const was = G.st.die;
    G.rolling = true;
    G.rerolls++;
    ST.showPath(null);
    SL.sfx.roll();
    ST.roll(w, p.seat, (v) => {
      G.rolling = false;
      if (G.state !== 'play' || G.pending !== p) return;
      SL.sfx.dieLand(v);
      const ev = R.reroll(G.st, v);
      p.ev = ev;
      p.readyAt = G.time + 0.7;
      G.path = { seat: p.seat, ev, next: p.counting ? 0 : -1, done: 0 };
      ST.showPath(G.path);
      renderCount();
      updateTurnText();
    });
    updateTurnText();
    return { from: was, to: w, best: l.best };
  }

  // Is the pawn waiting for your brother's re-roll?
  const waitingForBuddy = () => !!G.pending && !G.pending.ctrl && isHuman(cur()) && !!solo() && SL.buddy.wants();

  // Start the move: the state moves on now, the pawn hops on the board (all at once, or one hop per tap).
  function startMove() {
    const p = G.pending, st = G.st;
    if (!p || p.ctrl || G.rolling || G.state !== 'play') return false;
    const s = cur(), from = st.pos[st.turn];
    const ev = R.play(st);
    if (!ev) return false;
    p.ev = ev;
    if (s.kid) SL.buddy.moved();
    if (s.actor.mode !== 'signature') s.actor.act('give', 0.45, 0, true);
    const mover = s;
    p.ctrl = ST.move(ev.seat, from, ev, {
      hop(k, n) {
        G.hops++;
        p.hopped = k;
        SL.sfx.hop(k);
        ST.popBubble(ev.seat, k, n);
        if (G.path) G.path.next = p.counting && k < ev.path.length ? k : -1;
        renderCount();
        renderHud();
        updateTurnText();
      },
      bounce() {
        G.bounces++;
        SL.sfx.bounce();
        const at = ST.sq(R.LAST);
        bursts.add('BOING!', at.x, ST.TOP + 1.6, at.z, 1.5, '#b8f5ff', '#2f7cf0');
        toast('TOO FAR! BOING!', 'hint');
      },
      climb(o) {
        G.climbs++;
        SL.sfx.climb(Math.min(12, Math.round(o.len * 2)));
        const at = ST.sq(o.from);
        bursts.add('LADDER!', at.x, ST.TOP + 1.5, at.z, 1.7, '#ffffff', ST.COL[ev.seat]);
        toast(`UP THE LADDER TO ${o.to}!`, 'save');
        mover.actor.react('cheer');
      },
      slide(o) {
        G.slides++;
        SL.sfx.slide(Math.max(0.9, o.len * 0.14));
        const at = ST.sq(o.from);
        bursts.add('WHEEE!', at.x, ST.TOP + 1.5, at.z, 1.7, '#ffe3f0', '#ff3d7f');
        toast(`WHEEE! DOWN TO ${o.to}!`, 'warn');
        mover.actor.react('oops');
      },
      plop() {
        SL.sfx.plop();
        renderHud();
      },
      top() {
        SL.sfx.top();
        const at = ST.sq(R.LAST);
        bursts.add('100!', at.x, ST.TOP + 1.8, at.z, 2.0, '#ffd400', ST.COL[ev.seat]);
        for (let k = 0; k < 10; k++) flyers.add(k % 2 ? '⭐' : '🎉', at.x, ST.TOP + 1, at.z, rand(-2.5, 2.5), rand(2, 4), 0.5, 1.1, rand(-3, 3), 5);
      },
      done() {
        ST.settle(st);
        G.pending = null;
        G.path = null;
        ST.showPath(null);
        renderCount();
        renderHud();
        if (G.state !== 'play') return;
        if (st.over) after(0.2, endGame);
        else {
          if (ev.link && ev.link.kind === 'ladder') after(0.1, () => s.actor.react('hop'));
          after(0.35, () => {
            R.next(st);
            if (st.over) endGame();
            else beginTurn();
          });
        }
      },
    }, p.counting);
    if (p.counting) p.ctrl.go();
    updateTurnText();
    return true;
  }

  // A tap (or Space) while a kid is counting: the next hop.
  function hopTap() {
    const p = G.pending;
    if (!p || !p.counting || G.state !== 'play' || G.rolling || !isHuman(cur())) return false;
    if (waitingForBuddy()) {
      toast(`${SL.buddy.entry.name} IS HELPING!`, 'hint');
      return false;
    }
    G.taps++;
    if (!p.ctrl) return startMove();
    const ok = p.ctrl.go();
    if (!ok && p.ctrl.left > 0) G.taps--; // still in the air: that tap didn't count
    return ok;
  }

  function endGame() {
    const st = G.st, w = st.winner;
    if (G.state !== 'play') return;
    if (w >= 0) G.wins[w]++;
    G.starter = R.nextSeat(st, st.starter);
    ST.dieWait(-1, false);
    ST.setTurn(-1);
    const win = G.seats.find((s) => s.seat === w);
    if (win) {
      win.actor.react('signature');
      ST.party(w, win.kid ? Kit.roster.signature(Kit.roster.get(win.id), 'hello') : 'jump');
      G.seats.forEach((s) => s !== win && setTimeout(() => s.actor.react('shrug'), 250));
      const p = win.actor.root.position;
      bursts.add('WINNER!', p.x, 4.2, p.z, 2.6, '#ffd400', '#e8372c');
      for (let i = 0; i < 12; i++) flyers.add(i % 2 ? '⭐' : '🎉', p.x, 3, p.z, rand(-2.5, 2.5), rand(2, 4), 0.6, 1.3, rand(-3, 3), 5);
      if (win.kid) {
        SL.sfx.win();
        const a = ST.toScreen(new THREE.Vector3(p.x, 2.5, p.z));
        SL.fx.overlay.burst(a.x, a.y, 70, ['⭐', '🎉', '🪜'], 1.2);
        SL.fx.overlay.rain(90);
      } else SL.sfx.lose();
    }
    G.state = 'ended';
    after(2.6, showOverPanel, false);
    renderHud();
    updateTurnText();
  }

  function showOverPanel() {
    if (G.state !== 'ended') return;
    const st = G.st, w = st.winner;
    const win = G.seats.find((s) => s.seat === w);
    // (a draw only if the rolls ever ran out: R.LIMIT, a safety net no game reaches)
    ui.oFace.innerHTML = w >= 0 ? `${faceHtml(w, 'big')}<span class="big">🏆</span>` : '<span class="big">🤝</span>';
    ui.oTitle.textContent = w >= 0 ? `${nameOf(w)} WINS!` : 'DRAW!';
    ui.oWhy.textContent = w < 0 ? '' : 'FIRST TO 100!';
    ui.oScore.innerHTML = G.seats.map((s) => `<span class="sc c${s.seat}">${faceHtml(s.seat)}<b>${G.wins[s.seat]}</b></span>`).join('');
    G.state = 'over';
    show(ui.gameOver, true);
    if (win) {
      win.actor.react('over');
      G.seats.forEach((s) => s !== win && s.actor.react('sulk'));
      if (win.kid) SL.fx.overlay.rain(120);
    }
  }

  function again() {
    gesture();
    if (G.state === 'over' || G.state === 'ended') newGame();
  }

  function restartGame() {
    if (!['play', 'paused', 'ended', 'over'].includes(G.state)) return;
    if (G.state === 'paused') G.state = G.pausedFrom === 'play' ? 'play' : G.pausedFrom;
    show(ui.pause, false);
    newGame();
    toast('🔄', 'hint');
  }

  // ---------------------------------------------------------------- home

  function goHome() {
    G.state = 'home';
    document.body.dataset.screen = 'home';
    show(ui.hud, false);
    show(ui.tools, false);
    show(ui.callBtn, false);
    show(ui.gameOver, false);
    show(ui.pause, false);
    show(ui.rules, false);
    show(ui.count, false);
    show(ui.home, true);
    SL.buddy.reset();
    SL.highFive.cancel();
    ST.hint(null);
    ST.showPath(null);
    clearToasts();
    SL.fx.overlay.clear();
    G.jobs = [];
    G.rolling = false;
    G.pending = null;
    G.seats = SEATS.map((s) => Object.assign({}, s));
    setActors(true);
    layout();
    G.seats.forEach((s) => s.actor.react('hello'));
    refreshHome();
    demoStart();
    S.music('title');
  }

  // the board plays itself behind the menu: all four, quickly, on the board picked
  function demoStart() {
    const st = R.newGame({ seats: [0, 1, 2, 3], starter: Math.floor(Math.random() * 4), board: prefs.level });
    G.demo = { st, t: 1.2, end: -1 };
    ST.set(st);
    ST.setTurn(st.turn);
    ST.dieWait(st.turn, false);
  }
  function demoUpdate(dt) {
    const d = G.demo;
    if (!d || ST.busy()) return;
    if (d.end >= 0) {
      d.end -= dt;
      if (d.end < 0) demoStart();
      return;
    }
    d.t -= dt;
    if (d.t > 0) return;
    const st = d.st;
    d.t = 9; // until the die lands
    ST.roll(1 + Math.floor(Math.random() * 6), st.turn, (v) => {
      if (G.demo !== d || G.state !== 'home') return;
      R.roll(st, v);
      const from = st.pos[st.turn];
      const ev = R.play(st);
      ST.move(ev.seat, from, ev, {
        climb() {
          const m = G.seats.find((s) => s.seat === ev.seat);
          if (m) m.actor.react('cheer');
        },
        done() {
          if (G.demo !== d) return;
          ST.settle(st);
          if (st.over) {
            d.end = 3;
            ST.party(st.winner, 'jump');
            const w = G.seats.find((s) => s.seat === st.winner);
            if (w) w.actor.react('signature');
            return;
          }
          R.next(st);
          d.t = 0.4;
          ST.setTurn(st.turn);
          ST.dieWait(st.turn, false);
        },
      });
    });
  }

  function refreshHome() {
    const seg = (el, v) => {
      for (const b of el.children) {
        const on = b.dataset.v === String(v);
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
        b.setAttribute('role', 'radio');
      }
    };
    for (const b of ui.segSeats.children) {
      const k = +b.dataset.v;
      b.classList.toggle('on', prefs.on[k]);
      b.setAttribute('aria-pressed', prefs.on[k]);
    }
    seg(ui.segLevel, prefs.level);
    const cb = ui.segCount.children[0];
    cb.classList.toggle('on', !!prefs.count);
    cb.setAttribute('aria-pressed', !!prefs.count);
    ui.playCount.textContent = seatsOn().length;
  }

  function toggleSeat(k) {
    gesture();
    const on = prefs.on.slice();
    on[k] = !on[k];
    const n = on.filter(Boolean).length, kids = SEATS.filter((s, j) => on[j] && s.kid).length;
    if (n < 2 || !kids) {
      SL.sfx.nope();
      toast(n < 2 ? 'AT LEAST 2 PLAYERS!' : 'TEDDY OR TOMMY HAS TO PLAY!', 'hint');
      const b = ui.segSeats.children[[2, 1, 0, 3].indexOf(k)];
      if (b) {
        b.classList.remove('shake');
        void b.offsetWidth;
        b.classList.add('shake');
      }
      return false;
    }
    prefs.on = on;
    save();
    refreshHome();
    SL.sfx.kit('click');
    if (on[k]) actors[k].react('hello');
    return true;
  }

  function setPref(k, v) {
    gesture();
    const was = prefs[k];
    prefs[k] = v;
    save();
    refreshHome();
    SL.sfx.kit('click');
    if (k === 'level' && was !== v && G.state === 'home') demoStart(); // the new board, straight away
  }

  // ---------------------------------------------------------------- the rules screen

  function openRules() {
    gesture();
    if (G.state === 'rules') return;
    G.rulesFrom = G.state;
    if (G.state === 'paused') show(ui.pause, false);
    G.state = 'rules';
    show(ui.rules, true);
    ui.rules.querySelector('.panel').scrollTop = 0;
    SL.sfx.kit('click');
  }
  function closeRules() {
    if (G.state !== 'rules') return;
    show(ui.rules, false);
    G.state = G.rulesFrom || 'home';
    if (G.state === 'paused') show(ui.pause, true);
    G.rulesFrom = null;
    SL.sfx.kit('click');
  }

  // ---------------------------------------------------------------- HUD

  function faceHtml(k, cls = '') {
    const s = SEATS[k];
    return s.kid ? `<img alt="" class="face c${k} ${cls}" src="${art[s.id]}">` : `<span class="face emo c${k} ${cls}">${s.emoji}</span>`;
  }

  function setupHud() {
    ui.score.innerHTML = G.seats.map((s) => `<div class="side c${s.seat}" data-seat="${s.seat}">${faceHtml(s.seat)}<b>0</b><i class="wins"></i></div>`).join('');
    const kids = kidsIn();
    if (kids.length === 1) {
      const bud = SL.buddy.entry;
      ui.callBtn.innerHTML = `<img alt="" src="${art[bud.id]}"><kbd>T</kbd>`;
      const nice = bud.name[0] + bud.name.slice(1).toLowerCase();
      ui.callBtn.title = `Call ${nice} (T)`;
      ui.callBtn.setAttribute('aria-label', `Call ${nice}`);
    } else {
      ui.callBtn.innerHTML = '🙌<kbd>T</kbd>';
      ui.callBtn.title = 'High five! (T)';
      ui.callBtn.setAttribute('aria-label', 'High five!');
    }
  }

  // the square each pawn is on right now (counting up as it hops), and the wins so far
  function renderHud() {
    if (!ui || !G.st || G.state === 'home') return;
    const st = G.st;
    for (const el of ui.score.children) {
      const k = +el.dataset.seat;
      const pw = ST.pawn(k);
      setText(el.querySelector('b'), 'sq' + k, String(pw ? pw.square : st.pos[k]));
      const w = el.querySelector('.wins');
      setText(w, 'w' + k, G.wins[k] ? `🏆${G.wins[k]}` : '');
      w.classList.toggle('off', !G.wins[k]);
      el.classList.toggle('now', !st.over && st.turn === k && G.state === 'play');
    }
  }

  // the counting row: one bubble per hop, filled as the pawn hops (1, 2, 3...)
  function renderCount() {
    const p = G.pending;
    const on = !!p && G.state === 'play';
    if (on) {
      const n = p.ev.path.length, key = `${G.turnId}:${p.seat}:${n}:${G.rerolls}`;
      if (ui.count.dataset.key !== key) {
        ui.count.dataset.key = key;
        ui.count.innerHTML = Array.from({ length: n }, (x, j) => `<i>${j + 1}</i>`).join('');
      }
      ui.count.className = `count c${p.seat}`;
      [...ui.count.children].forEach((el, j) => {
        el.classList.toggle('in', j < p.hopped);
        el.classList.toggle('next', p.counting && j === p.hopped);
      });
    }
    show(ui.count, on);
  }

  const cache = {};
  function setText(el, key, v) {
    if (cache[key] !== v || el.textContent !== v) {
      cache[key] = v;
      el.textContent = v;
    }
  }

  function updateTurnText() {
    if (!G.st || !ui || G.state === 'home') return;
    const st = G.st, s = cur();
    let text = '', mine = false;
    const who = kidsIn().length > 1 ? `${s.name}: ` : '';
    const p = G.pending;
    if (G.state === 'ended' || G.state === 'over' || st.over) text = st.winner >= 0 ? `${nameOf(st.winner)} WINS!` : '';
    else if (!isHuman(s)) text = `${s.name}'S TURN…`;
    else if (p && !p.ctrl && waitingForBuddy()) text = `${SL.buddy.entry.name} IS HELPING…`;
    else if (G.rolling) text = `${s.name}'S TURN…`;
    else if (st.phase === 'roll') {
      text = `${who}TAP THE DIE!`;
      mine = true;
    } else if (p && p.counting && (!p.ctrl || p.ctrl.left > 0)) {
      text = `${who}TAP TO HOP!`;
      mine = true;
    } else text = `${s.name}'S TURN…`;
    setText(ui.turn, 'turn', text);
    ui.turn.classList.toggle('mine', mine);
    ui.turn.className = ui.turn.className.replace(/\bc\d\b/g, '').trim() + ` c${s.seat}`;
  }

  function toast(text, cls) {
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = text;
    ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), /save/.test(cls || '') ? 2850 : 1950);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
  }
  function clearToasts() {
    if (ui) ui.toasts.innerHTML = '';
  }

  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }

  // ---------------------------------------------------------------- your brother and the high five

  function call() {
    gesture();
    if (!['play', 'ended', 'over'].includes(G.state)) return 'none';
    const kids = kidsIn();
    if (kids.length > 1) return SL.highFive.start();
    const r = SL.buddy.call();
    updateTurnText();
    return r;
  }

  const buddyApi = {
    toast: (t, c) => toast(t, c),
    player: () => kidsIn()[0].actor,
    spot: () => spots.buddy,
    scale: () => SCALE,
    // what he can do now: point at the die before you roll, re-roll it once you have (before you hop)
    state() {
      const s = cur();
      if (G.state !== 'play' || !G.st || G.st.over || !isHuman(s) || G.rolling) return null;
      if (G.st.phase === 'roll' && !G.pending && !ST.busy() && !G.jobs.length) return { what: 'roll', key: `${G.turnId}` };
      if (G.pending && !G.pending.ctrl) return { what: 'reroll', key: `${G.turnId}` };
      return null;
    },
    reroll: () => reroll(),
    hintDie: () => ST.hint({ die: true }),
    diePos: () => new THREE.Vector3(ST.DIE_AT.x, ST.TOP + ST.DIE / 2, ST.DIE_AT.z),
    clearHint: () => ST.hint(null),
    roundOver: () => G.state !== 'play' || (G.st && G.st.over),
    players: () => {
      const k = kidsIn();
      return [k[0].actor, k[1].actor];
    },
    meet: () => {
      const k = kidsIn();
      return spots.seats[k[0].seat].x < spots.seats[k[1].seat].x ? spots.meet : [spots.meet[1], spots.meet[0]];
    },
    homes: () => kidsIn().map((s) => spots.seats[s.seat]),
    get flyers() { return flyers; },
  };

  // ---------------------------------------------------------------- input

  let audioReady = false;
  function gesture() {
    if (!audioReady) {
      audioReady = true;
      S.init();
      S.music('title');
    } else S.init();
  }

  // Space, Enter or a tap: roll the die, or hop (counting)
  function act() {
    if (G.state !== 'play') return false;
    const s = cur();
    if (!isHuman(s)) return false;
    if (canRoll()) return rollDie(true);
    if (G.pending && G.pending.counting) return hopTap();
    return false;
  }

  function bindInput() {
    ui.canvas.addEventListener('pointerdown', (e) => {
      gesture();
      if (G.state !== 'play') return;
      // any tap on the board does it: there's nothing else to choose in snakes and ladders
      if (!act() && isHuman(cur()) && G.st.phase === 'roll' && !G.rolling) ST.dieWait(cur().seat, true);
    });
    ui.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const s = cur();
      const on = G.state === 'play' && isHuman(s) && (canRoll() || (G.pending && G.pending.counting));
      ui.canvas.style.cursor = on ? 'pointer' : '';
    });
    const tap = (el, fn) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      gesture();
      fn();
    });
    tap(ui.goPlay, () => startGame({}));
    tap(ui.goRules, openRules);
    for (const b of ui.segSeats.children) tap(b, () => toggleSeat(+b.dataset.v));
    for (const b of ui.segLevel.children) tap(b, () => setPref('level', b.dataset.v));
    tap(ui.segCount.children[0], () => setPref('count', !prefs.count));
    ui.callBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      call();
    });
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.rulesBtn, openRules);
    tap(ui.countBtn, () => {
      prefs.count = !prefs.count;
      save();
      refreshCountBtn();
      if (G.pending && !G.pending.ctrl && isHuman(cur())) {
        G.pending.counting = prefs.count;
        if (G.path) G.path.next = prefs.count ? 0 : -1;
        G.pending.readyAt = G.time + 0.3;
      }
      renderCount();
      updateTurnText();
      toast(prefs.count ? '🔢 COUNT HOPS: ON' : '🔢 COUNT HOPS: OFF', 'hint');
    });
    tap(ui.rulesOk, closeRules);
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, restartGame);
    tap(ui.pRules, openRules);
    tap(ui.pHome, goHome);
    tap(ui.oAgain, again);
    tap(ui.oHome, goHome);
    tap(ui.muteBtn, toggleMute);
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      gesture();
      const k = e.key.toLowerCase();
      const pad = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      const digit = pad ? +pad[1] : /^[1-4]$/.test(e.key) ? +e.key : 0;
      if (k === 'm') return toggleMute();
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      if (G.state === 'rules') {
        if (k === 'escape' || k === 'enter' || k === ' ' || k === 'h') closeRules();
        return;
      }
      if (G.state === 'home') {
        if (k === 'enter' || k === ' ') startGame({});
        else if (k === 'h') openRules();
        else if (digit) toggleSeat([2, 1, 0, 3][digit - 1]);
        else if (k === 'l') setPref('level', prefs.level === 'easy' ? 'normal' : 'easy');
        else if (k === 'c') setPref('count', !prefs.count);
        return;
      }
      if (k === 't') return call();
      if (k === 'h') return openRules();
      if (G.state === 'paused') {
        if (k === 'escape' || k === 'p' || k === 'enter' || k === ' ') pause(false);
        else if (k === 'r') restartGame();
        return;
      }
      if (G.state === 'over' || G.state === 'ended') {
        if ((k === 'enter' || k === ' ') && G.state === 'over') again();
        else if (k === 'escape') goHome();
        else if (k === 'r') again();
        return;
      }
      if (k === 'p' || k === 'escape') return pause(true);
      if (k === 'r') return restartGame();
      if (k === 'c') return ui.countBtn.click();
      if (k === 'enter' || k === ' ') act();
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
  }
  function refreshCountBtn() {
    ui.countBtn.classList.toggle('on', !!prefs.count);
    ui.countBtn.setAttribute('aria-pressed', !!prefs.count);
  }

  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'ended' || G.state === 'over')) {
      G.pausedFrom = G.state;
      G.state = 'paused';
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = G.pausedFrom || 'play';
      show(ui.pause, false);
      S.music('title');
    }
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop

  const tmp = new THREE.Vector3();
  function runJobs(dt) {
    if (!G.jobs.length) return;
    const busy = ST.busy();
    const due = [];
    G.jobs = G.jobs.filter((j) => {
      if (j.idle && busy) return true;
      j.t -= dt;
      if (j.t > 0) return true;
      due.push(j);
      return false;
    });
    for (const j of due) j.fn();
  }

  // a pending move that goes by itself (a CPU friend, or a kid with counting off) starts once it's time and nobody's
  // waiting for your brother's re-roll
  function runPending() {
    const p = G.pending;
    if (!p || p.ctrl || p.counting || G.rolling || G.time < p.readyAt || waitingForBuddy()) return;
    startMove();
  }

  let lastWait = null;
  function step(dt) {
    dt = Math.min(dt, 0.1);
    if ((innerWidth || 1) !== ST.W || (innerHeight || 1) !== ST.H) layout();
    const running = !['paused', 'boot', 'rules'].includes(G.state);
    if (running) {
      G.time += dt;
      if (G.state === 'home') demoUpdate(dt);
      if (G.state === 'play' || G.state === 'ended') {
        runJobs(dt);
        if (G.state === 'play') runPending();
      }
      ST.update(dt);
      flyers.update(dt);
      bursts.update(dt);
      for (const a of actors) if (a.visible) a.update(dt);
      SL.buddy.update(dt);
      SL.highFive.update(dt);
      const w = waitingForBuddy();
      if (w !== lastWait) {
        lastWait = w;
        updateTurnText();
      }
    }
    // the 🎲 badge over whoever's turn it is
    const st = G.state === 'home' ? G.demo && G.demo.st : G.st;
    for (let k = 0; k < 4; k++) {
      const on = !!st && !st.over && st.turn === k && actors[k].visible;
      badges[k].visible = on;
      if (on) {
        actors[k].root.getWorldPosition(tmp);
        const top = SEATS[k].kid ? 2 * SCALE + 0.55 : 4.6;
        badges[k].position.set(tmp.x, top + Math.abs(Math.sin(performance.now() / 260)) * 0.2, tmp.z);
      }
    }
    SL.fx.overlay.update(dt);
    ui.callBtn.classList.toggle('here', SL.buddy.on || SL.highFive.on);
    ST.render();
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    ui = {
      canvas: $('game'), home: $('home'), hud: $('hud'), hudtop: document.querySelector('.hudtop'), logo: $('logo'), tools: $('tools'),
      goPlay: $('goPlay'), goRules: $('goRules'), segSeats: $('segSeats'), segLevel: $('segLevel'), segCount: $('segCount'),
      playCount: $('playCount'), pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'), score: $('score'), turn: $('turn'), count: $('count'),
      countBtn: $('countBtn'), rulesBtn: $('rulesBtn'), callBtn: $('callBtn'), toasts: $('toasts'), gameOver: $('gameOver'), oFace: $('oFace'),
      oTitle: $('oTitle'), oWhy: $('oWhy'), oScore: $('oScore'), oAgain: $('oAgain'), oHome: $('oHome'), pause: $('pause'), pResume: $('pResume'),
      pRestart: $('pRestart'), pRules: $('pRules'), pHome: $('pHome'), rules: $('rules'), rulesOk: $('rulesOk'),
    };
    // the logo: the first word small on top, the rest big ("TT" / "Snakes & Ladders")
    const words = window.SL_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.length > 1 ? words[0] : '';
    ui.logo.querySelector('big').textContent = words.length > 1 ? words.slice(1).join(' ') : words[0];
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    ST.init(ui.canvas);
    SL.fx.overlay.init($('fx'));
    flyers = SL.fx.flyers(ST.scene, 90);
    bursts = SL.fx.bursts(ST.scene, 8);
    ST.useFx(flyers, bursts);
    ST.setBoard(prefs.level);
    // the seats' characters beside the board (the boys, and the CPU friends on podiums), and the pawns on it
    for (const s of SEATS) {
      const a = s.kid ? SL.makeActor() : SL.makePilot(s.id, s.emoji, s.name, ST.COL[s.seat]);
      a.attach(ST.scene, flyers);
      if (s.kid) a.set(s.id, SCALE);
      actors[s.seat] = a;
      ST.makePawn(s.seat, s.kid, s.kid ? Kit.roster.get(s.id).look : null, s.emoji);
      badges[s.seat] = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(s.seat), depthTest: false, transparent: true }));
      badges[s.seat].renderOrder = 23;
      badges[s.seat].scale.setScalar(0.85);
      ST.scene.add(badges[s.seat]);
    }
    art = Kit.portraits(['teddy', 'tommy'].map((id) => Kit.roster.get(id)), { size: 160 });
    for (const b of ui.segSeats.children) {
      const img = b.querySelector('img');
      if (img) img.src = art[SEATS[+b.dataset.v].id];
    }
    SL.buddy.init(buddyApi);
    bindInput();
    refreshCountBtn();
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  window.game = {
    // advance `secs` of game time in 1/60 s steps, rendering once at the end (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    // start({ seats: [1, 2] (0 red Foxy, 1 yellow Tommy, 2 blue Teddy, 3 green Froggy), level: 'easy' | 'normal', count })
    start(opts = {}) {
      startGame(opts);
      return game.info();
    },
    home: () => goHome(),
    dice: (...v) => G.nextDice.push(...v),   // the next rolls (your brother's re-roll takes one too)
    roll: () => rollDie(true),
    hop: () => hopTap(),                     // one counting hop
    act: () => act(),                        // what Space does
    tapDie() {
      const a = ST.toScreen(ST.dieMesh.position);
      ui.canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: a.x, clientY: a.y, bubbles: true }));
      return game.info();
    },
    key: (k, code) => dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || '' })),
    call: () => call(),
    pause: (on = true) => pause(on),
    rules: (on = true) => (on ? openRules() : closeRules()),
    again: () => again(),
    restart: () => restartGame(),
    seat: (k) => toggleSeat(k),
    // let a test bot play the kids' seats too (they roll by themselves and never count)
    auto(on = true) {
      G.auto = on;
      if (G.state !== 'play') return;
      if (on && canRoll()) after(0.2, () => rollDie(false));
      if (on && G.pending) {
        G.pending.counting = false;
        if (G.path) G.path.next = -1;
      }
    },
    // put the pawns on squares { seat: square } for screenshots and tests; whose turn
    setup(pos, turn = G.st.turn) {
      const st = G.st;
      for (const s of st.seats) st.pos[s] = pos[s] !== undefined ? pos[s] : st.pos[s];
      Object.assign(st, { turn, phase: 'roll', die: 0, over: false, winner: -1 });
      Object.assign(G, { jobs: [], rolling: false, pending: null, path: null, state: 'play' });
      show(ui.gameOver, false);
      ST.set(st);
      beginTurn();
      return game.info();
    },
    check: (opts = {}) => SL.check(Object.assign({ games: 10 }, opts)),
    checkRules: () => SL.checkRules(),
    // the board on the screen matches the rules: every ladder and slide where its squares are, pawns where they stand
    checkBoard() {
      const out = [];
      const L = ST.links(), B = R.BOARDS[ST.board];
      const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < 0.05;
      out.push({ name: 'every ladder on the screen goes from its foot to its top', ok: B.ladders.length === Object.keys(L.ladders).length && B.ladders.every(([a, z]) => L.ladders[a] && near(L.ladders[a].a, ST.sq(a)) && near(L.ladders[a].b, ST.sq(z))) });
      out.push({ name: 'every slide on the screen goes from its head to its tail', ok: B.slides.length === Object.keys(L.slides).length && B.slides.every(([a, z]) => L.slides[a] && near(L.slides[a].curve.getPointAt(0), ST.sq(a)) && near(L.slides[a].curve.getPointAt(1), ST.sq(z)) && near(L.slides[a].head.position, ST.sq(a))) });
      let order = true;
      for (let n = 2; n <= 100; n++) if (Math.abs(ST.sq(n).x - ST.sq(n - 1).x) + Math.abs(ST.sq(n).z - ST.sq(n - 1).z) !== 1) order = false;
      out.push({ name: 'the squares on the screen: each one next to the one before', ok: order && ST.sq(1).x < ST.sq(10).x && ST.sq(100).z < ST.sq(1).z });
      if (G.st) {
        const ok = G.st.seats.every((s) => ST.pawn(s).square === G.st.pos[s] || G.pending);
        out.push({ name: 'every pawn is on its square', ok });
      }
      return { ok: out.every((x) => x.ok), board: ST.board, checks: out };
    },
    info() {
      const st = G.st;
      const p = G.pending;
      return {
        state: G.state, level: G.level, seats: G.seats.map((s) => s.seat), turn: st && st.turn, phase: st && st.phase, die: st && st.die,
        pos: st && Object.assign({}, st.pos), squares: G.seats.map((s) => ST.pawn(s.seat).square), over: st && st.over, winner: st && st.winner,
        wins: G.wins.slice(), pending: p ? { seat: p.seat, path: p.ev.path.slice(), to: p.ev.to, counting: p.counting, started: !!p.ctrl, hopped: p.hopped, left: p.ctrl ? p.ctrl.left : p.ev.path.length } : null,
        busy: ST.busy(), rolling: G.rolling, jobs: G.jobs.length, rolls: st && st.rolls, hops: G.hops, climbs: G.climbs, slides: G.slides, bounces: G.bounces,
        taps: G.taps, rerolls: G.rerolls, buddy: SL.buddy.info(), hint: ST.hintNow && Object.assign({}, ST.hintNow), waitingForBuddy: waitingForBuddy(),
        panel: !ui.gameOver.classList.contains('hidden') ? 'over' : null, rules: !ui.rules.classList.contains('hidden'), prefs: JSON.parse(JSON.stringify(prefs)),
        wide: G.wide, turnText: ui.turn.textContent, count: ui.count.classList.contains('hidden') ? null : ui.count.textContent, board: ST.board,
      };
    },
    get G() { return G; },
    get R() { return R; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
