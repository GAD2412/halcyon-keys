// The story of HALCYON KEYS: Nico Vale comes home to Port Halcyon and works for Auntie Pearl's crew
// against the Rustline Kings and Cassius Wren's Gilded Tide: nine missions in three acts. Each mission
// is a list of steps the mission director runs, with dialogue cards between them.
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
    id: 'ninefold-tail', letter: 'T', title: 'Ninefold Tail', act: 'Act I', giver: 'tuck', start: PLACES.garage,
    reward: 1000, respect: 100,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'tuck', text: 'A Rustline Kings truck rolls out of the yards every evening. Nobody knows where it goes.' },
        { who: 'tuck', text: 'Take the Pip. Follow the truck. Not too close, Nico, Oz has eyes in the back of his head.' },
      ] },
      { type: 'enterVehicle', text: 'Get in the <b>Pip</b>', spawn: { type: 'pip', x: 198.25, z: -55, h: 0, paint: '#8fd7d0' } },
      { type: 'tail', text: 'Tail the Kings truck', time: 45, spawn: { type: 'haulit', x: 194.75, z: 25, h: 0, paint: '#c0503a', cruise: 9 } },
      { type: 'dialogue', lines: [
        { who: 'oz', text: '(on the radio) Load goes to the ferry slip. Tell nobody, tell the Tide.' },
        { who: 'tuck', text: 'So the Kings run for Cassius Wren. That changes things.' },
      ] },
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
    id: 'long-lens', letter: 'L', title: 'Long Lens', act: 'Act II', giver: 'lux', start: { x: -425, z: 312, name: 'Halo Pier boardwalk' },
    reward: 1500, respect: 120,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'lux', text: 'Cassius Wren meets the harbor master on Halo Pier at sundown.' },
        { who: 'lux', text: 'Get under the lifeguard tower and watch. Stay put until I have the whole conversation.' },
      ] },
      { type: 'goto', text: 'Get to the <b>lifeguard tower</b> by the pier', x: -444, z: 343, r: 6 },
      { type: 'hold', text: 'Watch the deal', x: -444, z: 343, r: 8, time: 15 },
      { type: 'dialogue', lines: [
        { who: 'cassius', text: '(far off) The harbor, the docks, the boulevard. By summer the Keys are mine.' },
        { who: 'lux', text: 'Got all of it. Wren is buying the harbor and the Kings are his muscle.' },
      ] },
    ],
  },
  {
    id: 'armored-tuesday', letter: 'T', title: 'Armored Tuesday', act: 'Act III', giver: 'tuck', start: { x: 291, z: -209, name: 'Rustline Yards gate' },
    reward: 4000, respect: 220,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'tuck', text: "Wren's armored truck leaves the Glasswater mint every Tuesday. Today is Tuesday." },
        { who: 'tuck', text: 'Ram it, shoot it, wreck it. Then bring the money home with the whole PHPD behind you.' },
      ] },
      { type: 'destroy', text: 'Wreck the armored truck', spawn: [{ type: 'haulit', x: 105.25, z: -60, h: Math.PI, paint: '#4a5a4a', health: 140, cruise: 11 }] },
      { type: 'escape', text: 'Escape with the cash', stars: 4, x: PLACES.garage.x - 9, z: PLACES.garage.z },
      { type: 'drive', text: "Bring the cash to <b>Tuck's Body & Soul</b>", x: PLACES.garage.x - 9, z: PLACES.garage.z, r: 10 },
      { type: 'dialogue', lines: [{ who: 'tuck', text: "Wren's money, our garage. I could get used to Tuesdays." }] },
    ],
  },
  {
    id: 'wrens-convoy', letter: 'P', title: "Wren's Convoy", act: 'Act III', giver: 'pearl', start: { x: -109, z: -250, name: 'Mango Hill overlook' },
    reward: 3000, respect: 200,
    steps: [
      { type: 'dialogue', lines: [
        { who: 'pearl', text: "Two black Kestrels carry Wren's lieutenants down from Mango Hill." },
        { who: 'pearl', text: 'They do not reach the docks. Stop them, Nico.' },
      ] },
      { type: 'destroy', text: 'Wreck the convoy', spawn: [
        { type: 'kestrel', x: -101.75, z: -300, h: 0, paint: '#111214', health: 90, cruise: 13, flee: true },
        { type: 'kestrel', x: -101.75, z: -322, h: 0, paint: '#111214', health: 90, cruise: 13, flee: true },
      ] },
      { type: 'escape', text: 'Lose the PHPD', stars: 3 },
      { type: 'dialogue', lines: [{ who: 'pearl', text: 'Wren is out of lieutenants. Now he has to come himself.' }] },
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
