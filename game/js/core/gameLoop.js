// Frame loop: one clamped-timestep update then one render per animation frame; also measures fps.

export function startGameLoop({ update, render }) {
  let last = performance.now();
  const stats = { fps: 60, frames: 0, since: last };
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    update(dt);
    render(dt);
    stats.frames++;
    if (now - stats.since > 1000) { stats.fps = (stats.frames * 1000) / (now - stats.since); stats.frames = 0; stats.since = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return stats;
}
