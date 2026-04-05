import type { BattleCharacter, BattleState, CharacterTemplate, Move, StatusEffect } from './types';
import {
  getEffectiveness, CHARACTERS, LEVEL_STAT_BONUS, MAX_LEVEL,
  XP_WIN, XP_LOSE, XP_PER_ARENA, XP_PER_FLOOR, ELO_K,
} from './data';

// ── Scaled Stats ───────────────────────────────────────────

export function getScaledStat(base: number, level: number): number {
  return Math.round(base * (1 + (level - 1) * LEVEL_STAT_BONUS));
}

// ── Create Battle Character from Template ───────────────────

export function createBattleChar(template: CharacterTemplate, level: number = 1): BattleCharacter {
  const scaledHp = getScaledStat(template.hp, level);
  return {
    template,
    level,
    currentHp: scaledHp,
    maxHp: scaledHp,
    status: null,
    cooldowns: template.moves.map(() => 0),
    isAlive: true,
  };
}

// ── Initialize Battle State ─────────────────────────────────

export function initBattle(
  playerTeam: CharacterTemplate[],
  cpuTeam: CharacterTemplate[],
  playerLevels: number[] = [1, 1, 1],
  cpuLevels: number[] = [1, 1, 1],
): BattleState {
  return {
    playerTeam: playerTeam.map((t, i) => createBattleChar(t, playerLevels[i])),
    cpuTeam: cpuTeam.map((t, i) => createBattleChar(t, cpuLevels[i])),
    playerActive: 0,
    cpuActive: 0,
    turn: 'player',
    phase: 'select_action',
    log: ['⚔️ BATTLE START! Choose your attack!'],
    winner: null,
  };
}

// ── Damage Calculation ──────────────────────────────────────

export function calculateDamage(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  move: Move
): { damage: number; effectiveness: number } {
  // Healing moves
  if (move.power === 0) return { damage: 0, effectiveness: 1 };

  const effectiveness = getEffectiveness(move.type, defender.template.type);
  const atkStat = getScaledStat(attacker.template.atk, attacker.level);
  const defStat = getScaledStat(defender.template.def, defender.level);

  // Base formula: (power * atk/def * effectiveness) with some randomness
  const base = (move.power * (atkStat / defStat)) * effectiveness;
  const randomFactor = 0.85 + Math.random() * 0.3; // 0.85 - 1.15
  let damage = Math.round(base * randomFactor);

  // Multi-hit
  if (move.hits && move.hits > 1) {
    damage = Math.round(damage / move.hits) * move.hits; // Keep total similar
  }

  return { damage: Math.max(1, damage), effectiveness };
}

// ── Apply Move ──────────────────────────────────────────────

export interface MoveResult {
  damage: number;
  effectiveness: number;
  healed: number;
  selfDamage: number;
  statusApplied: StatusEffect | null;
  hitSelf: boolean; // confused self-hit
}

export function applyMove(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  moveIndex: number
): MoveResult {
  const result: MoveResult = {
    damage: 0,
    effectiveness: 1,
    healed: 0,
    selfDamage: 0,
    statusApplied: null,
    hitSelf: false,
  };

  // Check confusion - 30% chance to hit self
  if (attacker.status?.type === 'confuse' && Math.random() < 0.3) {
    const selfDmg = Math.round(getScaledStat(attacker.template.atk, attacker.level) * 0.5);
    attacker.currentHp = Math.max(0, attacker.currentHp - selfDmg);
    result.hitSelf = true;
    result.selfDamage = selfDmg;
    if (attacker.currentHp <= 0) attacker.isAlive = false;
    return result;
  }

  // Check brainrot - use random move instead
  let actualMoveIndex = moveIndex;
  if (attacker.status?.type === 'brainrot') {
    const available = attacker.template.moves
      .map((_, i) => i)
      .filter(i => attacker.cooldowns[i] === 0);
    if (available.length > 0) {
      actualMoveIndex = available[Math.floor(Math.random() * available.length)];
    }
  }

  const actualMove = attacker.template.moves[actualMoveIndex];

  // Healing move
  if (actualMove.power === 0 && actualMove.cooldown > 0) {
    // Parse heal amount from description or use default
    const healMatch = actualMove.description.match(/(\d+)\s*HP/);
    const healAmount = healMatch ? parseInt(healMatch[1]) : 20;
    const healed = Math.min(healAmount, attacker.maxHp - attacker.currentHp);
    attacker.currentHp += healed;
    result.healed = healed;

    // Buff effect
    if (actualMove.effect && actualMove.effectChance && Math.random() < actualMove.effectChance) {
      attacker.status = { ...actualMove.effect };
      result.statusApplied = actualMove.effect;
    }
  } else {
    // Damage move
    const { damage, effectiveness } = calculateDamage(attacker, defender, actualMove);
    result.damage = damage;
    result.effectiveness = effectiveness;
    defender.currentHp = Math.max(0, defender.currentHp - damage);
    if (defender.currentHp <= 0) defender.isAlive = false;

    // Status effect
    if (actualMove.effect && actualMove.effectChance && Math.random() < actualMove.effectChance) {
      // Caffeinated is self-buff, others go on defender
      if (actualMove.effect.type === 'caffeinated') {
        attacker.status = { ...actualMove.effect };
      } else {
        defender.status = { ...actualMove.effect };
      }
      result.statusApplied = actualMove.effect;
    }

    // Self damage (recoil)
    if (actualMove.selfDamage) {
      attacker.currentHp = Math.max(0, attacker.currentHp - actualMove.selfDamage);
      result.selfDamage = actualMove.selfDamage;
      if (attacker.currentHp <= 0) attacker.isAlive = false;
    }
  }

  // Set cooldown
  attacker.cooldowns[actualMoveIndex] = actualMove.cooldown;

  return result;
}

