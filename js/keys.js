/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.SL_TITLE, // the name lives in js/title.js
  keys: [
    ['roll the die · hop (counting)', 'Space or Enter'],
    ['count hops on or off', 'C'],
    ['call your brother (both playing: high five)', 'T'],
    ['how to play', 'H'],
    ['new game', 'R'],
    ['pause · sound', 'P or Esc · M'],
    ['menu: play · who plays (Teddy, Tommy, Foxy, Froggy)', 'Enter · 1 – 4'],
    ['menu: board · count hops', 'L · C'],
  ],
  note: 'Climb the ladders, slide down the friendly snakes. You need the exact number to land on 100.',
  touch: 'Tap anywhere to roll the die (and to hop, when you count). Tap your brother\'s face (bottom right) to call him.',
});
