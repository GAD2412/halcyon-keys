// Weapon catalogue: damage, fire rate, spread, range and the HUD icon drawn in canvas.

export const WEAPONS = {
  fists: { name: 'Fists', damage: 16, rate: 0.45, range: 1.8, spread: 0, melee: true },
  pistol: { name: 'Tamsin 9', damage: 34, rate: 0.26, range: 90, spread: 0.012, sound: 'pistol' },
  smg: { name: 'Hornet SMG', damage: 19, rate: 0.085, range: 70, spread: 0.035, sound: 'smg' },
};
export const WEAPON_ORDER = ['fists', 'pistol', 'smg'];

export function drawWeaponIcon(ctx, id, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.save();
  ctx.scale(w / 64, h / 32);
  if (id === 'fists') {
    ctx.beginPath(); ctx.roundRect(18, 8, 26, 18, 6); ctx.fill();
    ctx.fillStyle = '#0a0e1c'; for (let i = 0; i < 3; i++) ctx.fillRect(24 + i * 7, 8, 1.5, 9);
  } else if (id === 'pistol') {
    ctx.fillRect(12, 8, 38, 8); ctx.fillRect(14, 14, 10, 14); ctx.fillRect(48, 9, 4, 3);
  } else {
    ctx.fillRect(6, 9, 48, 8); ctx.fillRect(22, 15, 8, 14); ctx.fillRect(36, 15, 6, 10); ctx.fillRect(2, 11, 6, 4); ctx.fillRect(52, 11, 8, 3);
  }
  ctx.restore();
}
