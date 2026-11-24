// The story of HALCYON KEYS: Nico Vale comes home to Port Halcyon and works for Auntie Pearl's crew
// against the Rustline Kings and Cassius Wren's Gilded Tide. Each mission is a list of steps the
// mission director runs, with dialogue cards between them.
import { PLACES } from '../world/cityPlan.js';

export const MISSIONS = [
  {
    id: 'homecoming', letter: 'P', title: 'Homecoming', act: 'Act I', giver: 'pearl', start: PLACES.pier,
    reward: 500, respect: 60,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'pearl', text: 'Nico Vale. Six years gone and you come back looking like a postcard.' },
        { who: 'nico', text: 'Missed the light, Auntie. Nowhere else does sunsets like the Keys.' },
        { who: 'pearl', text: 'My Caravel is on the boulevard. Drive me home. Slowly. This city has eyes.' },
      ] },
      { type: 'enterVehicle', text: "Get in Pearl's <b>Caravel</b>", spawn: { type: 'caravel', x: -394.75, z: 318, h: Math.PI, paint: '#f4f1ea' } },
      { type: 'drive', text: 'Drive to <b>Suds & Sons Laundromat</b>', x: PLACES.safehouse.x, z: PLACES.safehouse.z, r: 9 },
      { type: 'dialogue', lines: [
        { who: 'pearl', text: 'The laundromat is ours now. Washer three hides the safe. Save your life there.' },
        { who: 'pearl', text: 'Tuck has work for a wheelman. Come see me when you are ready.' },
      ] },
    ],
  },
  {
    id: 'borrowed-paint', letter: 'P', title: 'Borrowed Paint', act: 'Act I', giver: 'tuck', start: PLACES.safehouse,
    reward: 1500, respect: 120,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'tuck', text: 'Nico! A gold Kestrel GT is idling at the Glasswater valet. The owner owes me.' },
        { who: 'tuck', text: 'Bring it to the Body & Soul. Lose any cops first. I do not do cops.' },
      ] },
      { type: 'goto', text: 'Go to the <b>Glasswater Valet</b>', x: PLACES.valet.x, z: PLACES.valet.z, r: 14 },
      { type: 'enterVehicle', text: 'Steal the gold <b>Kestrel GT</b>', spawn: { type: 'kestrel', x: 105.2, z: -150, h: Math.PI, paint: '#ffc23a' }, wanted: 2 },
      { type: 'loseWanted', text: 'Lose the <b>PHPD</b>' },
      { type: 'drive', text: "Deliver the Kestrel to <b>Tuck's Body & Soul</b>", x: PLACES.garage.x - 9, z: PLACES.garage.z, r: 10, needMissionCar: true },
      { type: 'dialogue', lines: [{ who: 'tuck', text: 'Not a scratch. Okay, some scratches. Here is your cut, wheelman.' }] },
    ],
  },
  {
    id: 'lantern-night', letter: 'L', title: 'Lantern Night', act: 'Act II', giver: 'lux', start: { x: -250, z: 9, name: 'Night Market Gate' },
    reward: 2000, respect: 180, giveWeapon: { smg: 150, pistol: 48 },
    steps: [
      { type: 'dialogue', lines: [
        { who: 'lux', text: "Rustline Kings are leaning on Pearl's stall at the night market. Six of them." },
        { who: 'lux', text: 'Take this Hornet. Make them leave, or make them sorry.' },
      ] },
      { type: 'eliminate', text: 'Defend the stall', spawn: [[-262, 40], [-240, 44], [-250, 70], [-232, 56], [-268, 66], [-246, 30]] },
      { type: 'dialogue', lines: [
        { who: 'oz', text: '(radio) You just started a war in my quarter, beach boy.' },
        { who: 'lux', text: 'The Kings will remember that. So will the market. Drinks are on Pearl.' },
      ] },
    ],
  },
  {
    id: 'hot-wire', letter: 'P', title: 'Hot Wire', act: 'Act II', giver: 'pearl', start: { x: 109, z: -150, name: 'Halcyon Tower' },
    reward: 1200, respect: 100,
    steps: [
      { type: 'dialogue', lines: [{ who: 'pearl', text: 'Three envelopes, three addresses, one hundred seconds. Do not stop for lights.' }] },
      { type: 'enterVehicle', text: 'Take the <b>Brute 8</b>', spawn: { type: 'brute8', x: 98.25, z: -172, h: 0, paint: '#e0482f' } },
      { type: 'checkpoints', text: 'Courier drop', time: 100, points: [[0, -100], [-100, 100], [200, 0]] },
      { type: 'dialogue', lines: [{ who: 'pearl', text: 'All three, on time. The Tide noticed. Good.' }] },
    ],
  },
  {
    id: 'low-sun', letter: 'P', title: 'Low Sun', act: 'Act III', giver: 'pearl', start: PLACES.docks,
    reward: 5000, respect: 300,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'pearl', text: "Cassius Wren's courier carries the Gilded Tide ledger along Flamingo Mile at sunset." },
        { who: 'cassius', text: '(on the wire) Nothing moves in Port Halcyon without the Tide, Miss Doucet.' },
        { who: 'pearl', text: 'Take the ledger, Nico. Then outrun every cruiser in the Keys.' },
      ] },
      { type: 'goto', text: 'Intercept the courier on <b>Flamingo Mile</b>', x: -401, z: -125, r: 24 },
      { type: 'eliminate', text: 'Take the ledger from the courier crew', spawn: [[-411, -168], [-414, -160], [-409, -152]] },
      { type: 'escape', text: 'Escape the PHPD', stars: 4, x: PLACES.safehouse.x, z: PLACES.safehouse.z },
      { type: 'drive', text: 'Bring the ledger to <b>Suds & Sons</b>', x: PLACES.safehouse.x, z: PLACES.safehouse.z, r: 9 },
      { type: 'dialogue', lines: [
        { who: 'pearl', text: 'The whole Tide in one little book. Port Halcyon just changed hands, Nico.' },
        { who: 'nico', text: 'Then let us keep the lights on, Auntie.' },
      ] },
    ],
  },
];
