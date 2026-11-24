// The HALCYON KEYS logo, drawn in canvas: sunset-gradient lettering with a key-and-palm emblem.

export function drawTitleLogo(canvas) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  // emblem: sun disc with stripes, palm and key
  const cx = 140, cy = 150, r = 105;
  const sun = g.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#ffd36a'); sun.addColorStop(0.55, '#ff7a59'); sun.addColorStop(1, '#d6407a');
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  g.fillStyle = sun; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.fillStyle = 'rgba(20,10,40,0.9)';
  for (let i = 0; i < 5; i++) g.fillRect(cx - r, cy + 18 + i * 17, r * 2, 4 + i * 2);
  // palm silhouette
  g.strokeStyle = '#140a28'; g.fillStyle = '#140a28'; g.lineWidth = 9;
  g.beginPath(); g.moveTo(cx + 10, cy + r); g.quadraticCurveTo(cx + 18, cy, cx - 6, cy - 46); g.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.48;
    g.beginPath(); g.moveTo(cx - 6, cy - 46);
    g.quadraticCurveTo(cx - 6 + Math.cos(a) * 40, cy - 46 + Math.sin(a) * 40 - 14, cx - 6 + Math.cos(a) * 70, cy - 46 + Math.sin(a) * 70 + 18);
    g.lineWidth = 7; g.stroke();
  }
  g.restore();
  // key across the disc
  g.save(); g.translate(cx, cy + 6); g.rotate(-0.5);
  g.fillStyle = '#f4f1ea'; g.strokeStyle = '#140a28'; g.lineWidth = 4;
  g.beginPath(); g.arc(-62, 0, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#140a28'; g.beginPath(); g.arc(-62, 0, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4f1ea'; g.fillRect(-44, -6, 110, 12); g.strokeRect(-44, -6, 110, 12);
  g.fillRect(40, 6, 10, 16); g.fillRect(56, 6, 10, 22); g.strokeRect(40, 6, 10, 16); g.strokeRect(56, 6, 10, 22);
  g.restore();
  // lettering
  const font = '900 128px "Avenir Next Condensed", "Futura", "Helvetica Neue", sans-serif';
  g.font = font; g.textBaseline = 'alphabetic';
  const grad = g.createLinearGradient(0, 40, 0, 170);
  grad.addColorStop(0, '#fff1c2'); grad.addColorStop(0.45, '#ffb15a'); grad.addColorStop(1, '#ff4f7b');
  g.lineJoin = 'round';
  g.lineWidth = 14; g.strokeStyle = '#140a28'; g.strokeText('HALCYON', 270, 160);
  g.fillStyle = grad; g.fillText('HALCYON', 270, 160);
  g.font = '900 96px "Avenir Next Condensed", "Futura", "Helvetica Neue", sans-serif';
  const grad2 = g.createLinearGradient(0, 180, 0, 270);
  grad2.addColorStop(0, '#9ff3ea'); grad2.addColorStop(1, '#2bb3a8');
  g.lineWidth = 12; g.strokeText('KEYS', 276, 262);
  g.fillStyle = grad2; g.fillText('KEYS', 276, 262);
  g.fillStyle = '#ffd9b0'; g.font = '700 26px "Avenir Next", sans-serif';
  g.fillText('PORT HALCYON · EST. 1926', 520, 250);
}
