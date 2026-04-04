import './style.css';
import type { GameState, BattleState, BattleCharacter } from './types';
import { CHARACTERS, TYPE_INFO } from './data';
import {
  initBattle,
  applyMove,
  tickEndOfTurn,
  cpuChooseMove,
  isFrozen,
  getNextAlive,
  isTeamDefeated,
  getFirstAttacker,
  generateCpuTeam,
} from './engine';
import type { MoveResult } from './engine';

// ── Game State ──────────────────────────────────────────────

const state: GameState = {
  screen: 'title',
  playerTeam: [],
  cpuTeam: [],
  battle: null,
  arenaLevel: 1,
};

const app = document.getElementById('app')!;

// ── Sarcastic Lines ─────────────────────────────────────────

const VICTORY_LINES = [
  "You won. Your dopamine receptors are thrilled. Are you proud?",
  "Congratulations, you defeated a CPU. The machines aren't scared yet.",
  "Victory! Your screen time was totally worth it.",
  "You did it! Now close this tab and go outside. Just kidding.",
  "Winner winner, brainrot dinner.",
  "The algorithm approves of your combat skills.",
];

const DEFEAT_LINES = [
  "You lost to an AI playing fictional meme creatures. Rock bottom.",
  "Defeat. Even Frigo Camelo would be disappointed.",
  "The brainrot consumed you. There is no cure.",
  "L + ratio + you lost to Italian meme animals.",
  "Your dopamine crashed harder than your team.",
  "Maybe try touching grass? It's super effective.",
];

