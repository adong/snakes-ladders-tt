/* 中文 for TT Snakes & Ladders (蛇梯棋): the words on the page, the toasts, the canvas words (the word bursts over the
   board) and the ? panel (Kit.lang, from kit/lang.js). Simple words: Tommy is 5. Snakes and ladders words: 蛇梯棋,
   梯子, 掷骰子, 滑梯 (the friendly snakes are slides), 跳, 数一数. The kids' and friends' names and the game's own name
   stay English. */
(function () {
  const L = Kit.lang;
  L.keep(['TT Snakes & Ladders', 'TT', 'Snakes & Ladders', 'TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'Foxy', 'Froggy', 'Esc', 'Enter', 'Space']);

  const TIPS = { 'ROLL THE DIE!': '掷骰子！', 'LUCKY RE-ROLL!': '幸运再掷一次！' };
  L.add({
    // the menu
    PLAY: '开始玩', 'Play': '开始玩', 'Play (Enter)': '开始玩 (Enter)',
    'HOW TO PLAY': '怎么玩', 'How to play': '怎么玩', 'How to play (H)': '怎么玩 (H)',
    'Who plays?': '谁来玩？', 'Teddy plays blue (1)': 'Teddy 用蓝色 (1)', 'Tommy plays yellow (2)': 'Tommy 用黄色 (2)',
    'Foxy plays red (3)': 'Foxy 用红色 (3)', 'Froggy plays green (4)': 'Froggy 用绿色 (4)',
    'Board': '棋盘', EASY: '简单', NORMAL: '普通',
    'More ladders, little slides (L)': '梯子多，滑梯短 (L)', 'Long slides too (L)': '还有长长的滑梯 (L)',
    'Count hops': '数一数', 'COUNT HOPS': '数一数', 'Tap once for every hop (C)': '跳一格点一下 (C)', 'Count hops (C)': '数一数 (C)',
    OFF: '关',
    'AT LEAST 2 PLAYERS!': '至少要 2 个人玩！', 'TEDDY OR TOMMY HAS TO PLAY!': 'Teddy 或 Tommy 要来玩！',
    // while playing
    'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'High five!': '击掌！', 'High five! (T)': '击掌！(T)', 'HIGH FIVE! 🙌': '击掌！🙌',
    'TAP THE DIE!': '点骰子！', 'TAP TO HOP!': '点一下，跳一格！',
    'TOO FAR! BOING!': '太远啦！弹回去！',
    '🔢 COUNT HOPS: ON': '🔢 数一数：开', '🔢 COUNT HOPS: OFF': '🔢 数一数：关',
    // the game is over, pause
    'DRAW!': '平局！', 'FIRST TO 100!': '第一个到 100！',
    'Home': '主页', 'Play again': '再玩一次', 'PLAY AGAIN': '再玩一次', 'Keep playing': '继续玩', 'Start a new game': '重新开始',
    // the rules screen
    'ROLL AND COUNT!': '掷骰子，数一数！',
    'Tap the die, then hop that many squares. Count the hops: 1, 2, 3!': '点骰子，掷到几就跳几格。一边跳一边数：1、2、3！',
    'CLIMB THE LADDERS!': '爬梯子！',
    'Stop at the bottom of a ladder and climb all the way up.': '停在梯子下面，就一直爬到上面去。',
    'WHEEE, SLIDES!': '呜——滑梯！',
    "Stop on a friendly snake's head and slide down to its tail. Wheee!": '停在友好小蛇的头上，就顺着它滑到尾巴那里。呜——',
    'EXACTLY 100.': '正好到 100。',
    'You need the exact number to land on 100. Too far bounces back.': '要掷到正好的数才能停在 100，多了就弹回来。',
    'FIRST TO 100 WINS!': '先到 100 就赢！',
    'Everyone starts on START. The first pawn on 100 wins.': '大家都从起点出发。谁的棋子先到 100 谁就赢。',
    'With 🔢 on, tap once for every hop. Switch it off and the pawn hops by itself.': '打开 🔢，跳一格点一下。关掉的话，棋子会自己跳。',
    'TWO BOARDS': '两种棋盘',
    'EASY has more ladders and little slides. NORMAL has long slides too.': '简单棋盘梯子多，滑梯短。普通棋盘还有长长的滑梯。',
    'CALL YOUR BROTHER!': '叫兄弟来帮忙！',
    'He brings a treat and rolls the die again for you: a lucky roll.': '他会带好吃的来，还帮你再掷一次骰子：幸运的一掷！',
    'Got it': '知道啦',
    // canvas word bursts over the board (js/game.js, drawn through Kit.lang.t in js/fx.js)
    'LADDER!': '梯子！', 'WHEEE!': '呜——', 'BOING!': '弹回去！', 'WINNER!': '赢啦！', '100!': '100！',
    // the ? panel (js/keys.js)
    'roll the die · hop (counting)': '掷骰子 · 跳一格（数一数的时候）',
    'count hops on or off': '数一数 开 / 关',
    'call your brother (both playing: high five)': '叫兄弟来帮忙（兄弟俩都在玩：击掌）',
    'how to play': '怎么玩',
    'new game': '新的一局',
    'menu: play · who plays (Teddy, Tommy, Foxy, Froggy)': '菜单：开始 · 谁来玩（Teddy、Tommy、Foxy、Froggy）',
    'menu: board · count hops': '菜单：棋盘 · 数一数',
    'Climb the ladders, slide down the friendly snakes. You need the exact number to land on 100.': '爬上梯子，顺着友好的小蛇滑下来。要掷到正好的数才能停在 100。',
    "Tap anywhere to roll the die (and to hop, when you count). Tap your brother's face (bottom right) to call him.":
      '点哪里都能掷骰子（数一数的时候，点一下跳一格）。点右下角兄弟的头像，叫他来帮忙。',
  });
  L.add(TIPS);

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^Call (\S+) \(T\)$/, '叫 $1 (T)');
  L.rule(/^Call (\S+)$/, '叫 $1');
  L.rule(/^(\S+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(\S+) SAYS: (.+)$/, (m, who, tip) => (TIPS[tip] ? `${who} 说：${TIPS[tip]}` : m));
  L.rule(/^(\S+) IS HELPING[…!]$/, '$1 来帮忙啦！');
  L.rule(/^(\S+): TAP THE DIE!$/, '$1：点骰子！');
  L.rule(/^(\S+): TAP TO HOP!$/, '$1：点一下，跳一格！');
  L.rule(/^(\S+)'S TURN…$/, '轮到 $1…');
  L.rule(/^(\S+) WINS!$/, '$1 赢啦！');
  L.rule(/^UP THE LADDER TO (\d+)!$/, '爬梯子，上到 $1！');
  L.rule(/^WHEEE! DOWN TO (\d+)!$/, '呜——滑到 $1！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
})();
