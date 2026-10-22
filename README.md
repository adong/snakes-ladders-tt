# TT Snakes & Ladders

[![TT Snakes & Ladders title screen](docs/screenshot.jpg)](https://adong.github.io/snakes-ladders-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

Snakes and ladders on a 3D board on a table: Teddy plays blue, Tommy yellow, and Foxy 🦊 and Froggy 🐸 play red and green. Roll the big die, count the hops, climb the ladders, slide down the friendly snakes, and land on 100 exactly to win. 2 to 4 players, kids and CPU friends in any mix.

**中文：** 桌上的 3D 蛇梯棋：Teddy 用蓝色，Tommy 用黄色，Foxy 🦊 和 Froggy 🐸 用红色和绿色。掷骰子，一边跳一边数，爬梯子，顺着友好的小蛇滑下来，正好停在 100 就赢！2 到 4 个人，小朋友和电脑朋友随便搭配。

The classic board game 蛇梯棋 starring Teddy and Tommy, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. The board is a chunky slab on a wooden table, printed with 100 squares in rainbow rows and big numbers. The ladders are 3D, in bright colours, and the snakes are smiling slides with spots. The pawns are little figures of Teddy and Tommy, and chunky pawns with Foxy's and Froggy's faces. There are no image, model or audio files: the boys are the kit's blocky characters, the board and the die are painted on canvases, and every sound is synthesised.

The name is a working title. It lives in one constant, `SL_TITLE` in `js/title.js`, and the page title, the logo and the ? panel read it from there.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/snakes-ladders-tt.html` is the whole game in one page. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name snakes-ladders-tt`

### A game

- **Who plays:** tap the four faces on the home screen to switch seats on or off (💤 is off). Teddy plays **blue**, Tommy **yellow**, and **🦊 Foxy red** and **🐸 Froggy green** are CPU friends. At least 2 players, and Teddy or Tommy has to play. Teddy, Tommy and Foxy play at first; everything is remembered.
- **The board:** **🐣 EASY** is the default, for Tommy: 11 ladders and 5 short slides, none in the top row. **🔥 NORMAL** is for Teddy: 8 ladders and 8 slides, some of them long (62 slides all the way down to 19).
- **🔢 COUNT HOPS** (on at first): a kid taps once for every hop, counting out loud. Switch it off (on the home screen, the 🔢 button while playing, or C) and the pawn hops by itself. The CPU friends always hop by themselves.
- **Your turn:** the die on the tray glows in your colour with a 👆. **Tap anywhere** (or Space) and it tumbles. Counting bubbles **1, 2, 3…** pop up on the squares your pawn will hop to, a ring marks where it lands (🪜 for a ladder, 🐍 for a slide, ↩️ for a bounce, 🏆 for 100), and the same bubbles fill up in a row under the score as the pawn hops. Each hop plays the next note of do re mi.
- **Ladders:** the pawn climbs all the way up ("UP THE LADDER TO 41!"), and your big self beside the board cheers.
- **Slides:** the pawn whizzes down the snake's back to its tail with a slide whistle ("WHEEE! DOWN TO 7!"). The snakes are friendly: they smile.
- **The exact finish:** you need the exact number to land on 100. Too far bounces back off 100 (97 and a 6: 98, 99, 100, 99, 98, 97), and a ladder or a slide where you bounce back to still counts.
- **The score:** each face at the top shows the square its pawn is on, counting up as it hops, and a 🏆 badge counts wins. The score keeps running until you change who plays or the board. The first game starts with a kid; after that the start goes round the table.
- **A win:** the winner does his signature move beside the board and on square 100 (Teddy's boxing combo or 🏀 jump shot, Tommy's Y with peace fingers ✌️; Foxy and Froggy spin and jump), confetti falls when a kid wins, then **PLAY AGAIN**.
- **📖** (or H) opens **HOW TO PLAY**, the rules with pictures.

## Rules

- The squares go **1 to 100**, back and forth: 1 to 10 left to right along the bottom, 11 to 20 right to left above it, and so on up to 100 at the top left. Little arrows at the row ends show the way round.
- Everyone starts on **START**, the tray in front of square 1. Turns go round the table; pawns can share a square.
- **Roll and hop** that many squares.
- **Stop at the foot of a ladder:** climb to its top. **Stop on a snake's head:** slide down to its tail. Only where you stop counts, not the squares you hop over. No ladder or slide starts where another ends, so there are no chains.
- **Land on 100 exactly** to win; too far bounces back.

## Controls

| | Keys | Touch |
|---|---|---|
| roll the die · hop (counting) | Space or Enter | tap anywhere |
| count hops on or off | C | 🔢 |
| call your brother (both playing: high five) | T | his face, bottom right (🙌 when both play) |
| how to play | H | 📖 |
| new game | R | 🔄 on the pause screen |
| pause · sound | P or Esc · M | ⏸️ · 🔊 |
| menu: play · who plays (Teddy, Tommy, Foxy, Froggy) | Enter · 1 – 4 | the buttons |
| menu: board · count hops | L · C | the buttons |

- **Sound:** 🔊 at the top right while playing; on the menus, the pause screen and the results the kit's round speaker button sits under the A文 button, and the ? panel has one too. One switch for every game (`claudeGames.muted`).
- **Taps:** there's nothing to choose in snakes and ladders, so a tap anywhere on the board rolls the die (and hops, when you count). No small targets to hit on a phone.
- **🔢 and 📖** sit at the bottom left on a tall screen and next to pause on a wide one.

## Call your brother (companion mode)

**When one brother plays**, the other one is free to help. Call him with **T** or by tapping his face (bottom right), **any time and as often as you like** (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy).

- **He pops in** in a puff of stars, at his roster `buddyScale`, with his name tag: beside you on a wide screen, at his own place in the row on a tall one.
- **He says hi** with his signature move (Tommy's Y with ✌️, Teddy's boxing combo) and **tosses you a treat** (🍦 💧 🧃 🍪 🍉 🍌) that arcs into your hand: "🍪 COOKIE FROM TOMMY!"
- **Then his helper: a lucky RE-ROLL.** Before you roll he points at the die: "TOMMY SAYS: ROLL THE DIE!" and a gold ring goes round it. Once you've rolled, your pawn waits for him ("TOMMY IS HELPING…"), he grabs the die and rolls it again with a sparkle of 🍀: "TOMMY SAYS: LUCKY RE-ROLL!" His roll is always one that takes you furthest: past a slide, up a ladder, onto 100 when it can (when your roll was already one of the best, his goes just as far). The counting bubbles move to the new roll.
- **Once you've hopped** he does his goodbye move and pops out. If it's someone else's turn when he arrives, he waits for yours. Call him again while he's there and he says hi again, brings another treat and gives you another re-roll.

**When both brothers play**, **T** (or 🙌) is a **high five**: they run to meet in front of the board, slap hands (💥) and run back. It doesn't change the game.

## Make it yours

- `js/title.js`: the game's name.
- `js/rules.js`, near the top: `BOARDS`, the ladders and slides of 🐣 EASY and 🔥 NORMAL as [from, to] pairs. The check (`node tools/check.js`) tells you if a new board breaks a rule (a chain, a slide on 100, a ladder going down).
- `js/game.js`, top: `SEATS` (who plays each colour, the CPU friends' names and emoji), `SCALE` (the boys' size) and the first `prefs` (who plays, the board, counting).
- `js/stage.js`: the table, the printed board (`boardTexture`), the colours of the rows, ladders and snakes, the pawns (`makePawn`), the die.

## How it works, and how it's tested

- `js/rules.js` has no Three.js and no page in it: the board, the hops (with the bounce off 100), the ladders and slides, the turns, and your brother's lucky re-roll (`lucky()`: the die values that go furthest). The same file runs the game and the headless checks.
- `js/game.js` runs the turns, the die, counting taps, the CPU's timing and the screens; `js/stage.js` turns each move into hops (all at once, or one per tap), a climb or a slide.
- Console hooks (`window.game`):

```js
game.start({ seats: [1, 2], level: 'easy', count: true })  // 0 red Foxy, 1 yellow Tommy, 2 blue Teddy, 3 green Froggy
game.dice(6, 3)          // the next rolls (your brother's re-roll takes one too)
game.tapDie()            // a real pointer tap on the die where it is on the screen (or game.roll())
game.hop()               // one counting hop (or game.act(): what Space does)
game.call()              // call your brother (both playing: high five)
game.step(2)             // advance 2 s and draw (when the browser tab's animation is throttled)
game.hold(true)          // freeze the live loop, so only game.step() moves time
game.auto(true)          // a test bot plays the kids' seats too
game.setup({ 2: 97, 0: 40 }, 2)   // pawns on squares, and whose turn
game.check()             // the headless checks below (10 games per setup)
game.checkBoard()        // the board on the screen matches the rules: every ladder and slide from its square to its square
game.info()              // state, turn, die, squares, the pending move, counts, the brother
```

The same checks run from a terminal with Node:

```bash
node tools/check.js 200
```

```bash
node tools/check.js --all-sabotages
```

- **Every square's links** (on both boards): 100 different squares on a 10 × 10 grid, each next to the one before, 1 at the bottom left, 10 at the bottom right, 11 above it and 100 at the top left, every row the other way to the one below. Every ladder goes up and every slide down; none starts on 1 or touches 100; no square starts two; none ends where another starts; the game's links are the board's links. Then **every square (START to 99) with every roll (1 to 6)**, 1200 moves: the game's hops, bounce, ladder or slide must match the check's own sum, worked out from the board lists and not by the game. EASY must have more ladders and fewer, shorter slides than NORMAL, and none in its top row.
- **The exact finish:** 94 + 6 lands on 100 and wins; 99 + 1 wins; 97 + 6 hops 98, 99, 100, 99, 98, 97 and doesn't win; a bounce onto a slide slides (96 + 6 to 98, down to 79 on NORMAL); from 94 to 99 only the exact roll wins on both boards; after a win nothing rolls or moves. Also: turns go round the table from the starter, everyone starts on START, and your brother's re-roll is always a roll that goes furthest (every square, both boards) and changes the die before the pawn moves.
- **Games end:** CPU games with 2, 3 and 4 players on both boards, every move checked against the check's own sum, and every game must end with a winner on 100. EASY must be the shorter board.
- **It can fail:** `node tools/check.js --all-sabotages` breaks one rule at a time and the check must fail every time: `noladders`, `noslides`, `chain` (a slide starts at the top of a ladder), `overshoot` (too far wins anyway), `stay` (too far stays put instead of bouncing), `stuck` (a pawn on 95 or more never moves, so games never end), `cell` (every row goes left to right) and `skip` (a player's turn is skipped). All 8 are caught.
- **At the last check** (`node tools/check.js 200`, about a tenth of a second): 30 of 30; 1200 CPU games, every move right, every game ended with a winner on 100, the longest 284 rolls. On average each player rolls about 17 times on 🐣 EASY and 31 times on 🔥 NORMAL.
- **The browser:** whole games through the real renderer with the test bot (2 kids on EASY, 4 players on NORMAL, 3 players on EASY), each to the game-over panel with no console errors; `game.checkBoard()` passed on both boards. Also counting hops (taps, Space and Enter, real pointer taps), a ladder, a slide, a bounce, the win, the brother's visit (treat, "ROLL THE DIE!", then a rolled 3 onto a slide re-rolled to a 6 and up the ladder to 41), the high five, the keys and the sound switch. 中文: home, the rules, the ? panel, play, counting, a ladder, a slide, a bounce, the brother, pause, the win and game over, and both brothers playing; `Kit.lang.untranslated()` stayed `[]`, and a planted page string and a planted canvas word were both caught. English: no Chinese anywhere except the kit's language button tooltips. Layouts checked by screenshot: 1024×768, 1200×750, iPad 768×1024, phone upright 390×844 and on its side 740×360. `index.html` and `dist/snakes-ladders-tt.html` both boot and play a whole game from `file://` in headless Chrome.

## Files

```
index.html                   page, HUD, menus, panels, the rules screen with pictures (CSS inline)
js/title.js                  the game's name (one constant)
js/rules.js                  the boards, the hops and the bounce, ladders and slides, turns, the lucky re-roll (no Three.js)
js/check.js                  the headless checks (game.check, tools/check.js)
js/stage.js                  the table, the printed board, ladders, slides, pawns, the die, the counting bubbles, the camera fit
js/actor.js                  a boy at the table (from TT Flying Chess), and the CPU friends on their podiums
js/buddy.js                  your brother's visit and lucky re-roll, and the high five
js/fx.js                     emoji flyers, word bursts, confetti
js/sfx.js                    game sounds on top of Kit.sound (do re mi for the hops, the climb, the slide whistle)
js/game.js                   the game, turns, the die, counting, the CPU's timing, the score, screens, input, main loop, window.game hooks
js/keys.js                   the keys the ? panel shows (Kit.help)
js/zh.js                     中文 for every word the player sees (Kit.lang); names and the game's name stay English
tools/check.js               runs the headless checks under Node
kit/                         copy of ~/claude-games/kit (python3 ../kit/tools/sync.py .), never edited here
dist/snakes-ladders-tt.html  the single-page build
```

## Not verified

- **Sound:** the synth code runs without errors, but nobody listened to it.
- **Real touch devices:** taps were checked in the browser's phone and tablet sizes, but no real phone or iPad was used.
- **Real kids:** whether 🐣 EASY with counting is right for Tommy and 🔥 NORMAL for Teddy needs Tommy and Teddy. A 4-player NORMAL game is long (about 125 rolls, around ten minutes); 2 kids on EASY is about 35 rolls.
- **Speed on an older iPad:** nothing was timed on a real iPad.
- **Double-click from Finder:** both pages were opened from `file://` in headless Chrome, not by double-clicking in Finder.
- **The iPad home-screen icon:** the apple-touch-icon is drawn by script like the siblings'; nobody added it to a real iPad.
- **Long blocking test loops** in the app's Browser pane once wiped the 2D canvases behind the textures (the board and the emoji went black; a reload fixed it). TT Flying Chess saw the same; it never happened in normal play or in headless Chrome.