const INTRO_LINES = [
  "Your brain cells called. They want a refund.",
  "Warning: This game has zero educational value.",
  "Surgeon General's Warning: Pure brainrot ahead.",
  "The memes have evolved. They fight now.",
  "Italy's greatest cultural export since pizza.",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Render Router ───────────────────────────────────────────

function render() {
  switch (state.screen) {
    case 'title': renderTitle(); break;
    case 'select': renderSelect(); break;
    case 'battle': renderBattle(); break;
    case 'result': renderResult(); break;
  }
}

// ── Title Screen ────────────────────────────────────────────

function renderTitle() {
  app.innerHTML = `
    <div class="title-screen">
      <div>
        <div class="title-logo">
          BRAINROT<br>BATTLES
          <span class="subtitle">${randomFrom(INTRO_LINES)}</span>
        </div>
      </div>
      <div class="title-characters">
        🦈 🐊 🪵 ☕ 🪐 🌳 🍌
      </div>
      <button class="btn btn-large" id="btn-start">START GAME</button>
      <p style="color: var(--text-dim); font-size: 0.75rem; max-width: 400px;">
        Pick 3 brainrot creatures. Battle the CPU. Question your life choices.
        <br><br>Arena ${state.arenaLevel} / 5
      </p>
    </div>
  `;
  document.getElementById('btn-start')!.addEventListener('click', () => {
    state.playerTeam = [];
    state.screen = 'select';
    render();
  });
}

// ── Character Select ────────────────────────────────────────

function renderSelect() {
  const selectedIds = state.playerTeam.map(c => c.id);

  app.innerHTML = `
    <div class="select-screen">
      <div class="select-header">
        <h2>CHOOSE YOUR FIGHTERS</h2>
        <p>Select 3 creatures for your team (${state.playerTeam.length}/3)</p>
      </div>

      <div class="team-preview">
        ${[0, 1, 2].map(i => {
          const char = state.playerTeam[i];
          return `<div class="team-slot ${char ? 'filled' : ''}" ${char ? `data-remove="${i}"` : ''}>
            ${char ? char.emoji : '?'}
          </div>`;
        }).join('')}
      </div>

      <div class="character-grid">
        ${CHARACTERS.map(c => {
          const isSelected = selectedIds.includes(c.id);
          const isFull = state.playerTeam.length >= 3 && !isSelected;
          const info = TYPE_INFO[c.type];
          return `
            <div class="char-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}"
                 data-id="${c.id}">
              <div class="char-card-emoji">${c.emoji}</div>
              <div class="char-card-info">
                <div class="char-card-name">${c.name}</div>
                <div class="char-card-meta">
                  <span class="type-badge" style="background:${info.color}22; color:${info.color}">
                    ${info.emoji} ${info.label}
                  </span>
                  <span class="tier-badge tier-${c.tier}">Tier ${c.tier}</span>
                </div>
                <div class="char-card-stats">
                  <span>HP:${c.hp}</span>
                  <span>ATK:${c.atk}</span>
                  <span>DEF:${c.def}</span>
                  <span>SPD:${c.spd}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="select-footer">
        <button class="btn btn-small" id="btn-back">BACK</button>
        <button class="btn ${state.playerTeam.length === 3 ? 'btn-large' : 'btn-small'}"
                id="btn-fight"
                ${state.playerTeam.length < 3 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>
          FIGHT!
        </button>
      </div>
    </div>
  `;

  // Event: card clicks
  app.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!;
      const idx = state.playerTeam.findIndex(c => c.id === id);
      if (idx >= 0) {
        state.playerTeam.splice(idx, 1);
      } else if (state.playerTeam.length < 3) {
        const char = CHARACTERS.find(c => c.id === id)!;
        state.playerTeam.push(char);
      }
      renderSelect();
    });
  });

  // Event: remove from team preview
  app.querySelectorAll('[data-remove]').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((slot as HTMLElement).dataset.remove!);
      state.playerTeam.splice(idx, 1);
      renderSelect();
    });
  });

  // Event: back
  document.getElementById('btn-back')!.addEventListener('click', () => {
    state.screen = 'title';
    render();
  });

  // Event: fight
  document.getElementById('btn-fight')!.addEventListener('click', () => {
    if (state.playerTeam.length === 3) {
      state.cpuTeam = generateCpuTeam(state.playerTeam, state.arenaLevel);
      state.battle = initBattle(state.playerTeam, state.cpuTeam);
      state.screen = 'battle';
      render();
    }
  });
}

// ── Battle Screen ───────────────────────────────────────────

function renderBattle() {
  if (!state.battle) return;
  const b = state.battle;
  const player = b.playerTeam[b.playerActive];
  const cpu = b.cpuTeam[b.cpuActive];

  app.innerHTML = `
    <div class="battle-screen">
      <!-- Team Bench -->
      <div class="team-bench">
        <div class="bench-side">
          ${b.playerTeam.map((c, i) => `
            <div class="bench-icon ${i === b.playerActive ? 'active' : ''} ${!c.isAlive ? 'fainted' : ''} ${b.phase === 'switch' && c.isAlive && i !== b.playerActive ? 'clickable' : ''}"
                 ${b.phase === 'switch' && c.isAlive && i !== b.playerActive ? `data-switch="${i}"` : ''}>
              ${c.template.emoji}
            </div>
          `).join('')}
          <span style="font-size:0.7rem; color:var(--text-dim); align-self:center; margin-left:0.3rem">YOU</span>
        </div>
        <div class="bench-side">
          <span style="font-size:0.7rem; color:var(--text-dim); align-self:center; margin-right:0.3rem">CPU</span>
          ${b.cpuTeam.map((c, i) => `
            <div class="bench-icon ${i === b.cpuActive ? 'active' : ''} ${!c.isAlive ? 'fainted' : ''}">
              ${c.template.emoji}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Battle Field -->
      <div class="battle-field">
        <div class="fighter fighter-player" id="fighter-player">
          <div class="fighter-sprite">${player.template.emoji}</div>
          <div class="fighter-info">
            <div class="fighter-name">${player.template.name}</div>
            ${renderHpBar(player)}
            ${renderStatus(player)}
          </div>
        </div>
        <div class="fighter fighter-cpu" id="fighter-cpu">
          <div class="fighter-sprite">${cpu.template.emoji}</div>
          <div class="fighter-info">
            <div class="fighter-name">${cpu.template.name}</div>
            ${renderHpBar(cpu)}
            ${renderStatus(cpu)}
          </div>
        </div>
      </div>

      <!-- Controls -->
      ${b.phase === 'switch' ? renderSwitchPrompt() : ''}
      ${b.phase === 'select_action' ? renderMoveButtons(player) : ''}
      ${b.phase === 'animating' ? '<div style="text-align:center;padding:1rem;"><span class="pixel-text" style="font-size:0.6rem;color:var(--text-dim)">...</span></div>' : ''}

      <!-- Battle Log -->
      <div class="battle-log" id="battle-log">
        ${b.log.slice(-6).map(l => `<p>${l}</p>`).join('')}
      </div>
    </div>
  `;

  // Scroll log to bottom
  const logEl = document.getElementById('battle-log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  // Event: move buttons
  app.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (b.phase !== 'select_action') return;
      const moveIdx = parseInt((btn as HTMLElement).dataset.move!);
      executeTurn(moveIdx);
    });
  });

  // Event: switch buttons
  app.querySelectorAll('[data-switch]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.switch!);
      b.playerActive = idx;
      b.log.push(`You send out ${b.playerTeam[idx].template.name}!`);
      b.phase = 'select_action';
      render();
    });
  });
}

function renderHpBar(char: BattleCharacter): string {
  const pct = Math.max(0, (char.currentHp / char.maxHp) * 100);
  const cls = pct > 50 ? 'hp-high' : pct > 25 ? 'hp-mid' : 'hp-low';
  return `
    <div class="hp-bar-container">
      <div class="hp-bar ${cls}" style="width:${pct}%"></div>
    </div>
    <div class="hp-text">${Math.max(0, char.currentHp)} / ${char.maxHp}</div>
  `;
}

