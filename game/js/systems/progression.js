// Cash, respect and rank, plus the play statistics and completion percentage shown in the pause menu.

export const RANKS = [
  { name: 'Street Rat', respect: 0 },
  { name: 'Wheelman', respect: 300 },
  { name: 'Fixer', respect: 900 },
  { name: 'Keyholder', respect: 2000 },
];

export function createProgression(G) {
  const pr = {
    cash: 350, respect: 0,
    stats: { carsStolen: 0, kills: 0, copsEvaded: 0, busted: 0, wasted: 0, distance: 0, topSpeed: 0, playTime: 0 },
    rank() { let r = RANKS[0]; for (const k of RANKS) if (pr.respect >= k.respect) r = k; return r; },
    addCash(n, why) { pr.cash = Math.max(0, pr.cash + n); if (why) G.notify?.(`${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US')}  ${why}`); },
    addRespect(n) { const before = pr.rank().name; pr.respect += n; if (pr.rank().name !== before) G.notify?.(`Rank up: ${pr.rank().name}`); },
    completion() {
      const m = G.missions?.completedCount() || 0, total = G.missions?.total() || 1;
      const story = (m / total) * 80;
      const extra = Math.min(10, pr.stats.carsStolen) + Math.min(10, pr.stats.copsEvaded * 2);
      return Math.round(Math.min(100, story + extra));
    },
  };
  G.events.on('crime', (type) => { if (type === 'carjack' || type === 'stealPolice') pr.stats.carsStolen++; });
  G.events.on('kill', () => { pr.stats.kills++; });
  G.events.on('wantedCleared', () => { pr.stats.copsEvaded++; pr.addRespect(25); });
  return pr;
}