// ── Tick Status Effects & Cooldowns ─────────────────────────

export function tickEndOfTurn(char: BattleCharacter): { bleedDamage: number } {
  let bleedDamage = 0;

  // Reduce cooldowns
  char.cooldowns = char.cooldowns.map(cd => Math.max(0, cd - 1));

  // Status effects
  if (char.status) {
    if (char.status.type === 'bleed') {
      bleedDamage = 5;
      char.currentHp = Math.max(0, char.currentHp - bleedDamage);
      if (char.currentHp <= 0) char.isAlive = false;
    }

    char.status.duration -= 1;
    if (char.status.duration <= 0) {
      char.status = null;
    }
  }

  return { bleedDamage };
}

// ── CPU AI ──────────────────────────────────────────────────

export function cpuChooseMove(cpu: BattleCharacter, player: BattleCharacter, smartness: number = 0.5): number {
  const available = cpu.template.moves
    .map((move, i) => ({ move, index: i }))
    .filter(({ index }) => cpu.cooldowns[index] === 0);

  if (available.length === 0) return 0; // fallback (shouldn't happen with 0-cooldown basics)

  // Score each move
  const scored = available.map(({ move, index }) => {
    let score = move.power;

    // Type effectiveness bonus
    const eff = getEffectiveness(move.type, player.template.type);
    score *= eff;

    // Prefer finishing blows
    if (move.power > 0) {
      const est = calculateDamage(cpu, player, move);
      if (est.damage >= player.currentHp) score += 50;
    }

    // Healing when low HP
    if (move.power === 0 && cpu.currentHp < cpu.maxHp * 0.4) {
      score += 40;
    }

    // Penalize self-damage when low HP
    if (move.selfDamage && cpu.currentHp < cpu.maxHp * 0.3) {
      score -= 30;
    }

    // Random factor scales inversely with smartness (smarter = less random)
    const randomRange = 10 * (1 - smartness * 0.8); // 10 at 0, 2 at 1
    score += Math.random() * randomRange;

    return { index, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].index;
}

// ── CPU Team Generation (Arena Mode) ────────────────────────

export function generateCpuTeam(
  playerTeam: CharacterTemplate[],
  arenaLevel: number
): { team: CharacterTemplate[]; levels: number[] } {
  const available = CHARACTERS.filter(c => !playerTeam.some(p => p.id === c.id));

  // Higher arena = more high-tier characters
  const weights: Record<string, number> = {
    S: arenaLevel >= 4 ? 3 : arenaLevel >= 3 ? 1 : 0,
    A: arenaLevel >= 2 ? 3 : 1,
    B: 2,
    C: arenaLevel <= 2 ? 3 : 1,
  };

  const weighted = available.flatMap(c => {
    const w = weights[c.tier] || 1;
    return Array(w).fill(c);
  });

  const team: CharacterTemplate[] = [];
  while (team.length < 3 && weighted.length > 0) {
    const idx = Math.floor(Math.random() * weighted.length);
    const pick = weighted[idx];
    if (!team.some(t => t.id === pick.id)) {
      team.push(pick);
    }
    // Remove all copies to avoid duplicates
    for (let i = weighted.length - 1; i >= 0; i--) {
      if (weighted[i].id === pick.id) weighted.splice(i, 1);
    }
  }

  // Arena CPU levels: modest scaling (1 at arena 1, up to 5 at arena 5)
  const baseLevel = Math.min(5, arenaLevel);
  const levels = team.map(() => baseLevel + Math.floor(Math.random() * 2));

  return { team, levels };
}

// ── CPU Team Generation (Endless Mode) ──────────────────────

export function generateEndlessCpuTeam(
  playerTeam: CharacterTemplate[],
  floor: number
): { team: CharacterTemplate[]; levels: number[] } {
  const weights: Record<string, number> = {
    S: floor >= 20 ? 5 : floor >= 10 ? 3 : floor >= 6 ? 1 : 0,
    A: floor >= 10 ? 4 : floor >= 5 ? 3 : 1,
    B: floor <= 10 ? 3 : 1,
    C: floor <= 5 ? 3 : floor <= 10 ? 1 : 0,
  };

  // Boss floors every 5: themed team
  const isBoss = floor % 5 === 0 && floor > 0;

  let pool = CHARACTERS.filter(c => !playerTeam.some(p => p.id === c.id));

  if (isBoss && floor >= 20) {
    // Late bosses: only S/A tier
    const elitePool = pool.filter(c => c.tier === 'S' || c.tier === 'A');
    if (elitePool.length >= 3) pool = elitePool;
  }

  const weighted = pool.flatMap(c => Array(weights[c.tier] || 1).fill(c));
  const team: CharacterTemplate[] = [];
  const tempWeighted = [...weighted];

  while (team.length < 3 && tempWeighted.length > 0) {
    const idx = Math.floor(Math.random() * tempWeighted.length);
    const pick = tempWeighted[idx];
    if (!team.some(t => t.id === pick.id)) {
      team.push(pick);
    }
    for (let i = tempWeighted.length - 1; i >= 0; i--) {
      if (tempWeighted[i].id === pick.id) tempWeighted.splice(i, 1);
    }
  }

  // CPU levels scale with floor
  const baseLevel = Math.min(MAX_LEVEL, 1 + Math.floor(floor * 0.6));
  const levels = team.map(() => Math.min(MAX_LEVEL, baseLevel + Math.floor(Math.random() * 3)));

  return { team, levels };
}

// ── XP Reward Calculation ───────────────────────────────────

export function calculateXpReward(won: boolean, arenaLevel: number, floor: number, mode: 'arena' | 'endless'): number {
  let xp = won ? XP_WIN : XP_LOSE;
  if (mode === 'arena') {
    xp += arenaLevel * XP_PER_ARENA;
  } else {
    xp += floor * XP_PER_FLOOR;
  }
  return xp;
}

// ── ELO Calculation ─────────────────────────────────────────

export function calculateElo(currentElo: number, floor: number, won: boolean): number {
  const floorRating = 1000 + floor * 40;
  const expected = 1 / (1 + Math.pow(10, (floorRating - currentElo) / 400));
  const score = won ? 1 : 0;
  return Math.round(currentElo + ELO_K * (score - expected));
}

// ── Endless AI Smartness ────────────────────────────────────

export function getEndlessSmartness(floor: number): number {
  if (floor >= 20) return 0.95;
  if (floor >= 10) return 0.7;
  if (floor >= 5) return 0.5;
  return 0.3;
}

// ── Check Frozen ────────────────────────────────────────────

export function isFrozen(char: BattleCharacter): boolean {
  return char.status?.type === 'freeze' ? true : false;
}

// ── Get next alive index ────────────────────────────────────

export function getNextAlive(team: BattleCharacter[], currentIndex: number): number | null {
  for (let i = 0; i < team.length; i++) {
    if (i !== currentIndex && team[i].isAlive) return i;
  }
  return null;
}

export function isTeamDefeated(team: BattleCharacter[]): boolean {
  return team.every(c => !c.isAlive);
}

// ── Speed comparison for turn order ─────────────────────────

export function getFirstAttacker(
  player: BattleCharacter,
  cpu: BattleCharacter
): 'player' | 'cpu' {
  const pSpd = getScaledStat(player.template.spd, player.level) * (player.status?.type === 'caffeinated' ? 1.5 : 1);
  const cSpd = getScaledStat(cpu.template.spd, cpu.level) * (cpu.status?.type === 'caffeinated' ? 1.5 : 1);
  if (pSpd === cSpd) return Math.random() < 0.5 ? 'player' : 'cpu';
  return pSpd > cSpd ? 'player' : 'cpu';
}
