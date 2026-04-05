import type { CharacterTemplate, ElementType } from './types';

// ── Type Effectiveness Chart ────────────────────────────────
// 2.0 = super effective, 0.5 = not very effective, 1.0 = neutral

type TypeChart = Record<ElementType, Partial<Record<ElementType, number>>>;

export const TYPE_CHART: TypeChart = {
  militare: { natura: 2.0, frutta: 2.0, cosmico: 0.5, aquatico: 0.5 },
  natura:   { aquatico: 2.0, cucina: 2.0, militare: 0.5, frutta: 0.5 },
  aquatico: { militare: 2.0, cucina: 2.0, natura: 0.5, spirito: 0.5 },
  cosmico:  { militare: 2.0, spirito: 2.0, cucina: 0.5, natura: 0.5 },
  spirito:  { natura: 2.0, aquatico: 2.0, cosmico: 0.5, frutta: 0.5 },
  cucina:   { cosmico: 2.0, spirito: 2.0, aquatico: 0.5, militare: 0.5 },
  frutta:   { natura: 2.0, cucina: 2.0, militare: 0.5, spirito: 0.5 },
};

export function getEffectiveness(attackType: ElementType, defenderType: ElementType): number {
  return TYPE_CHART[attackType]?.[defenderType] ?? 1.0;
}

// ── Type Display Info ───────────────────────────────────────

export const TYPE_INFO: Record<ElementType, { label: string; emoji: string; color: string }> = {
  militare: { label: 'Militare', emoji: '💣', color: '#c0392b' },
  natura:   { label: 'Natura',   emoji: '🌿', color: '#27ae60' },
  aquatico: { label: 'Aquatico', emoji: '🌊', color: '#2980b9' },
  cosmico:  { label: 'Cosmico',  emoji: '✨', color: '#8e44ad' },
  spirito:  { label: 'Spirito',  emoji: '👻', color: '#2c3e50' },
  cucina:   { label: 'Cucina',   emoji: '☕', color: '#d35400' },
  frutta:   { label: 'Frutta',   emoji: '🍌', color: '#f39c12' },
};

// ── Budget costs ────────────────────────────────────────────

export const TIER_COST: Record<string, number> = { S: 5, A: 4, B: 3, C: 2 };
export const TEAM_BUDGET = 10;

// ── Unlock rewards per arena level ──────────────────────────

export const ARENA_UNLOCK_CHARS: Record<number, string[]> = {
  1: [], // beat arena 1 → unlock these
  2: ['bobrito', 'trippi-troppi'],
  3: ['cappuccino-assassino', 'lirili', 'boneca'],
  4: ['chimpanzini', 'ballerina', 'bananita'],
  5: ['tung-tung', 'vaca-saturno'],
};

// ── 16 Characters ───────────────────────────────────────────