function renderStatus(char: BattleCharacter): string {
  if (!char.status) return '';
  const labels: Record<string, string> = {
    bleed: '🩸 Bleeding',
    confuse: '😵 Confused',
    freeze: '🧊 Frozen',
    caffeinated: '⚡ Caffeinated',
    brainrot: '🧠 Brainrot',
  };
  return `<span class="status-badge status-${char.status.type}">${labels[char.status.type]} (${char.status.duration})</span>`;
}

function renderMoveButtons(player: BattleCharacter): string {
  return `
    <div class="battle-controls">
      ${player.template.moves.map((move, i) => {
        const onCooldown = player.cooldowns[i] > 0;
        const info = TYPE_INFO[move.type];
        return `
          <button class="move-btn" data-move="${i}" ${onCooldown ? 'disabled' : ''}>
            <div class="move-btn-name">${move.name}</div>
            <div class="move-btn-meta">
              <span class="type-badge" style="background:${info.color}22; color:${info.color}">
                ${info.emoji} ${info.label}
              </span>
              <span>PWR: ${move.power || 'Heal'}</span>
              ${onCooldown ? `<span style="color:var(--red)">CD: ${player.cooldowns[i]}</span>` : ''}
              ${move.effect ? `<span>${effectLabel(move.effect.type)}</span>` : ''}
            </div>
            <div class="move-btn-desc">${move.description}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderSwitchPrompt(): string {
  return `
    <div class="switch-prompt">
      <h3>Your fighter fainted! Choose your next one:</h3>
      <p style="color:var(--text-dim);font-size:0.8rem">Click an alive team member above</p>
    </div>
  `;
}

function effectLabel(type: string): string {
  const map: Record<string, string> = {
    bleed: '🩸', confuse: '😵', freeze: '🧊', caffeinated: '⚡', brainrot: '🧠',
  };
  return map[type] || '';
}

// ── Battle Execution ────────────────────────────────────────

async function executeTurn(playerMoveIdx: number) {
  const b = state.battle!;
  b.phase = 'animating';
  render();

  const player = b.playerTeam[b.playerActive];
  const cpu = b.cpuTeam[b.cpuActive];
  const cpuMoveIdx = cpuChooseMove(cpu, player);

  const first = getFirstAttacker(player, cpu);

  if (first === 'player') {
    await executeAttack(b, player, cpu, playerMoveIdx, 'player');
    if (await checkFaintAndSwitch(b)) return;
    await executeAttack(b, cpu, player, cpuMoveIdx, 'cpu');
    if (await checkFaintAndSwitch(b)) return;
  } else {
    await executeAttack(b, cpu, player, cpuMoveIdx, 'cpu');
    if (await checkFaintAndSwitch(b)) return;
    await executeAttack(b, player, cpu, playerMoveIdx, 'player');
    if (await checkFaintAndSwitch(b)) return;
  }

  // End of turn ticks
  await endOfTurnTick(b, player, 'Your');
  await endOfTurnTick(b, cpu, 'Enemy');

  if (await checkFaintAndSwitch(b)) return;

  b.phase = 'select_action';
  render();
}

async function executeAttack(
  b: BattleState,
  attacker: BattleCharacter,
  defender: BattleCharacter,
  moveIdx: number,
  side: 'player' | 'cpu'
) {
  if (!attacker.isAlive || !defender.isAlive) return;

  const prefix = side === 'player' ? '' : 'Enemy ';
  const name = attacker.template.name;
  const move = attacker.template.moves[moveIdx];

  // Check frozen
  if (isFrozen(attacker)) {
    b.log.push(`${prefix}${name} is frozen and can't move! 🧊`);
    attacker.status!.duration -= 1;
    if (attacker.status!.duration <= 0) attacker.status = null;
    render();
    await delay(800);
    return;
  }

  b.log.push(`${prefix}${name} uses ${move.name}!`);
  render();
  await delay(600);

  const result = applyMove(attacker, defender, moveIdx);

  // Animate
  const targetId = side === 'player' ? 'fighter-cpu' : 'fighter-player';
  const targetEl = document.getElementById(targetId);
  if (targetEl && result.damage > 0) {
    targetEl.classList.add('animate-shake');
    setTimeout(() => targetEl?.classList.remove('animate-shake'), 300);
  }

  // Log result
  logMoveResult(b, result, attacker, defender, side);

  render();
  await delay(600);
}

function logMoveResult(
  b: BattleState,
  result: MoveResult,
  attacker: BattleCharacter,
  defender: BattleCharacter,
  side: 'player' | 'cpu'
) {
  const prefix = side === 'player' ? '' : 'Enemy ';

  if (result.hitSelf) {
    b.log.push(`${prefix}${attacker.template.name} hurt itself in confusion! (-${result.selfDamage} HP)`);
    return;
  }

  if (result.damage > 0) {
    let msg = `It deals ${result.damage} damage!`;
    if (result.effectiveness > 1.5) msg += ' Super effective! 💥';
    else if (result.effectiveness < 0.8) msg += ' Not very effective...';
    b.log.push(msg);
  }

  if (result.healed > 0) {
    b.log.push(`${prefix}${attacker.template.name} restored ${result.healed} HP! 💚`);
  }

  if (result.selfDamage > 0 && !result.hitSelf) {
    b.log.push(`${prefix}${attacker.template.name} took ${result.selfDamage} recoil damage!`);
  }

  if (result.statusApplied) {
    const labels: Record<string, string> = {
      bleed: 'is bleeding! 🩸',
      confuse: 'is confused! 😵',
      freeze: 'is frozen solid! 🧊',
      caffeinated: 'got caffeinated! ⚡',
      brainrot: 'caught brainrot! 🧠',
    };
    const target = result.statusApplied.type === 'caffeinated' ? attacker : defender;
    const tPrefix = target === attacker ? prefix : (side === 'player' ? 'Enemy ' : '');
    b.log.push(`${tPrefix}${target.template.name} ${labels[result.statusApplied.type]}`);
  }

  if (!defender.isAlive) {
    const dPrefix = side === 'player' ? 'Enemy ' : '';
    b.log.push(`${dPrefix}${defender.template.name} fainted! 💀`);
  }
}

async function endOfTurnTick(b: BattleState, char: BattleCharacter, label: string) {
  if (!char.isAlive) return;
  const { bleedDamage } = tickEndOfTurn(char);
  if (bleedDamage > 0) {
    b.log.push(`${label} ${char.template.name} takes ${bleedDamage} bleed damage! 🩸`);
    render();
    await delay(400);
  }
}

async function checkFaintAndSwitch(b: BattleState): Promise<boolean> {
  // Check CPU team
  if (!b.cpuTeam[b.cpuActive].isAlive) {
    if (isTeamDefeated(b.cpuTeam)) {
      b.phase = 'game_over';
      b.winner = 'player';
      state.screen = 'result';
      render();
      return true;
    }
    const next = getNextAlive(b.cpuTeam, b.cpuActive);
    if (next !== null) {
      b.cpuActive = next;
      b.log.push(`CPU sends out ${b.cpuTeam[next].template.name}!`);
      render();
      await delay(600);
    }
  }

  // Check player team
  if (!b.playerTeam[b.playerActive].isAlive) {
    if (isTeamDefeated(b.playerTeam)) {
      b.phase = 'game_over';
      b.winner = 'cpu';
      state.screen = 'result';
      render();
      return true;
    }
    b.phase = 'switch';
    render();
    return true;
  }

  return false;
}

// ── Result Screen ───────────────────────────────────────────

function renderResult() {
  const won = state.battle?.winner === 'player';
  const line = won ? randomFrom(VICTORY_LINES) : randomFrom(DEFEAT_LINES);
  const lastAlive = won
    ? state.battle!.playerTeam.find(c => c.isAlive)
    : state.battle!.cpuTeam.find(c => c.isAlive);

  app.innerHTML = `
    <div class="result-screen">
      <div class="result-title ${won ? 'victory' : 'defeat'}">
        ${won ? 'VICTORY!' : 'DEFEAT...'}
      </div>
      <div style="font-size:4rem">${lastAlive?.template.emoji || '💀'}</div>
      <p class="result-subtitle">${line}</p>
      ${lastAlive ? `<p class="result-catchphrase">"${lastAlive.template.catchphrase}"</p>` : ''}
      <div class="result-buttons">
        ${won && state.arenaLevel < 5 ? `
          <button class="btn btn-large" id="btn-next">NEXT ARENA</button>
        ` : ''}
        <button class="btn ${won && state.arenaLevel < 5 ? 'btn-small' : 'btn-large'}" id="btn-menu">MAIN MENU</button>
        <button class="btn btn-small" id="btn-rematch">REMATCH</button>
      </div>
    </div>
  `;

  document.getElementById('btn-next')?.addEventListener('click', () => {
    state.arenaLevel++;
    state.screen = 'select';
    state.playerTeam = [];
    render();
  });

  document.getElementById('btn-menu')!.addEventListener('click', () => {
    state.screen = 'title';
    state.playerTeam = [];
    state.arenaLevel = 1;
    render();
  });

  document.getElementById('btn-rematch')!.addEventListener('click', () => {
    state.cpuTeam = generateCpuTeam(state.playerTeam, state.arenaLevel);
    state.battle = initBattle(state.playerTeam, state.cpuTeam);
    state.screen = 'battle';
    render();
  });
}

// ── Utility ─────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Boot ────────────────────────────────────────────────────

render();
