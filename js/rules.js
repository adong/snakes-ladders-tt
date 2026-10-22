/* TT Snakes & Ladders: the board and the rules, with no drawing (js/check.js and tools/check.js run it headless).
   The board is 10 x 10 squares, 1 to 100, back and forth from the bottom left: row 0 goes left to right (1 - 10),
   row 1 right to left (11 - 20), and so on up to 100 at the top left. Every pawn waits on START (square 0).
     - Roll the die and hop that many squares, counting.
     - Stop at the foot of a ladder: climb it. Stop on a friendly slide's head (the snakes): slide down to its tail.
     - The exact finish: you need the exact roll to land on 100. Too far bounces back off 100 (97 + 6: 98, 99, 100,
       99, 98, 97), and a ladder or a slide where you bounce back to still counts.
     - The first pawn on 100 wins. Turns go round the table; pawns can share a square.
   Two boards: 🐣 EASY (more ladders, a few short slides, none in the top row) and 🔥 NORMAL (longer slides).
   SL.rules.lucky(st) is your brother's re-roll: the die values that take you furthest (see js/buddy.js). */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const SL = (root.SL = root.SL || {});

  const START = 0, LAST = 100, SIDES = 6;
  const LIMIT = 4000; // a safety net on the number of rolls in a game (no real game gets near it)
  // SL.rules.bug: a test-only switch that breaks one rule on purpose, so the check (js/check.js) can prove it fails
  const bug = (name) => SL.rules && SL.rules.bug === name;

  // the boards: [from, to] pairs. A ladder goes up, a slide (a friendly snake) goes down.
  const BOARDS = {
    easy: {
      ladders: [[3, 22], [6, 25], [11, 28], [20, 41], [27, 56], [36, 57], [43, 64], [51, 72], [63, 81], [71, 92], [78, 97]],
      slides: [[17, 7], [39, 23], [54, 46], [69, 52], [87, 76]],
    },
    normal: {
      ladders: [[3, 22], [8, 30], [20, 41], [28, 55], [36, 57], [51, 72], [63, 81], [71, 92]],
      slides: [[17, 4], [32, 10], [48, 26], [62, 19], [66, 45], [87, 54], [93, 73], [98, 79]],
    },
  };

  // square n (1 - 100) to its column (0 - 9, left to right) and row (0 - 9, bottom to top); START is just below 1
  function cell(n) {
    if (n <= 0) return [0, -1];
    const r = Math.floor((n - 1) / 10);
    let c = (n - 1) % 10;
    if (r % 2 && !bug('cell')) c = 9 - c;
    return [c, r];
  }

  // { from: { to, kind: 'ladder' | 'slide' } } for a board
  function linksOf(board) {
    const b = typeof board === 'string' ? BOARDS[board] : board;
    const out = {};
    if (!bug('noladders')) for (const [a, z] of b.ladders) out[a] = { from: a, to: z, kind: 'ladder' };
    if (!bug('noslides')) for (const [a, z] of b.slides) out[a] = { from: a, to: z, kind: 'slide' };
    if (bug('chain')) out[b.ladders[0][1]] = { from: b.ladders[0][1], to: 2, kind: 'slide' };
    return out;
  }

  // ---------------------------------------------------------------- a game

  // newGame({ seats: [1, 2], starter: 2, board: 'easy' })
  function newGame(o = {}) {
    const seats = (o.seats || [1, 2]).slice();
    const board = o.board === 'normal' ? 'normal' : 'easy';
    const starter = seats.includes(o.starter) ? o.starter : seats[0];
    const pos = {};
    for (const s of seats) pos[s] = START;
    return {
      seats, board, links: linksOf(board), pos, turn: starter, starter, phase: 'roll', die: 0, rolls: 0, turns: 0,
      over: false, winner: -1, last: null, rerolls: 0,
    };
  }

  // The hops for a roll of d from square `from`: every square in order, bouncing back off 100 when it's too far.
  function hops(from, d) {
    if (bug('stay') && from + d > LAST) return { path: [], landed: from, bounced: false };
    if (bug('overshoot') && from + d > LAST) d = LAST - from;
    const path = [];
    let p = from, dir = 1, bounced = false;
    for (let i = 0; i < d; i++) {
      if (p === LAST) {
        dir = -1;
        bounced = true;
      }
      p += dir;
      path.push(p);
    }
    return { path, landed: p, bounced };
  }

  // What a roll of d does for a pawn on `from`: the hops, then the ladder or slide where it lands.
  function resolve(st, from, d) {
    const h = hops(from, d);
    const link = st.links[h.landed] || null;
    const to = link ? link.to : h.landed;
    return { from, die: d, path: h.path, landed: h.landed, bounced: h.bounced, link, to, finished: to === LAST };
  }

  // The die lands on v: the pawn whose turn it is will move.
  function roll(st, v) {
    if (st.over || st.phase !== 'roll') return null;
    st.die = v;
    st.rolls++;
    st.phase = 'move';
    return resolve(st, st.pos[st.turn], v);
  }

  // Your brother's re-roll: the die shows w instead (the same pawn, before it has moved).
  function reroll(st, w) {
    if (st.over || st.phase !== 'move') return null;
    st.die = w;
    st.rerolls++;
    return resolve(st, st.pos[st.turn], w);
  }

  // Move the pawn whose turn it is by the die. Returns the event (see resolve) with the seat.
  function play(st) {
    if (st.over || st.phase !== 'move') return null;
    const seat = st.turn;
    const ev = Object.assign(resolve(st, st.pos[seat], st.die), { seat });
    if (bug('stuck') && ev.from >= 95) Object.assign(ev, { path: [], landed: ev.from, link: null, to: ev.from, finished: false });
    st.pos[seat] = ev.to;
    st.last = ev;
    st.phase = 'done';
    if (ev.finished) {
      st.over = true;
      st.winner = seat;
    }
    return ev;
  }

  const nextSeat = (st, s) => st.seats[(st.seats.indexOf(s) + 1) % st.seats.length];

  // the next player's turn (after the move has been shown)
  function next(st) {
    if (st.over) return;
    st.turn = nextSeat(st, st.turn);
    if (bug('skip') && st.seats.length > 2) st.turn = nextSeat(st, st.turn);
    st.turns++;
    st.phase = 'roll';
    st.die = 0;
    if (st.rolls >= LIMIT) {
      st.over = true; // a draw: a safety net no game reaches
      st.winner = -1;
    }
  }

  // The die values that take the pawn whose turn it is furthest (your brother's lucky re-roll), and how far each goes.
  function lucky(st) {
    const from = st.pos[st.turn];
    const ends = [];
    for (let d = 1; d <= SIDES; d++) ends.push(resolve(st, from, d).to);
    const best = Math.max(...ends);
    return { best, values: ends.map((e, i) => (e === best ? i + 1 : 0)).filter(Boolean), ends };
  }

  const clone = (st) => JSON.parse(JSON.stringify(st));

  SL.rules = { bug: '', BOARDS, START, LAST, SIDES, LIMIT, cell, linksOf, newGame, hops, resolve, roll, reroll, play, next, nextSeat, lucky, clone };
})();
