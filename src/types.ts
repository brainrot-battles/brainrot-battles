// ── Core Types ──────────────────────────────────────────────

export type ElementType =
  | 'militare'
  | 'natura'
  | 'aquatico'
  | 'cosmico'
  | 'spirito'
  | 'cucina'
  | 'frutta';

export interface Move {
  name: string;
  type: ElementType;
  power: number;
  description: string;
  cooldown: number; // turns before reuse (0 = no cooldown)
  effect?: StatusEffect;
  effectChance?: number; // 0-1
  hits?: number; // multi-hit moves
  selfDamage?: number; // recoil
  hitsAll?: boolean; // AoE (for future use)
}

export type StatusEffectType = 'bleed' | 'confuse' | 'freeze' | 'caffeinated' | 'brainrot';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // turns
}

export interface CharacterTemplate {
  id: string;
  name: string;
  catchphrase: string;
  type: ElementType;
  tier: 'S' | 'A' | 'B' | 'C';
  description: string;
  emoji: string; // visual placeholder
  hp: number;
  atk: number;
  def: number;
  spd: number;
  moves: Move[];
}

export interface BattleCharacter {
  template: CharacterTemplate;
  currentHp: number;
  maxHp: number;
  status: StatusEffect | null;
  cooldowns: number[]; // cooldown remaining per move index
  isAlive: boolean;
}

export interface BattleState {
  playerTeam: BattleCharacter[];
  cpuTeam: BattleCharacter[];
  playerActive: number; // index
  cpuActive: number;
  turn: 'player' | 'cpu';
  phase: 'select_action' | 'animating' | 'switch' | 'game_over';
  log: string[];
  winner: 'player' | 'cpu' | null;
}

export type Screen = 'title' | 'select' | 'battle' | 'result';

export interface GameState {
  screen: Screen;
  playerTeam: CharacterTemplate[];
  cpuTeam: CharacterTemplate[];
  battle: BattleState | null;
  arenaLevel: number;
}
