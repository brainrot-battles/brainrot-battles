import type { BattleCharacter, BattleState, CharacterTemplate, Move, StatusEffect } from './types';
import { getEffectiveness, CHARACTERS } from './data';

// ── Create Battle Character from Template ───────────────────

export function createBattleChar(template: CharacterTemplate): BattleCharacter {
  return {
    template,
    currentHp: template.hp,
    maxHp: template.hp,
    status: null,
    cooldowns: template.moves.map(() => 0),
    isAlive: true,
  };
}

// ── Initialize Battle State ─────────────────────────────────

export function initBattle(playerTeam: CharacterTemplate[], cpuTeam: CharacterTemplate[]): BattleState {
  return {
    playerTeam: playerTeam.map(createBattleChar),
    cpuTeam: cpuTeam.map(createBattleChar),
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
  const atkStat = attacker.template.atk;
  const defStat = defender.template.def;

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
    const selfDmg = Math.round(attacker.template.atk * 0.5);
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

export function cpuChooseMove(cpu: BattleCharacter, player: BattleCharacter): number {
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

    // Small random factor
    score += Math.random() * 10;

    return { index, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].index;
}

// ── CPU Team Generation ─────────────────────────────────────

export function generateCpuTeam(playerTeam: CharacterTemplate[], arenaLevel: number): CharacterTemplate[] {
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

  return team;
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
  const pSpd = player.template.spd * (player.status?.type === 'caffeinated' ? 1.5 : 1);
  const cSpd = cpu.template.spd * (cpu.status?.type === 'caffeinated' ? 1.5 : 1);
  if (pSpd === cSpd) return Math.random() < 0.5 ? 'player' : 'cpu';
  return pSpd > cSpd ? 'player' : 'cpu';
}
