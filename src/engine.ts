import type { BattleCharacter, BattleState, CharacterTemplate, Move, StatusEffect } from './types';
import {
  getEffectiveness, CHARACTERS, ITEMS, LEVEL_STAT_BONUS, MAX_LEVEL,
  XP_WIN, XP_LOSE, XP_PER_ARENA, XP_PER_FLOOR, ELO_K,
} from './data';

// ── Scaled Stats ───────────────────────────────────────────

export function getScaledStat(base: number, level: number): number {
  return Math.round(base * (1 + (level - 1) * LEVEL_STAT_BONUS));
}

// ── Create Battle Character from Template ───────────────────

export function createBattleChar(
  template: CharacterTemplate,
  level: number = 1,
  item: string | null = null,
): BattleCharacter {
  let scaledHp = getScaledStat(template.hp, level);

  // Orangutini passive: Fruit Armor → +10% max HP at battle start
  if (template.passive.id === 'fruit-armor') {
    scaledHp = Math.round(scaledHp * 1.1);
  }

  return {
    template,
    level,
    item,
    hasAttacked: false,
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
  playerItems: (string | null)[] = [null, null, null],
  cpuItems: (string | null)[] = [null, null, null],
): BattleState {
  return {
    playerTeam: playerTeam.map((t, i) => createBattleChar(t, playerLevels[i], playerItems[i])),
    cpuTeam: cpuTeam.map((t, i) => createBattleChar(t, cpuLevels[i], cpuItems[i])),
    playerActive: 0,
    cpuActive: 0,
    turn: 'player',
    phase: 'select_action',
    log: ['⚔️ BATTLE START! Choose your attack!'],
    winner: null,
  };
}

// ── Damage Calculation ──────────────────────────────────────

export interface DamageResult {
  damage: number;
  effectiveness: number;
  dodged: boolean;
}

export function calculateDamage(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  move: Move,
  attackerTeam?: BattleCharacter[],
): DamageResult {
  // Healing moves
  if (move.power === 0) return { damage: 0, effectiveness: 1, dodged: false };

  // Bananita passive: Slippery → 20% dodge
  if (defender.template.passive.id === 'slippery' && Math.random() < 0.2) {
    return { damage: 0, effectiveness: 1, dodged: true };
  }

  const effectiveness = getEffectiveness(move.type, defender.template.type);
  const atkStat = getScaledStat(attacker.template.atk, attacker.level);
  const defStat = getScaledStat(defender.template.def, defender.level);

  // Base formula
  const base = (move.power * (atkStat / defStat)) * effectiveness;
  const randomFactor = 0.85 + Math.random() * 0.3;
  let damage = base * randomFactor;

  // ── Offensive Passive Modifiers ──

  // Death Herald: +10% DMG when an ally has fainted
  if (attacker.template.passive.id === 'death-herald' && attackerTeam) {
    if (attackerTeam.some(c => c !== attacker && !c.isAlive)) {
      damage *= 1.1;
    }
  }

  // Collateral Damage: +15% DMG on super-effective
  if (attacker.template.passive.id === 'collateral' && effectiveness > 1) {
    damage *= 1.15;
  }

  // First Strike: first attack +20% DMG
  if (attacker.template.passive.id === 'first-strike' && !attacker.hasAttacked) {
    damage *= 1.2;
  }

  // Shakedown: multi-hit +10% DMG
  if (attacker.template.passive.id === 'shakedown' && move.hits && move.hits > 1) {
    damage *= 1.1;
  }

  // ── Offensive Item Modifiers ──

  // Power Crystal: +8% DMG
  if (attacker.item === 'power-crystal') {
    damage *= 1.08;
  }

  // Glass Cannon: +20% DMG
  if (attacker.item === 'glass-cannon') {
    damage *= 1.2;
  }

  // Life Orb: +12% DMG
  if (attacker.item === 'life-orb') {
    damage *= 1.12;
  }

  // Last Stand: +25% DMG when below 30% HP
  if (attacker.item === 'last-stand' && attacker.currentHp < attacker.maxHp * 0.3) {
    damage *= 1.25;
  }

  // ── Defensive Passive Modifiers ──

  // Forest Shield: -10% incoming damage
  if (defender.template.passive.id === 'forest-shield') {
    damage *= 0.9;
  }

  // Never Quit: +20% DEF when below 25% HP
  if (defender.template.passive.id === 'never-quit' && defender.currentHp < defender.maxHp * 0.25) {
    damage *= 0.8;
  }

  // ── Defensive Item Modifiers ──

  // Iron Plate: -8% incoming damage
  if (defender.item === 'iron-plate') {
    damage *= 0.92;
  }

  // Glass Cannon (defender): +10% incoming damage
  if (defender.item === 'glass-cannon') {
    damage *= 1.1;
  }

  // Multi-hit: keep total similar
  if (move.hits && move.hits > 1) {
    damage = Math.round(damage / move.hits) * move.hits;
  }

  return { damage: Math.max(1, Math.round(damage)), effectiveness, dodged: false };
}

// ── Status Resistance Check ────────────────────────────────

function resistsStatus(target: BattleCharacter): boolean {
  // Multiverse Form: 25% resist
  if (target.template.passive.id === 'multiverse-form' && Math.random() < 0.25) {
    return true;
  }
  // Status Charm item: 30% resist
  if (target.item === 'status-charm' && Math.random() < 0.3) {
    return true;
  }
  return false;
}

// ── Apply Move ──────────────────────────────────────────────

export interface MoveResult {
  damage: number;
  effectiveness: number;
  healed: number;
  selfDamage: number;
  statusApplied: StatusEffect | null;
  hitSelf: boolean;
  dodged: boolean;
}

export function applyMove(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  moveIndex: number,
  attackerTeam?: BattleCharacter[],
): MoveResult {
  const result: MoveResult = {
    damage: 0,
    effectiveness: 1,
    healed: 0,
    selfDamage: 0,
    statusApplied: null,
    hitSelf: false,
    dodged: false,
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
    const dmgResult = calculateDamage(attacker, defender, actualMove, attackerTeam);
    result.damage = dmgResult.damage;
    result.effectiveness = dmgResult.effectiveness;
    result.dodged = dmgResult.dodged;

    if (dmgResult.dodged) {
      // Dodged: no damage, no status, no recoil
      attacker.hasAttacked = true;
      attacker.cooldowns[actualMoveIndex] = actualMove.cooldown;
      return result;
    }

    defender.currentHp = Math.max(0, defender.currentHp - dmgResult.damage);
    if (defender.currentHp <= 0) defender.isAlive = false;

    // Status effect
    if (actualMove.effect && actualMove.effectChance) {
      let effectChance = actualMove.effectChance;

      // Lucky Clover: +15% status chance
      if (attacker.item === 'lucky-clover') {
        effectChance = Math.min(1, effectChance + 0.15);
      }

      if (Math.random() < effectChance) {
        // Caffeinated is self-buff, others go on defender
        if (actualMove.effect.type === 'caffeinated') {
          attacker.status = { ...actualMove.effect };
          result.statusApplied = actualMove.effect;
        } else {
          // Check defender's status resistance
          if (!resistsStatus(defender)) {
            const appliedEffect = { ...actualMove.effect };
            // Soul Stare: status effects last +1 turn
            if (attacker.template.passive.id === 'soul-stare') {
              appliedEffect.duration += 1;
            }
            defender.status = appliedEffect;
            result.statusApplied = actualMove.effect;
          }
        }
      }
    }

    // Self damage (recoil)
    if (actualMove.selfDamage) {
      let recoil = actualMove.selfDamage;

      // Toast Armor: 20% chance to negate recoil
      if (attacker.template.passive.id === 'toast-armor' && Math.random() < 0.2) {
        recoil = 0;
      }

      // Life Orb: extra 5 recoil
      if (attacker.item === 'life-orb') {
        recoil += 5;
      }

      if (recoil > 0) {
        attacker.currentHp = Math.max(0, attacker.currentHp - recoil);
        result.selfDamage = recoil;
        if (attacker.currentHp <= 0) attacker.isAlive = false;
      }
    } else if (attacker.item === 'life-orb') {
      // Life Orb: 5 recoil on any damage move
      attacker.currentHp = Math.max(0, attacker.currentHp - 5);
      result.selfDamage = 5;
      if (attacker.currentHp <= 0) attacker.isAlive = false;
    }
  }

  // Track first attack for First Strike passive
  attacker.hasAttacked = true;

  // Set cooldown
  attacker.cooldowns[actualMoveIndex] = actualMove.cooldown;

  return result;
}

// ── Tick Status Effects & Cooldowns ─────────────────────────

export interface TickResult {
  bleedDamage: number;
  passiveHeal: number;
  itemHeal: number;
  nightmareDamage: number;
}

export function tickEndOfTurn(
  char: BattleCharacter,
  opponent?: BattleCharacter,
): TickResult {
  let bleedDamage = 0;
  let passiveHeal = 0;
  let itemHeal = 0;
  let nightmareDamage = 0;

  // Reduce cooldowns
  let cdReduction = 1;
  // Hidden Genius: cooldowns reduce 1 extra
  if (char.template.passive.id === 'hidden-genius') cdReduction += 1;
  // Cooldown Gear item: cooldowns reduce 1 extra
  if (char.item === 'cooldown-gear') cdReduction += 1;
  char.cooldowns = char.cooldowns.map(cd => Math.max(0, cd - cdReduction));

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

  // Timeline Survivor passive: heal 5 HP
  if (char.template.passive.id === 'timeline-survivor' && char.isAlive) {
    const heal = Math.min(5, char.maxHp - char.currentHp);
    if (heal > 0) {
      char.currentHp += heal;
      passiveHeal = heal;
    }
  }

  // Heal Berry item: heal 8 HP
  if (char.item === 'heal-berry' && char.isAlive) {
    const heal = Math.min(8, char.maxHp - char.currentHp);
    if (heal > 0) {
      char.currentHp += heal;
      itemHeal = heal;
    }
  }

  // Nightmare Aura: opponent takes 3 damage (checked from opponent's perspective)
  if (opponent && opponent.isAlive && char.template.passive.id === 'nightmare-aura') {
    nightmareDamage = 3;
    opponent.currentHp = Math.max(0, opponent.currentHp - nightmareDamage);
    if (opponent.currentHp <= 0) opponent.isAlive = false;
  }

  return { bleedDamage, passiveHeal, itemHeal, nightmareDamage };
}

// ── On Switch-In ───────────────────────────────────────────

export interface SwitchInResult {
  confusedOpponent: boolean;
}

export function onSwitchIn(
  switchedIn: BattleCharacter,
  opponent: BattleCharacter,
): SwitchInResult {
  const result: SwitchInResult = { confusedOpponent: false };

  // Dramatic Entrance: 30% chance to confuse opponent
  if (switchedIn.template.passive.id === 'dramatic-entrance' && Math.random() < 0.3) {
    if (!resistsStatus(opponent)) {
      opponent.status = { type: 'confuse', duration: 2 };
      result.confusedOpponent = true;
    }
  }

  return result;
}

// ── CPU AI ──────────────────────────────────────────────────

export function cpuChooseMove(cpu: BattleCharacter, player: BattleCharacter, smartness: number = 0.5): number {
  const available = cpu.template.moves
    .map((move, i) => ({ move, index: i }))
    .filter(({ index }) => cpu.cooldowns[index] === 0);

  if (available.length === 0) return 0;

  const scored = available.map(({ move, index }) => {
    let score = move.power;

    const eff = getEffectiveness(move.type, player.template.type);
    score *= eff;

    if (move.power > 0) {
      const est = calculateDamage(cpu, player, move);
      if (est.damage >= player.currentHp) score += 50;
    }

    if (move.power === 0 && cpu.currentHp < cpu.maxHp * 0.4) {
      score += 40;
    }

    if (move.selfDamage && cpu.currentHp < cpu.maxHp * 0.3) {
      score -= 30;
    }

    const randomRange = 10 * (1 - smartness * 0.8);
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
    for (let i = weighted.length - 1; i >= 0; i--) {
      if (weighted[i].id === pick.id) weighted.splice(i, 1);
    }
  }

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

  const isBoss = floor % 5 === 0 && floor > 0;

  let pool = CHARACTERS.filter(c => !playerTeam.some(p => p.id === c.id));

  if (isBoss && floor >= 20) {
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

  const baseLevel = Math.min(MAX_LEVEL, 1 + Math.floor(floor * 0.6));
  const levels = team.map(() => Math.min(MAX_LEVEL, baseLevel + Math.floor(Math.random() * 3)));

  return { team, levels };
}

// ── CPU Item Assignment ────────────────────────────────────

export function cpuEquipItems(
  team: CharacterTemplate[],
  arenaLevel: number,
  floor: number,
): (string | null)[] {
  // No items at low arena
  if (arenaLevel < 3 && floor < 3) return [null, null, null];

  const available = ITEMS.filter(item => {
    const cond = item.unlockCondition;
    if (cond.type === 'always') return true;
    if (cond.type === 'arena') return arenaLevel >= cond.level;
    if (cond.type === 'floor') return floor >= cond.level;
    return false;
  });

  if (available.length === 0) return [null, null, null];

  return team.map(() => {
    // 60% chance to equip an item
    if (Math.random() < 0.4) return null;
    return available[Math.floor(Math.random() * available.length)].id;
  });
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
  let pSpd = getScaledStat(player.template.spd, player.level);
  let cSpd = getScaledStat(cpu.template.spd, cpu.level);

  // Caffeinated status: +50% speed
  if (player.status?.type === 'caffeinated') pSpd *= 1.5;
  if (cpu.status?.type === 'caffeinated') cSpd *= 1.5;

  // Three-Legged Speed passive: +15% speed
  if (player.template.passive.id === 'three-legs') pSpd *= 1.15;
  if (cpu.template.passive.id === 'three-legs') cSpd *= 1.15;

  // Espresso Shot item: +10% speed
  if (player.item === 'espresso-shot') pSpd *= 1.1;
  if (cpu.item === 'espresso-shot') cSpd *= 1.1;

  if (pSpd === cSpd) return Math.random() < 0.5 ? 'player' : 'cpu';
  return pSpd > cSpd ? 'player' : 'cpu';
}