export const CHARACTERS: CharacterTemplate[] = [
  // ── TIER S ── (cost 5, unlock via arena 5)
  {
    id: 'tung-tung',
    name: 'Tung Tung Tung Sahur',
    catchphrase: 'TUNG TUNG TUNG SAHUUUURRR!',
    type: 'spirito',
    tier: 'S', cost: 5,
    unlockArena: 5,
    description: 'The Death Herald. A wooden plank entity wielding an indestructible bat. Classified: DO NOT ENGAGE.',
    emoji: '🪵',
    portrait: {
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      icon: '🪵',
      accent: '#4a90d9',
      img: import.meta.env.BASE_URL + 'img/tung-tung.png',
    },
    hp: 110, atk: 42, def: 30, spd: 35,
    moves: [
      { name: 'Sahur Strike', type: 'spirito', power: 25, description: 'A devastating bat swing from beyond.', cooldown: 0 },
      { name: 'Do Not Engage', type: 'spirito', power: 45, description: 'Classified attack. Maximum destruction.', cooldown: 4, effect: { type: 'confuse', duration: 2 }, effectChance: 0.5 },
      { name: 'Drum of Doom', type: 'spirito', power: 18, description: 'Rhythmic terror that bleeds the soul.', cooldown: 1, effect: { type: 'bleed', duration: 3 }, effectChance: 0.7 },
      { name: 'Glitch Summon', type: 'spirito', power: 35, description: 'Reality tears open. Something comes through.', cooldown: 3, selfDamage: 10 },
    ],
  },
  {
    id: 'vaca-saturno',
    name: 'La Vaca Saturno Saturnita',
    catchphrase: 'La Vaca Saturno Saturnita...',
    type: 'cosmico',
    tier: 'S', cost: 5,
    unlockArena: 5,
    description: 'Silent cosmic entity. A cow-planet fusion with Saturn\'s rings. Stares into your soul from orbit.',
    emoji: '🪐',
    portrait: {
      bg: 'linear-gradient(135deg, #2d1b69 0%, #11001c 50%, #45108a 100%)',
      icon: '🪐',
      accent: '#a855f7',
      img: import.meta.env.BASE_URL + 'img/vaca-saturno.png',
    },
    hp: 120, atk: 40, def: 35, spd: 20,
    moves: [
      { name: 'Cosmic Stare', type: 'cosmico', power: 22, description: 'An infinite gaze from the void.', cooldown: 0 },
      { name: 'Black Hole Moo', type: 'cosmico', power: 50, description: 'A gravitational moo that devours everything.', cooldown: 4, effect: { type: 'freeze', duration: 1 }, effectChance: 0.4 },
      { name: 'Ring Orbit', type: 'cosmico', power: 15, description: 'Saturn\'s rings slice through space-time.', cooldown: 1, hits: 3 },
      { name: 'Silent Judgment', type: 'cosmico', power: 30, description: '...', cooldown: 2, effect: { type: 'brainrot', duration: 2 }, effectChance: 0.6 },
    ],
  },

  // ── TIER A ── (cost 4, unlock via arena 3-4)
  {
    id: 'bombardiro',
    name: 'Bombardiro Crocodilo',
    catchphrase: 'BOMBARDO CROCODILO!',
    type: 'militare',
    tier: 'A', cost: 4,
    unlockArena: 0,
    description: 'A crocodile fused with a WWII bomber. Committed unspeakable war crimes in the Forest Incident.',
    emoji: '🐊',
    portrait: {
      bg: 'linear-gradient(135deg, #4a1a1a 0%, #8b0000 50%, #2d0000 100%)',
      icon: '🐊',
      accent: '#ff4444',
      img: import.meta.env.BASE_URL + 'img/bombardiro.png',
    },
    hp: 100, atk: 38, def: 28, spd: 25,
    moves: [
      { name: 'Bombardo Blast', type: 'militare', power: 25, description: 'Standard explosive payload.', cooldown: 0 },
      { name: 'Carpet Bombing', type: 'militare', power: 18, description: 'Indiscriminate area bombardment.', cooldown: 3, hitsAll: true },
      { name: 'Crocodilo Bite', type: 'natura', power: 20, description: 'Prehistoric jaws snap shut.', cooldown: 1, effect: { type: 'bleed', duration: 2 }, effectChance: 0.3 },
      { name: 'War Crime', type: 'militare', power: 45, description: 'Geneva Convention? Never heard of it.', cooldown: 4, selfDamage: 12 },
    ],
  },
  {
    id: 'tralalero',
    name: 'Tralalero Tralala',
    catchphrase: 'TRALALERO... TRALALA!',
    type: 'aquatico',
    tier: 'A', cost: 4,
    unlockArena: 0,
    description: 'The OG. A three-legged blue shark in Nike sneakers. Unmatched speed and chaotic energy.',
    emoji: '🦈',
    portrait: {
      bg: 'linear-gradient(135deg, #0a2463 0%, #1e3a8a 50%, #0c4a6e 100%)',
      icon: '🦈',
      accent: '#38bdf8',
      img: import.meta.env.BASE_URL + 'img/tralalero.png',
    },
    hp: 85, atk: 35, def: 22, spd: 45,
    moves: [
      { name: 'Nike Kick', type: 'aquatico', power: 20, description: 'Triple-legged sneaker combo.', cooldown: 0 },
      { name: 'Reality Screech', type: 'spirito', power: 15, description: 'A screech that breaks the fourth wall.', cooldown: 2, effect: { type: 'confuse', duration: 2 }, effectChance: 0.5 },
      { name: 'Triple Leg Combo', type: 'aquatico', power: 12, description: 'Three legs, three kicks, no mercy.', cooldown: 2, hits: 3 },
      { name: 'Tralala Rush', type: 'aquatico', power: 35, description: 'Full-speed Nike-powered blitz.', cooldown: 3, effect: { type: 'caffeinated', duration: 2 }, effectChance: 1.0 },
    ],
  },
  {
    id: 'brr-patapim',
    name: 'Brr Brr Patapim',
    catchphrase: 'Brr. Brr. Patapim.',
    type: 'natura',
    tier: 'A', cost: 4,
    unlockArena: 0,
    description: 'Giant proboscis monkey fused with a tree. Forest guardian. Crushing feet. Retired to the Russian Taiga.',
    emoji: '🌳',
    portrait: {
      bg: 'linear-gradient(135deg, #0b3d0b 0%, #1a5c1a 50%, #0d4f0d 100%)',
      icon: '🌳',
      accent: '#4ade80',
      img: import.meta.env.BASE_URL + 'img/brr-patapim.png',
    },
    hp: 115, atk: 30, def: 38, spd: 18,
    moves: [
      { name: 'Root Slam', type: 'natura', power: 22, description: 'Ancient roots erupt from below.', cooldown: 0 },
      { name: 'Forest Growth', type: 'natura', power: 0, description: 'The forest heals its guardian. Restores 25 HP.', cooldown: 3 },
      { name: 'Vine Crush', type: 'natura', power: 28, description: 'Vines constrict and squeeze.', cooldown: 2, effect: { type: 'freeze', duration: 1 }, effectChance: 0.3 },
      { name: 'Patapim Stomp', type: 'natura', power: 40, description: 'Giant feet descend. The earth trembles.', cooldown: 3 },
    ],
  },
  {
    id: 'cappuccino-assassino',
    name: 'Cappuccino Assassino',
    catchphrase: 'Capu capu, Cappuccino Assassino...',
    type: 'cucina',
    tier: 'A', cost: 4,
    unlockArena: 3,
    description: 'Coffee-cup headed ninja assassin. Heartbroken. Deadly. Always watching.',
    emoji: '☕',
    portrait: {
      bg: 'linear-gradient(135deg, #3d1c02 0%, #6b3410 50%, #4a2106 100%)',
      icon: '☕',
      accent: '#fb923c',
      img: import.meta.env.BASE_URL + 'img/cappuccino-assassino.png',
    },
    hp: 80, atk: 42, def: 20, spd: 40,
    moves: [
      { name: 'Espresso Shuriken', type: 'cucina', power: 22, description: 'Boiling coffee stars fly.', cooldown: 0 },
      { name: 'Shadow Brew', type: 'cucina', power: 18, description: 'Disappears into the steam.', cooldown: 1, effect: { type: 'caffeinated', duration: 2 }, effectChance: 1.0 },
      { name: 'Assassin\'s Blade', type: 'cucina', power: 35, description: 'One clean cut. No mercy.', cooldown: 2 },
      { name: 'Heartbreak Fury', type: 'cucina', power: 48, description: 'All the pain of betrayal in one strike.', cooldown: 4, selfDamage: 15 },
    ],
  },

  // ── TIER B ── (cost 3)
  {
    id: 'ballerina',
    name: 'Ballerina Cappuccina',
    catchphrase: 'Ballerina... Capuchina...',
    type: 'cucina',
    tier: 'B', cost: 3,
    unlockArena: 4,
    description: 'A ballerina with a cappuccino mug for a head. Married, cheated, caught. Drama incarnate.',
    emoji: '🩰',
    portrait: {
      bg: 'linear-gradient(135deg, #4a1942 0%, #7b2d5f 50%, #3d1035 100%)',
      icon: '🩰',
      accent: '#f472b6',
      img: import.meta.env.BASE_URL + 'img/ballerina.png',
    },
    hp: 75, atk: 28, def: 25, spd: 38,
    moves: [
      { name: 'Pirouette Splash', type: 'cucina', power: 18, description: 'Hot coffee sprays in a graceful spin.', cooldown: 0 },
      { name: 'Infatuation Charm', type: 'cucina', power: 10, description: 'Mesmerizing dance.', cooldown: 2, effect: { type: 'confuse', duration: 3 }, effectChance: 0.6 },
      { name: 'Caffeine Overdose', type: 'cucina', power: 30, description: 'Too much espresso. Chaos ensues.', cooldown: 2, effect: { type: 'brainrot', duration: 1 }, effectChance: 0.4 },
      { name: 'Drama Queen', type: 'cucina', power: 25, description: 'The entire love triangle crashes down.', cooldown: 3, effect: { type: 'bleed', duration: 2 }, effectChance: 0.5 },
    ],
  },
  {
    id: 'chimpanzini',
    name: 'Chimpanzini Bananini',
    catchphrase: 'Shampanziniii... Bananinii...',
    type: 'frutta',
    tier: 'B', cost: 3,
    unlockArena: 4,
    description: 'A genius-level chimp hidden inside a banana. Master assassin. Indestructible.',
    emoji: '🍌',
    portrait: {
      bg: 'linear-gradient(135deg, #4a3800 0%, #7a6000 50%, #5c4a00 100%)',
      icon: '🍌',
      accent: '#facc15',
      img: import.meta.env.BASE_URL + 'img/chimpanzini.png',
    },
    hp: 70, atk: 40, def: 18, spd: 42,
    moves: [
      { name: 'Banana Shiv', type: 'frutta', power: 20, description: 'Not just a fruit anymore.', cooldown: 0 },
      { name: 'Peel Trap', type: 'frutta', power: 12, description: 'Classic but effective.', cooldown: 1, effect: { type: 'confuse', duration: 2 }, effectChance: 0.5 },
      { name: 'Hidden Chimp Strike', type: 'frutta', power: 35, description: 'The banana opens. Death emerges.', cooldown: 2 },
      { name: 'Tactical Assassination', type: 'frutta', power: 42, description: 'Calculated. Precise. Lethal.', cooldown: 4 },
    ],
  },
  {
    id: 'bobrito',
    name: 'Bobrito Bandito',
    catchphrase: 'Oi, Oi, Oi... BOBRITO BONDITO!',
    type: 'militare',
    tier: 'B', cost: 3,
    unlockArena: 2,
    description: 'Gangster beaver with a fedora and tommy gun. Lurks in shadows. Robs banks for fun.',
    emoji: '🦫',
    portrait: {
      bg: 'linear-gradient(135deg, #2d2d2d 0%, #4a4a4a 50%, #1a1a1a 100%)',
      icon: '🦫',
      accent: '#a3a3a3',
      img: import.meta.env.BASE_URL + 'img/bobrito.png',
    },
    hp: 90, atk: 36, def: 24, spd: 30,
    moves: [
      { name: 'Tommy Spray', type: 'militare', power: 15, description: 'Infinite ammo. No aim needed.', cooldown: 0, hits: 2 },
      { name: 'Smoke Bomb', type: 'militare', power: 8, description: 'Disappears into the night.', cooldown: 2, effect: { type: 'confuse', duration: 2 }, effectChance: 0.7 },
      { name: 'Fedora Toss', type: 'militare', power: 28, description: 'A razor-sharp hat through the air.', cooldown: 1 },
      { name: 'Bank Heist', type: 'militare', power: 38, description: 'Steals your HP and your dignity.', cooldown: 3 },
    ],
  },
  {
    id: 'trippi-troppi',
    name: 'Trippi Troppi',
    catchphrase: 'Trippi troppi, troppa trippa...',
    type: 'aquatico',
    tier: 'B', cost: 3,
    unlockArena: 2,
    description: 'Cat-shrimp? Bear-fish? Nobody knows. Exists in multiple forms across the multiverse.',
    emoji: '🦐',
    portrait: {
      bg: 'linear-gradient(135deg, #1a3a4a 0%, #2d5a6a 50%, #0d2f3f 100%)',
      icon: '🦐',
      accent: '#22d3ee',
      img: import.meta.env.BASE_URL + 'img/trippi-troppi.png',
    },
    hp: 88, atk: 32, def: 26, spd: 28,
    moves: [
      { name: 'Troppi Splash', type: 'aquatico', power: 20, description: 'Water from an unknowable dimension.', cooldown: 0 },
      { name: 'Multiverse Shift', type: 'aquatico', power: 15, description: 'Changes form. Which one? Yes.', cooldown: 2, effect: { type: 'brainrot', duration: 2 }, effectChance: 0.6 },
      { name: 'Shrimp Slap', type: 'aquatico', power: 28, description: 'Surprisingly devastating.', cooldown: 1 },
      { name: 'Identity Crisis', type: 'aquatico', power: 35, description: 'All forms attack at once.', cooldown: 3, selfDamage: 8 },
    ],
  },
  {
    id: 'lirili',
    name: 'Lirili Larila',
    catchphrase: 'Lirili Larila, elefante nel deserto...',
    type: 'natura',
    tier: 'B', cost: 3,
    unlockArena: 3,
    description: 'Bipedal elephant-cactus in oversized sandals. Desert wanderer. Survived assassination across timelines.',
    emoji: '🌵',
    portrait: {
      bg: 'linear-gradient(135deg, #2d4a1a 0%, #4a7a2d 50%, #1a3d0d 100%)',
      icon: '🌵',
      accent: '#a3e635',
      img: import.meta.env.BASE_URL + 'img/lirili.png',
    },
    hp: 95, atk: 26, def: 30, spd: 22,
    moves: [
      { name: 'Sandal Smack', type: 'natura', power: 18, description: 'Oversized footwear, maximum impact.', cooldown: 0 },
      { name: 'Cactus Shield', type: 'natura', power: 0, description: 'Spiny defense. Restores 20 HP.', cooldown: 3 },
      { name: 'Timeline Warp', type: 'natura', power: 22, description: 'Attacks from a different timeline.', cooldown: 2, effect: { type: 'confuse', duration: 1 }, effectChance: 0.4 },
      { name: 'Desert Storm', type: 'natura', power: 32, description: 'Sand and needles everywhere.', cooldown: 3, effect: { type: 'bleed', duration: 2 }, effectChance: 0.5 },
    ],
  },

  // ── TIER C ── (cost 2, always available)
  {
    id: 'frigo-camelo',
    name: 'Frigo Camelo',
    catchphrase: 'Che freddo qui dentro...',
    type: 'cucina',
    tier: 'C', cost: 2,
    unlockArena: 0,
    description: 'A camel head on a refrigerator body. Loses every fight but never stops trying. Respect.',
    emoji: '🐪',
    portrait: {
      bg: 'linear-gradient(135deg, #1a2a4a 0%, #2a4a6a 50%, #0d1f3f 100%)',
      icon: '🐪',
      accent: '#7dd3fc',
      img: import.meta.env.BASE_URL + 'img/frigo-camelo.png',
    },
    hp: 100, atk: 22, def: 32, spd: 15,
    moves: [
      { name: 'Cold Breath', type: 'cucina', power: 16, description: 'Refrigerated camel breath. Gross.', cooldown: 0 },
      { name: 'Deep Freeze', type: 'cucina', power: 12, description: 'Opens the fridge door. Everything freezes.', cooldown: 2, effect: { type: 'freeze', duration: 2 }, effectChance: 0.5 },
      { name: 'Defrost Slam', type: 'cucina', power: 28, description: 'Ice chunks fly everywhere.', cooldown: 2 },
      { name: 'Never Give Up', type: 'cucina', power: 0, description: 'Refuses to die. Restores 30 HP.', cooldown: 4 },
    ],
  },
  {
    id: 'boneca',
    name: 'Boneca Ambalabu',
    catchphrase: 'Boneka Ambalabu, entitas jahat...',
    type: 'spirito',
    tier: 'C', cost: 2,
    unlockArena: 3,
    description: 'A car tire body with a bullfrog head on human legs. Indonesian nightmare fuel. Haunting stare.',
    emoji: '🐸',
    portrait: {
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 50%, #0d0d1f 100%)',
      icon: '🐸',
      accent: '#818cf8',
      img: import.meta.env.BASE_URL + 'img/boneca.png',
    },
    hp: 85, atk: 30, def: 28, spd: 26,
    moves: [
      { name: 'Tire Roll', type: 'spirito', power: 18, description: 'Rolls menacingly toward you.', cooldown: 0 },
      { name: 'Haunting Stare', type: 'spirito', power: 14, description: 'You feel deeply uncomfortable.', cooldown: 1, effect: { type: 'confuse', duration: 2 }, effectChance: 0.5 },
      { name: 'Ambalabu Curse', type: 'spirito', power: 30, description: 'Indonesian dark magic.', cooldown: 2, effect: { type: 'brainrot', duration: 2 }, effectChance: 0.4 },
      { name: 'Frog Slam', type: 'spirito', power: 25, description: 'Leaps and lands on your face.', cooldown: 1 },
    ],
  },
  {
    id: 'rhino-toasterino',
    name: 'Rhino Toasterino',
    catchphrase: 'Rino Rino Tosterrino!',
    type: 'cucina',
    tier: 'C', cost: 2,
    unlockArena: 0,
    description: 'Rhinoceros-toaster hybrid. Zero backstory. Ejects toast at lethal velocity.',
    emoji: '🦏',
    portrait: {
      bg: 'linear-gradient(135deg, #3d2800 0%, #6b4800 50%, #4a3200 100%)',
      icon: '🦏',
      accent: '#fdba74',
      img: import.meta.env.BASE_URL + 'img/rhino-toasterino.png',
    },
    hp: 92, atk: 28, def: 30, spd: 20,
    moves: [
      { name: 'Toast Eject', type: 'cucina', power: 18, description: 'Surprise! Burning toast to the face.', cooldown: 0 },
      { name: 'Crumb Scatter', type: 'cucina', power: 12, description: 'Crumbs everywhere. Annoying and painful.', cooldown: 1, hits: 3 },
      { name: 'Rhino Charge', type: 'cucina', power: 30, description: 'Full speed, toaster glowing red.', cooldown: 2 },
      { name: 'Emergency Toast', type: 'cucina', power: 0, description: 'Eats own toast. Heals 20 HP. Questionable.', cooldown: 3 },
    ],
  },
  {
    id: 'bananita',
    name: 'Bananita Dolphinita',
    catchphrase: 'Bananitta Dolfinitta, frulli frulli frulli...',
    type: 'aquatico',
    tier: 'C', cost: 2,
    unlockArena: 4,
    description: 'A banana-dolphin hybrid with a peel-tail. Slippery, fast, impossible to catch.',
    emoji: '🐬',
    portrait: {
      bg: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a3d 50%, #0d3f2d 100%)',
      icon: '🐬',
      accent: '#34d399',
      img: import.meta.env.BASE_URL + 'img/bananita.png',
    },
    hp: 72, atk: 30, def: 18, spd: 40,
    moves: [
      { name: 'Peel Slap', type: 'aquatico', power: 16, description: 'Tail whip with banana physics.', cooldown: 0 },
      { name: 'Slippery Dodge', type: 'aquatico', power: 0, description: 'Too slippery. Gains caffeinated buff.', cooldown: 2, effect: { type: 'caffeinated', duration: 3 }, effectChance: 1.0 },
      { name: 'Dolphin Leap', type: 'aquatico', power: 28, description: 'Majestic airborne banana impact.', cooldown: 1 },
      { name: 'Frulli Rush', type: 'aquatico', power: 34, description: 'Full-speed frulli combo.', cooldown: 3 },
    ],
  },
  {
    id: 'orangutini',
    name: 'Orangutini Ananasini',
    catchphrase: 'Orangutini Ananasiniiiii!',
    type: 'frutta',
    tier: 'C', cost: 2,
    unlockArena: 0,
    description: 'Orangutan-pineapple hybrid. Tropical chaos agent. Fruit armor. Pure brawler energy.',
    emoji: '🍍',
    portrait: {
      bg: 'linear-gradient(135deg, #3d3d00 0%, #6b6b00 50%, #4a4a00 100%)',
      icon: '🍍',
      accent: '#fbbf24',
      img: import.meta.env.BASE_URL + 'img/orangutini.png',
    },
    hp: 95, atk: 34, def: 26, spd: 22,
    moves: [
      { name: 'Pineapple Punch', type: 'frutta', power: 20, description: 'Spiky fist to the face.', cooldown: 0 },
      { name: 'Fruit Armor', type: 'frutta', power: 0, description: 'Hardens the pineapple shell. Heals 15 HP.', cooldown: 3 },
      { name: 'Tropical Slam', type: 'frutta', power: 30, description: 'Full-body pineapple press.', cooldown: 2 },
      { name: 'Jungle Rage', type: 'frutta', power: 38, description: 'Goes full ape. Unstoppable.', cooldown: 3, selfDamage: 8, effect: { type: 'caffeinated', duration: 2 }, effectChance: 0.8 },
    ],
  },
];

// ── Starter characters (always available) ───────────────────

export const STARTER_IDS = CHARACTERS.filter(c => c.unlockArena === 0).map(c => c.id);
