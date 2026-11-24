// Dialogue cards: a queue of spoken lines shown one after another with the speaker's portrait.
import { drawPortrait, CAST } from './portraits.js';

export function createDialogueBox(root) {
  const el = document.createElement('div');
  el.className = 'hud-dialogue hidden';
  el.innerHTML = '<canvas width="168" height="168"></canvas><div><div class="d-name"></div><div class="d-text"></div></div>';
  root.appendChild(el);
  const portrait = el.querySelector('canvas'), nameEl = el.querySelector('.d-name'), textEl = el.querySelector('.d-text');
  const queue = [];
  let current = null, t = 0;

  function showLine(line) {
    current = line; t = line.dur || Math.max(2.6, line.text.length * 0.055);
    drawPortrait(portrait, line.who);
    nameEl.textContent = CAST[line.who]?.name || line.who;
    textEl.textContent = line.text;
    el.classList.remove('hidden');
  }
  return {
    say(lines) { for (const l of lines) queue.push(l); if (!current && queue.length) showLine(queue.shift()); },
    busy: () => !!current || queue.length > 0,
    skip() { t = 0; },
    // shot mode pins a line on screen
    pin(line) { queue.length = 0; showLine({ ...line, dur: 1e9 }); },
    clear() { queue.length = 0; current = null; el.classList.add('hidden'); },
    update(dt) {
      if (!current) return;
      t -= dt;
      if (t <= 0) {
        current = null;
        if (queue.length) showLine(queue.shift()); else el.classList.add('hidden');
      }
    },
  };
}
