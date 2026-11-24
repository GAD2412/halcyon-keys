// Every drivable model in Port Halcyon: size, handling and paint choices. Names are this game's own.

export const VEHICLES = {
  pip: { name: 'Pip', style: 'hatch', len: 3.8, wid: 1.78, hgt: 1.48, maxSpeed: 40, accel: 10, grip: 7.5, mass: 0.8, colors: ['#ff8a7a', '#8fd7d0', '#ffd36a', '#f4f1ea', '#a3c96a'] },
  caravel: { name: 'Caravel', style: 'sedan', len: 4.7, wid: 1.86, hgt: 1.45, maxSpeed: 46, accel: 10.5, grip: 7, mass: 1, colors: ['#2e4a7a', '#c9ccd1', '#1c1e22', '#8a1f2c', '#f4f1ea', '#2f6f5a'] },
  brute8: { name: 'Brute 8', style: 'muscle', len: 4.95, wid: 1.98, hgt: 1.32, maxSpeed: 56, accel: 14, grip: 6.2, mass: 1.15, colors: ['#e0482f', '#1f2a44', '#f2b134', '#3a7a3a', '#111214'] },
  kestrel: { name: 'Kestrel GT', style: 'sports', len: 4.55, wid: 1.98, hgt: 1.18, maxSpeed: 64, accel: 16, grip: 8.6, mass: 0.95, colors: ['#ff5a3c', '#ffc23a', '#2bb3a8', '#f4f1ea', '#7a3ad8'] },
  haulit: { name: 'Haul-It', style: 'van', len: 5.3, wid: 2.06, hgt: 2.3, maxSpeed: 34, accel: 7.5, grip: 6.4, mass: 1.6, colors: ['#f4f1ea', '#d6d9dc', '#5b7fa6', '#e8c35a'] },
  coastline: { name: 'Coastline Bus', style: 'bus', len: 10.4, wid: 2.5, hgt: 3.0, maxSpeed: 24, accel: 5.5, grip: 6, mass: 2.6, colors: ['#f4f1ea', '#ffd36a', '#3fb8b0'] },
  cab: { name: 'Halcyon Cab', style: 'sedan', len: 4.7, wid: 1.86, hgt: 1.45, maxSpeed: 44, accel: 10, grip: 7, mass: 1, colors: ['#f6b62e'], livery: 'cab' },
  reef: { name: 'PHPD Reef', style: 'sedan', len: 4.9, wid: 1.92, hgt: 1.48, maxSpeed: 54, accel: 13.5, grip: 7.6, mass: 1.2, colors: ['#f4f4f0'], livery: 'police', police: true },
  barracuda: { name: 'PHPD Barracuda', style: 'sports', len: 4.6, wid: 1.98, hgt: 1.2, maxSpeed: 62, accel: 15.5, grip: 8.4, mass: 1.1, colors: ['#f4f4f0'], livery: 'police', police: true },
};

export const TRAFFIC_MIX = ['pip', 'pip', 'caravel', 'caravel', 'caravel', 'cab', 'cab', 'brute8', 'haulit', 'haulit', 'kestrel', 'coastline'];
