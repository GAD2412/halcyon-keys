// Fixed 60 Hz simulation step with a render every animation frame; also measures fps.

export function startGameLoop({ update, render }) {
  const step = 1 / 60;
  let last = performance.now();
  let acc = 0;
  const stats = { fps: 60, frames: 0, since: last };
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    let steps = 0;
    while (acc >= step && steps < 5) { update(step); acc -= step; steps++; }
    if (steps === 5) acc = 0;
    render(step);
    stats.frames++;
    if (now - stats.since > 1000) { stats.fps = stats.frames * 1000 / (now - stats.since); stats.frames = 0; stats.since = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return stats;
}
