#!/usr/bin/env node
/* Run the headless checks from a terminal, with the same rules file the page loads (js/rules.js, js/check.js).
     node tools/check.js                       every square's links, the exact finish, then CPU games (20 per setup)
     node tools/check.js 200                   the same with 200 games per setup
     node tools/check.js --sabotage overshoot  proves the check can fail: too far wins anyway
       other sabotages: noladders (ladders don't climb), noslides (slides don't slide), chain (a slide starts at the
       top of a ladder), stay (too far stays put instead of bouncing), stuck (a pawn on 95 or more never moves, so
       games never end), cell (every row goes left to right), skip (a player's turn is skipped)
     node tools/check.js --all-sabotages       runs every sabotage and says which ones the check caught
     node tools/check.js --seed 7              another run of dice
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Map, Set, Error, Infinity, Date };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/rules.js', 'js/check.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const games = +(args.find((a, i) => /^\d+$/.test(a) && !/^--/.test(args[i - 1] || '')) || 20);
const seed = opt('seed') ? +opt('seed') : undefined;

if (args.includes('--all-sabotages')) {
  let caught = 0;
  for (const s of ctx.SL.check.SABOTAGES) {
    const out = ctx.SL.check({ games: 5, sabotage: s, seed });
    if (!out.ok) caught++;
    console.log(`${out.ok ? 'MISSED' : 'caught'}  ${s}: ${out.failed.length} failed${out.failed.length ? ' — ' + out.failed[0] : ''}`);
  }
  const all = caught === ctx.SL.check.SABOTAGES.length;
  console.log(all ? `EVERY SABOTAGE CAUGHT (${caught})` : `ONLY ${caught} OF ${ctx.SL.check.SABOTAGES.length} CAUGHT`);
  process.exitCode = all ? 0 : 1;
} else {
  const out = ctx.SL.check({ games, sabotage: opt('sabotage'), seed, verbose: args.includes('--verbose') });
  console.log(JSON.stringify(out, null, 1));
  console.log(out.ok ? 'CHECK PASSED' : 'CHECK FAILED');
  process.exitCode = out.ok ? 0 : 1;
}
