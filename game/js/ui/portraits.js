// Procedural character portraits for dialogue: painted on canvas from a few traits per character.

export const CAST = {
  nico: { name: 'Nico Vale', skin: '#c98e62', hair: '#1f1712', style: 'short', bg: ['#2bb3a8', '#13324a'], collar: '#2bb3a8', stubble: true },
  pearl: { name: 'Auntie Pearl', skin: '#7a4a2c', hair: '#d9d0c0', style: 'bun', bg: ['#ff8a6a', '#5a2a4a'], collar: '#f2789a', earrings: '#ffc65a' },
  tuck: { name: 'Tuck Ibarra', skin: '#d9a27b', hair: '#3a2a1c', style: 'cap', bg: ['#ffc65a', '#4a3a1a'], collar: '#3a5a8a', mustache: true, cap: '#ff6f3c' },
  lux: { name: 'Lux Moreno', skin: '#e3b08a', hair: '#f28ab2', style: 'bob', bg: ['#7a6ad8', '#1a1440'], collar: '#111', shades: true },
  dispatch: { name: 'PHPD Dispatch', badge: true, bg: ['#2c4672', '#0b1424'] },
  oz: { name: 'Oz Marlowe', skin: '#a8704c', hair: '#151515', style: 'bald', bg: ['#c0503a', '#2a120c'], collar: '#c0503a', beard: true },
  cassius: { name: 'Cassius Wren', skin: '#f1c9a5', hair: '#c9ccd1', style: 'slick', bg: ['#e8c35a', '#3a2a10'], collar: '#f4f1ea', shades: true },
};

const cache = new Map();

export function drawPortrait(target, who) {
  const c = CAST[who] || CAST.nico;
  const ctx = target.getContext('2d');
  const W = target.width, H = target.height;
  if (cache.has(who + W)) { ctx.clearRect(0, 0, W, H); ctx.drawImage(cache.get(who + W), 0, 0); return; }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.save(); g.scale(W / 100, H / 100);
  const bg = g.createLinearGradient(0, 0, 0, 100); bg.addColorStop(0, c.bg[0]); bg.addColorStop(1, c.bg[1]);
  g.fillStyle = bg; g.fillRect(0, 0, 100, 100);
  // sun disc behind the head
  g.fillStyle = 'rgba(255,240,200,0.25)'; g.beginPath(); g.arc(70, 34, 22, 0, 7); g.fill();
  if (c.badge) {
    g.fillStyle = '#ffc65a'; g.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = i % 2 ? 22 : 34; g.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r); }
    g.fill(); g.fillStyle = '#1b2a48'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText('PHPD', 50, 56);
  } else {
    // shoulders and collar
    g.fillStyle = c.collar; g.beginPath(); g.moveTo(10, 100); g.quadraticCurveTo(50, 62, 90, 100); g.fill();
    g.fillStyle = c.skin; g.fillRect(42, 60, 16, 14);
    // head
    g.beginPath(); g.ellipse(50, 46, 20, 24, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(56, 50, 12, 20, 0, 0, 7); g.fill();
    // hair styles
    g.fillStyle = c.hair;
    if (c.style === 'short') { g.beginPath(); g.ellipse(50, 30, 21, 12, 0, Math.PI, 0); g.fill(); g.fillRect(29, 28, 6, 12); }
    if (c.style === 'bun') { g.beginPath(); g.ellipse(50, 29, 22, 13, 0, Math.PI, 0); g.fill(); g.beginPath(); g.arc(50, 14, 9, 0, 7); g.fill(); }
    if (c.style === 'bob') { g.beginPath(); g.ellipse(50, 36, 25, 22, 0, Math.PI * 1.02, -0.02); g.fill(); g.fillRect(25, 34, 9, 26); g.fillRect(66, 34, 9, 26); }
    if (c.style === 'slick') { g.beginPath(); g.ellipse(48, 28, 21, 11, -0.15, Math.PI, 0); g.fill(); }
    if (c.style === 'cap') { g.fillStyle = c.cap; g.beginPath(); g.ellipse(50, 28, 22, 12, 0, Math.PI, 0); g.fill(); g.fillRect(48, 25, 30, 6); }
    // eyes, brows, mouth
    if (c.shades) { g.fillStyle = '#0d0d12'; g.fillRect(31, 40, 16, 8); g.fillRect(53, 40, 16, 8); g.fillRect(46, 42, 8, 2); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(33, 41, 5, 2); g.fillRect(55, 41, 5, 2); }
    else { g.fillStyle = '#fff'; g.fillRect(35, 42, 9, 5); g.fillRect(56, 42, 9, 5); g.fillStyle = '#1a1a1a'; g.fillRect(39, 42, 4, 5); g.fillRect(60, 42, 4, 5); g.fillStyle = c.hair === '#d9d0c0' ? '#8a8a8a' : '#1a1410'; g.fillRect(34, 38, 11, 2); g.fillRect(55, 38, 11, 2); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(48, 46, 4, 9);
    g.fillStyle = '#6a2a2a'; g.fillRect(43, 60, 14, 3);
    if (c.stubble) { g.fillStyle = 'rgba(30,20,15,0.25)'; g.beginPath(); g.ellipse(50, 60, 16, 9, 0, 0, Math.PI); g.fill(); }
    if (c.mustache) { g.fillStyle = c.hair; g.fillRect(40, 56, 20, 4); }
    if (c.beard) { g.fillStyle = c.hair; g.beginPath(); g.ellipse(50, 62, 18, 11, 0, 0, Math.PI); g.fill(); g.fillStyle = '#6a2a2a'; g.fillRect(44, 60, 12, 2); }
    if (c.earrings) { g.fillStyle = c.earrings; g.beginPath(); g.arc(29, 54, 3, 0, 7); g.arc(71, 54, 3, 0, 7); g.fill(); }
  }
  g.restore();
  cache.set(who + W, cv);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(cv, 0, 0);
}
