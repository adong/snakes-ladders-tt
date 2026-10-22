/* TT Snakes & Ladders: the headless checks (game.check() in the page, node tools/check.js in a terminal).
     1. every square's links, on both boards: 100 squares back and forth, each next to the one before; every ladder
        goes up and every slide goes down, none starts on 1 or touches 100, no square starts two, none ends where
        another starts; and for every square (START to 99) and every roll (1 - 6), the game's move matches the
        check's own sum (hops, bounce, ladder or slide), worked out here from the board lists, not by the game
     2. the exact finish: only the exact roll wins, too far bounces back off 100 (and a ladder or slide where it lands
        still counts), the winner is the pawn on 100, and nothing moves after a win; turns go round the table; your
        brother's lucky re-roll is never worse than any other roll
     3. games end: CPU games with 2, 3 and 4 players on both boards, every move checked by the check's own sum, and
        every game must end with a winner on 100 (the EASY board must be the shorter one)
   check({ sabotage }) breaks one rule first (SL.rules.bug), to prove the check can fail. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const SL = (root.SL = root.SL || {});
  const R = SL.rules;
  const SABOTAGES = ['noladders', 'noslides', 'chain', 'overshoot', 'stay', 'stuck', 'cell', 'skip'];

  // a seeded random, so a run can be repeated
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // the check's own sum: where a roll of d from `from` ends on a board (straight from the board's lists)
  function expected(board, from, d) {
    let t = from + d;
    const bounced = t > 100;
    if (bounced) t = 200 - t;
    let to = t;
    for (const [a, z] of R.BOARDS[board].ladders) if (a === t) to = z;
    for (const [a, z] of R.BOARDS[board].slides) if (a === t) to = z;
    return { landed: t, to, bounced, finished: to === 100 };
  }

  // ---------------------------------------------------------------- 1 and 2. the board and the rules

  function rules() {
    const out = [];
    const t = (name, ok) => out.push({ name, ok: !!ok });

    // 100 squares, back and forth
    const cells = [];
    for (let n = 1; n <= 100; n++) cells.push(R.cell(n));
    t('board: 100 different squares on a 10 x 10 grid', new Set(cells.map((c) => c.join(','))).size === 100 && cells.every(([c, r]) => c >= 0 && c <= 9 && r >= 0 && r <= 9));
    t('board: every square is next to the one before', cells.every((c, i) => i === 0 || Math.abs(c[0] - cells[i - 1][0]) + Math.abs(c[1] - cells[i - 1][1]) === 1));
    t('board: 1 bottom left, 10 bottom right, 11 above 10, 100 top left', [1, 10, 11, 100].map((n) => R.cell(n).join()).join(' ') === '0,0 9,0 9,1 0,9');
    t('board: every row goes the other way to the one below', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((r) => (R.cell(r * 10 + 2)[0] - R.cell(r * 10 + 1)[0]) === (r % 2 ? -1 : 1)));

    for (const board of ['easy', 'normal']) {
      const B = R.BOARDS[board], L = R.linksOf(board);
      const all = B.ladders.map((x) => x.concat('ladder')).concat(B.slides.map((x) => x.concat('slide')));
      const starts = all.map((x) => x[0]), ends = all.map((x) => x[1]);
      t(`${board}: every ladder goes up, every slide goes down`, B.ladders.every(([a, z]) => z > a) && B.slides.every(([a, z]) => z < a));
      t(`${board}: no link starts on 1 or touches 100`, all.every(([a, z]) => a > 1 && a < 100 && z >= 1 && z < 100));
      t(`${board}: no square starts two links`, new Set(starts).size === starts.length);
      t(`${board}: no link ends where another starts (no chains)`, ends.every((z) => !starts.includes(z)) && Object.values(L).every((l) => !L[l.to]));
      t(`${board}: the game's links are the board's links`, Object.keys(L).length === all.length && all.every(([a, z, k]) => L[a] && L[a].to === z && L[a].kind === k));
      // every square's links: every square, every roll
      let same = true, first = '';
      const st = R.newGame({ seats: [1, 2], board });
      for (let s = 0; s < 100; s++) {
        for (let d = 1; d <= 6; d++) {
          const ev = R.resolve(st, s, d), want = expected(board, s, d);
          const hopsOk = ev.path.length === d && ev.path.every((p, i) => Math.abs(p - (i ? ev.path[i - 1] : s)) === 1 && p >= 1 && p <= 100);
          if (!(hopsOk && ev.landed === want.landed && ev.to === want.to && ev.bounced === want.bounced && ev.finished === want.finished)) {
            same = false;
            first = first || `${s}+${d}`;
          }
        }
      }
      t(`${board}: every square, every roll: hops, bounce, ladder and slide as the check works it out${first ? ' (first wrong: ' + first + ')' : ''}`, same);
    }
    const drop = (b) => R.BOARDS[b].slides.reduce((n, [a, z]) => n + a - z, 0);
    t('boards: EASY has more ladders and fewer, shorter slides than NORMAL, and none in its top row', R.BOARDS.easy.ladders.length > R.BOARDS.normal.ladders.length &&
      R.BOARDS.easy.slides.length < R.BOARDS.normal.slides.length && drop('easy') < drop('normal') && R.BOARDS.easy.slides.every(([a]) => a <= 90));

    // the exact finish
    const g = (pos, turn = 1, board = 'normal', seats = [1, 2]) => {
      const st = R.newGame({ seats, board, starter: turn });
      Object.assign(st.pos, pos);
      return st;
    };
    let st = g({ 1: 94 });
    R.roll(st, 6);
    let ev = R.play(st);
    t('exact finish: 94 + 6 lands on 100 and wins', ev && ev.finished && st.over && st.winner === 1 && st.pos[1] === 100);
    st = g({ 2: 99 }, 2);
    R.roll(st, 1);
    ev = R.play(st);
    t('exact finish: 99 + 1 wins', ev && ev.finished && st.winner === 2);
    st = g({ 1: 97 }, 1, 'easy');
    R.roll(st, 6);
    ev = R.play(st);
    t('too far bounces back: 97 + 6 hops 98, 99, 100, 99, 98, 97 and does not win', ev && ev.path.join() === '98,99,100,99,98,97' && ev.bounced && !ev.finished && !st.over && st.pos[1] === 97);
    st = g({ 1: 96 });
    R.roll(st, 6);
    ev = R.play(st);
    t('a bounce onto a slide slides: 96 + 6 bounces to 98, the NORMAL slide to 79', ev && ev.landed === 98 && ev.link && ev.link.kind === 'slide' && st.pos[1] === 79);
    let never = true;
    for (const board of ['easy', 'normal']) {
      for (let s = 94; s < 100; s++) {
        for (let d = 1; d <= 6; d++) {
          const e = R.resolve(g({}, 1, board), s, d);
          if (e.finished !== (s + d === 100)) never = false;
        }
      }
    }
    t('exact finish: from 94 - 99 only the exact roll wins, on both boards', never);
    st = g({ 1: 99 });
    R.roll(st, 1);
    R.play(st);
    t('after a win: no more rolls or moves', R.roll(st, 3) === null && R.play(st) === null && st.pos[2] === 0);

    // turns and START
    st = R.newGame({ seats: [0, 1, 2, 3], board: 'easy', starter: 2 });
    const order = [];
    for (let i = 0; i < 5; i++) {
      order.push(st.turn);
      R.roll(st, 2);
      R.play(st);
      R.next(st);
    }
    t('turns go round the table from the starter', order.join() === '2,3,0,1,2');
    t('every pawn starts on START (0); a 3 from START lands on 3 (EASY: the ladder to 22)', R.newGame({ seats: [1, 2] }).pos[1] === 0 && R.resolve(g({}, 1, 'easy'), 0, 3).to === 22);

    // your brother's lucky re-roll
    let luckyOk = true;
    for (const board of ['easy', 'normal']) {
      for (let s = 0; s < 100; s++) {
        const x = g({ 1: s }, 1, board), l = R.lucky(x);
        const ends = [1, 2, 3, 4, 5, 6].map((d) => expected(board, s, d).to);
        if (!l.values.length || l.values.some((v) => ends[v - 1] !== Math.max(...ends))) luckyOk = false;
      }
    }
    t("your brother's re-roll: always a roll that goes furthest", luckyOk);
    st = g({ 1: 30 }, 1, 'easy');
    R.roll(st, 2);
    ev = R.reroll(st, 6);
    t('a re-roll changes the die before the pawn moves', ev && st.die === 6 && st.pos[1] === 30 && st.phase === 'move' && R.play(st).to === 36 + 21);
    return out;
  }

  // ---------------------------------------------------------------- 3. games end

  function games(n, rnd) {
    const res = { games: 0, ended: 0, illegal: 0, rolls: { easy: [], normal: [] }, maxRolls: 0, errors: [] };
    for (const board of ['easy', 'normal']) {
      for (const seats of [[1, 2], [0, 1, 2], [0, 1, 2, 3]]) {
        for (let k = 0; k < n; k++) {
          const st = R.newGame({ seats, board, starter: seats[Math.floor(rnd() * seats.length)] });
          res.games++;
          let guard = 0;
          while (!st.over && guard++ < R.LIMIT + 5) {
            const seat = st.turn, from = st.pos[seat], d = 1 + Math.floor(rnd() * 6);
            R.roll(st, d);
            const ev = R.play(st);
            const want = expected(board, from, d);
            if (!ev || ev.seat !== seat || ev.to !== want.to || st.pos[seat] !== want.to || st.pos[seat] < 0 || st.pos[seat] > 100) {
              res.illegal++;
              if (res.errors.length < 3) res.errors.push(`${board} ${seats.length}p: ${seat} on ${from} rolled ${d}: got ${ev && ev.to}, want ${want.to}`);
            }
            if (!st.over) R.next(st);
          }
          if (st.over && st.winner >= 0 && st.pos[st.winner] === 100) res.ended++;
          else if (res.errors.length < 3) res.errors.push(`${board} ${seats.length}p: no winner after ${st.rolls} rolls`);
          res.rolls[board].push(st.rolls / seats.length);
          res.maxRolls = Math.max(res.maxRolls, st.rolls);
        }
      }
    }
    return res;
  }

  function check(opts = {}) {
    const n = opts.games || 20;
    const seed = opts.seed !== undefined ? opts.seed : 20261021;
    const sab = opts.sabotage || '';
    if (sab && !SABOTAGES.includes(sab)) return { ok: false, error: `no sabotage called ${sab}: ${SABOTAGES.join(', ')}` };
    R.bug = sab;
    try {
      const list = rules();
      const g = games(n, rng(seed));
      const avg = (a) => +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
      const easy = avg(g.rolls.easy), normal = avg(g.rolls.normal);
      list.push({ name: `games end: ${g.ended} of ${g.games} CPU games (2, 3 and 4 players, both boards) ended with a winner on 100`, ok: g.ended === g.games });
      list.push({ name: `games end: every move matched the check's own sum (${g.illegal} wrong)`, ok: g.illegal === 0 });
      list.push({ name: `games end: EASY is the shorter board (${easy} rolls each on average, NORMAL ${normal})`, ok: easy < normal });
      const failed = list.filter((x) => !x.ok).map((x) => x.name);
      return {
        ok: !failed.length, sabotage: sab || null, passed: list.length - failed.length, total: list.length, failed,
        games: g.games, rollsEach: { easy, normal }, maxRolls: g.maxRolls, errors: g.errors, checks: opts.verbose ? list : undefined,
      };
    } finally {
      R.bug = '';
    }
  }

  SL.check = check;
  SL.checkRules = () => {
    R.bug = '';
    return rules();
  };
  SL.check.SABOTAGES = SABOTAGES;
})();
