/* TT Snakes & Ladders: your brother. When only one brother plays, the other one (Kit.roster.buddyFor: Teddy when
   Tommy plays, Tommy for Teddy) comes when called with T or his face button, any time and as often as you like.
   A visit: pop in beside you (at his roster buddyScale, in a puff of stars) → hello with his signature move (Teddy's
   boxing combo, Tommy's Y with ✌️) → toss you a treat (🍦 💧 🧃 🍪 🍉 🍌) → his helper, a lucky RE-ROLL: before you
   roll he points at the die ("TOMMY SAYS: ROLL THE DIE!"); once you've rolled, he grabs the die and rolls it again
   ("TOMMY SAYS: LUCKY RE-ROLL!"), and his roll is always one that takes you furthest (up a ladder, round a slide,
   onto 100 when it can). Your pawn waits for him. Once you've moved, his goodbye move → pop out.
   If it's someone else's turn when he arrives, he waits for yours. Calling him again while he's there brings another
   treat and another re-roll.
   When both brothers play, T is a high five (SL.highFive): they run together, slap hands and run back. */
(function () {
  'use strict';
  const T = THREE;
  const SL = (window.SL = window.SL || {});
  const { pick, emojiTexture, rand } = Kit.gfx;

  const V = { pop: 0.35, treatAt: 2.1, helpAt: 2.7, byeAfter: 0.8, maxWait: 28 };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const TIPS = { die: 'ROLL THE DIE!', reroll: 'LUCKY RE-ROLL!' };

  let api = null, entry = null, flyers = null;
  const actor = SL.makeActor();
  // phase: off | in | here | bye | out
  // used: he has re-rolled on this visit; pointed: the turn he pointed at the die for; movedAt: when you moved after it
  const b = { phase: 'off', t: 0, given: false, treatAt: V.treatAt, used: false, pointed: '', pointing: null, movedAt: -1, calls: 0, treats: 0, rerolls: 0, lastTreat: null, popT: 0, lastReroll: null };
  const treat = { sprite: null, flyT: -1, emoji: '', from: new T.Vector3(), to: new T.Vector3() };

  function init(a) {
    api = a;
    treat.sprite = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
    treat.sprite.visible = false;
    treat.sprite.renderOrder = 22;
    SL.stage.scene.add(treat.sprite);
    flyers = a.flyers;
    actor.attach(SL.stage.scene, flyers);
    actor.visible = false;
  }

  // The brother for this player (rebuilt only when he changes). Returns his roster entry.
  function setFor(playerId) {
    const id = Kit.roster.buddyFor(playerId);
    if (entry && entry.id === id) return entry;
    dismiss();
    entry = Kit.roster.get(id);
    actor.set(id, 1);
    const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
    tag.position.y = 2.75;
    actor.person.root.add(tag);
    actor.visible = false;
    return entry;
  }

  const scaleNow = () => (entry.buddyScale || 0.8) * (api.scale ? api.scale() : 1);

  function call() {
    if (!entry) return 'none';
    b.calls++;
    if (b.phase === 'off' || b.phase === 'out') return summon();
    // another hello, another treat, and another re-roll
    actor.react('hello');
    b.phase = 'here';
    b.t = Math.min(b.t, V.pop + 0.1);
    b.given = false;
    b.treatAt = b.t + 1.5;
    b.used = false;
    b.pointed = '';
    b.movedAt = -1;
    b.popT = Math.max(b.popT, V.pop);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    SL.sfx.pop();
    return 'again';
  }

  function summon() {
    const s = api.spot();
    Object.assign(b, { phase: 'in', t: 0, given: false, treatAt: V.treatAt, used: false, pointed: '', pointing: null, movedAt: -1, popT: 0 });
    actor.setScale(0.01);
    actor.place(s.x, 0, s.z);
    actor.face = null;
    actor.faceDefault = s.face;
    actor.visible = true;
    actor.react('idle');
    const p = actor.root.position;
    for (let i = 0; i < 14; i++) flyers.add(i % 3 ? '⭐' : '✨', p.x, 1.5 + rand(0, 1.5), p.z, rand(-2.5, 2.5), rand(1, 4), rand(0.4, 0.6), 0.8, rand(-4, 4), 3);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    SL.sfx.pop();
    return 'summoned';
  }

  function dismiss() {
    b.phase = 'off';
    actor.visible = false;
    treat.flyT = -1;
    if (treat.sprite) treat.sprite.visible = false;
    if (b.pointing && api) api.clearHint();
    b.pointing = null;
  }

  // Your pawn moved: if he re-rolled for it, his job is done.
  function moved() {
    if (b.pointing) api.clearHint();
    b.pointing = null;
    if (b.phase === 'here' && b.used && b.movedAt < 0) b.movedAt = b.t;
  }

  // A new game (or home): he leaves straight away.
  function reset() {
    dismiss();
  }

  // Is he on his way to re-roll? Then your pawn waits for him (the game asks before it moves you).
  const wants = () => (b.phase === 'in' || b.phase === 'here') && !b.used;

  // ---------------------------------------------------------------- the treat

  function giveTreat() {
    const [emoji, label] = pick(TREATS);
    treat.emoji = emoji;
    b.treats++;
    b.lastTreat = emoji;
    treat.sprite.material.map = emojiTexture(emoji);
    treat.sprite.material.needsUpdate = true;
    actor.root.updateMatrixWorld(true);
    Kit.people.handWorld(actor.person, 1, treat.from);
    treat.sprite.position.copy(treat.from);
    treat.sprite.scale.setScalar(0.9);
    treat.sprite.visible = true;
    treat.flyT = 0;
    api.toast(`${emoji} ${label} FROM ${entry.name}!`, 'treat');
    SL.sfx.kit('coin', 6);
  }

  function updateTreat(dt) {
    if (treat.flyT < 0) return;
    const player = api.player();
    treat.flyT += dt / 0.65;
    player.root.updateMatrixWorld(true);
    Kit.people.handWorld(player.person, -1, treat.to);
    const k = Math.min(1, treat.flyT);
    treat.sprite.position.lerpVectors(treat.from, treat.to, k);
    treat.sprite.position.y += Math.sin(k * Math.PI) * 1.8;
    treat.sprite.material.rotation = k * Math.PI * 2;
    if (k >= 1) {
      treat.flyT = -1;
      treat.sprite.visible = false;
      treat.sprite.material.rotation = 0;
      player.hold(treat.emoji, 8);
      player.react('cheer');
    }
  }

  // ---------------------------------------------------------------- the visit

  const tmp = new T.Vector3();
  function update(dt) {
    updateTreat(dt);
    if (b.phase === 'off') return;
    b.t += dt;
    const s = api.spot();
    const full = scaleNow();
    if (b.phase === 'in' || b.phase === 'here' || b.phase === 'bye') {
      b.popT += dt;
      const u = Math.min(1, b.popT / V.pop);
      const spring = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 : 1;
      actor.setScale(full * Math.max(0.01, u) * spring);
    }
    if (b.phase === 'in' && b.t >= V.pop) {
      b.phase = 'here';
      actor.react('hello');
    }
    if (b.phase === 'here') {
      actor.faceDefault = s.face;
      if (!b.given && b.t > b.treatAt - 0.35) actor.act('give', 0.6, 0, true);
      if (!b.given && b.t > b.treatAt) {
        b.given = true;
        giveTreat();
      }
      // his helper, once the treat's on its way: point at the die before you roll, re-roll it once you have
      const ready = b.given && b.t > Math.max(V.helpAt, b.treatAt + 0.5) && treat.flyT < 0;
      const now = ready ? api.state() : null;
      if (now && now.what === 'roll' && !b.used && b.pointed !== now.key) {
        b.pointed = now.key;
        api.hintDie();
        b.pointing = api.diePos();
        api.toast(`${entry.name} SAYS: ${TIPS.die}`, 'save');
        SL.sfx.nice();
      } else if (now && now.what === 'reroll' && !b.used) {
        const r = api.reroll();
        if (r) {
          b.used = true;
          b.rerolls++;
          b.lastReroll = r;
          b.pointing = api.diePos();
          actor.act('give', 0.7, 2.2, true);
          api.toast(`${entry.name} SAYS: ${TIPS.reroll}`, 'save');
          SL.sfx.magic();
          const p = b.pointing;
          for (let i = 0; i < 10; i++) flyers.add(i % 2 ? '🍀' : '✨', p.x, p.y + 0.5, p.z, rand(-2, 2), rand(1.5, 3.5), 0.45, 0.9, rand(-3, 3), 4);
        }
      }
      if (b.pointing) {
        const p = actor.root.position;
        tmp.copy(b.pointing);
        actor.face = Math.atan2(-(tmp.x - p.x), -(tmp.z - p.z));
        if (actor.mode !== 'signature' && actor.mode !== 'act') actor.act('point', 0.3, 0);
      } else actor.face = null;
      const idle = b.given && treat.flyT < 0 && !(now && (now.what === 'roll' || now.what === 'reroll'));
      if ((b.movedAt >= 0 && b.t > b.movedAt + V.byeAfter) || (idle && !b.used && b.t > V.maxWait) || (b.given && api.roundOver() && b.t > V.helpAt + 1.2 && treat.flyT < 0)) {
        b.phase = 'bye';
        b.t = 0;
        actor.face = null;
        if (b.pointing) api.clearHint();
        b.pointing = null;
        actor.react('goodbye');
      }
    } else if (b.phase === 'bye') {
      if (b.t > 1.7) {
        b.phase = 'out';
        b.t = 0;
        SL.sfx.pop();
      }
    } else if (b.phase === 'out') {
      const u = Math.min(1, b.t / 0.25);
      actor.setScale(full * Math.max(0.01, 1 - u) * (1 + Math.sin(u * Math.PI) * 0.2));
      if (u >= 1) {
        const p = actor.root.position;
        for (let i = 0; i < 8; i++) flyers.add('✨', p.x, 1.5, p.z, rand(-2, 2), rand(1, 3), 0.45, 0.6, rand(-4, 4), 3);
        dismiss();
      }
    }
    actor.update(dt);
  }

  // The die landed (yours or his): what he was pointing at has had its turn.
  function repoint() {
    if (b.phase === 'here' && b.pointing) {
      b.pointing = null;
      api.clearHint();
    }
  }

  // ---------------------------------------------------------------- both brothers: the high five

  const hf = { on: false, t: 0, clapped: false, count: 0 };
  function highFive() {
    if (hf.on) return 'busy';
    const [a, c] = api.players();
    const [pa, pc] = api.meet();
    hf.on = true;
    hf.t = 0;
    hf.clapped = false;
    hf.count++;
    a.react('idle');
    c.react('idle');
    a.moveTo(pa.x, pa.z, 11);
    c.moveTo(pc.x, pc.z, 11);
    return 'high5';
  }
  function updateHighFive(dt) {
    if (!hf.on) return;
    hf.t += dt;
    const [a, c] = api.players();
    const pa = a.root.position, pc = c.root.position;
    if (!a.moving && !c.moving && !hf.clapped) {
      a.face = Math.atan2(-(pc.x - pa.x), -(pc.z - pa.z));
      c.face = Math.atan2(-(pa.x - pc.x), -(pa.z - pc.z));
      if (hf.raise === undefined || hf.raise < 0) hf.raise = hf.t;
      a.act('high5', 0.8, 2.6, true);
      c.act('high5', 0.8, 2.6, true);
      if (hf.t > hf.raise + 0.28) {
        hf.clapped = true;
        hf.clapT = hf.t;
        SL.sfx.clap();
        const x = (pa.x + pc.x) / 2, z = (pa.z + pc.z) / 2, y = 2 * api.scale() * 1.25;
        flyers.add('💥', x, y, z, 0, 0.5, 1.4, 0.5, 0, 0);
        for (let i = 0; i < 8; i++) flyers.add(i % 2 ? '🙌' : '⭐', x, y, z, rand(-2.5, 2.5), rand(1.5, 3.5), rand(0.5, 0.8), 1, rand(-3, 3), 4);
        api.toast('HIGH FIVE! 🙌', 'buddy');
      }
    }
    if (hf.clapped && hf.t > hf.clapT + 0.9 && hf.back === undefined) {
      hf.back = true;
      const [ha, hc] = api.homes();
      a.face = null;
      c.face = null;
      a.moveTo(ha.x, ha.z, 11);
      c.moveTo(hc.x, hc.z, 11);
    }
    if (hf.back && !a.moving && !c.moving) {
      hf.on = false;
      hf.raise = -1;
      hf.back = undefined;
    }
  }
  function cancelHighFive() {
    if (!hf.on) return;
    hf.on = false;
    hf.raise = -1;
    hf.back = undefined;
    const [a, c] = api.players();
    const [ha, hc] = api.homes();
    a.face = c.face = null;
    a.place(ha.x, 0, ha.z);
    c.place(hc.x, 0, hc.z);
  }

  SL.buddy = {
    init, setFor, call, summon, dismiss, moved, repoint, reset, update, wants, TIPS, V,
    get entry() { return entry; },
    get actor() { return actor; },
    get on() { return b.phase !== 'off'; },
    get phase() { return b.phase; },
    info() {
      const r = actor.root.position;
      return {
        phase: b.phase, id: entry && entry.id, t: +b.t.toFixed(2), given: b.given, pointing: !!b.pointing, calls: b.calls,
        treats: b.treats, rerolls: b.rerolls, used: b.used, lastTreat: b.lastTreat, lastReroll: b.lastReroll, pose: actor.pose,
        x: +r.x.toFixed(2), z: +r.z.toFixed(2), scale: +actor.scale.toFixed(2), visible: actor.visible, flying: treat.flyT >= 0,
        highFives: hf.count, highFiving: hf.on,
      };
    },
  };
  SL.highFive = { start: highFive, update: updateHighFive, cancel: cancelHighFive, get on() { return hf.on; } };
})();
