import './style.css';
import type { GameState, BattleState, BattleCharacter, PlayerStats } from './types';
import {
  CHARACTERS, TYPE_INFO, TEAM_BUDGET, STARTER_IDS, STARTER_ITEM_IDS, ARENA_UNLOCK_CHARS,
  ITEMS, isItemUnlocked,
  ELO_START, XP_THRESHOLDS, levelFromXp, getEvolutionStage, getDisplayName,
} from './data';
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
  generateEndlessCpuTeam,
  calculateXpReward,
  calculateElo,
  getEndlessSmartness,
  onSwitchIn,
  cpuEquipItems,
} from './engine';
import type { MoveResult } from './engine';
import { t, tDesc, getLang, setLang, randomVictoryLine, randomDefeatLine, randomIntroLine, getHelpHTML } from './i18n';

// ── Persistence ─────────────────────────────────────────────

const STORAGE_KEY = 'brainrot-battles-stats';

function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: add new fields if missing
      if (!parsed.characterProgress) parsed.characterProgress = {};
      if (!parsed.endless) parsed.endless = { floor: 0, elo: ELO_START, bestFloor: 0, streak: 0, bestStreak: 0 };
      if (!parsed.unlockedItems) parsed.unlockedItems = [...STARTER_ITEM_IDS];
      return parsed;
    }
  } catch { /* ignore */ }
  return {
    wins: 0, losses: 0, winStreak: 0, bestStreak: 0,
    highestArena: 1,
    unlockedIds: [...STARTER_IDS],
    characterProgress: {},
    endless: { floor: 0, elo: ELO_START, bestFloor: 0, streak: 0, bestStreak: 0 },
    unlockedItems: [...STARTER_ITEM_IDS],
  };
}

function saveStats(stats: PlayerStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

// ── Character Progress Helpers ──────────────────────────────

function getCharLevel(charId: string): number {
  const prog = state.stats.characterProgress[charId];
  return prog ? levelFromXp(prog.xp) : 1;
}

function getCharXp(charId: string): number {
  return state.stats.characterProgress[charId]?.xp ?? 0;
}

function addXpToChar(charId: string, amount: number): { oldLevel: number; newLevel: number } {
  if (!state.stats.characterProgress[charId]) {
    state.stats.characterProgress[charId] = { xp: 0, level: 1 };
  }
  const prog = state.stats.characterProgress[charId];
  const oldLevel = levelFromXp(prog.xp);
  prog.xp += amount;
  const newLevel = levelFromXp(prog.xp);
  prog.level = newLevel;
  return { oldLevel, newLevel };
}

function xpProgressPercent(charId: string): number {
  const xp = getCharXp(charId);
  const level = levelFromXp(xp);
  if (level >= XP_THRESHOLDS.length - 1) return 100;
  const current = XP_THRESHOLDS[level];
  const next = XP_THRESHOLDS[level + 1];
  return Math.round(((xp - current) / (next - current)) * 100);
}

// ── Game State ──────────────────────────────────────────────

const state: GameState = {
  screen: 'title',
  playerTeam: [],
  cpuTeam: [],
  battle: null,
  arenaLevel: 1,
  stats: loadStats(),
  mode: 'arena',
  playerItems: {},
};

// Transient result data (not persisted)
let lastXpAwarded = 0;
let lastLevelUps: { name: string; oldLevel: number; newLevel: number }[] = [];
let lastNewUnlocks: string[] = [];
let lastNewItemUnlocks: string[] = [];

const app = document.getElementById('app')!;

// ── Analytics ──────────────────────────────────────────────

declare function goatcounter_count(vars: { path: string; title?: string; event?: boolean }): void;

function trackEvent(name: string) {
  try {
    if (typeof goatcounter_count === 'function') {
      goatcounter_count({ path: `event/${name}`, title: name, event: true });
    }
  } catch { /* analytics should never break the game */ }
}

// ── Helpers ─────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isUnlocked(charId: string): boolean {
  return state.stats.unlockedIds.includes(charId);
}

function getTeamCost(): number {
  return state.playerTeam.reduce((sum, c) => sum + c.cost, 0);
}

function canAfford(cost: number): boolean {
  return getTeamCost() + cost <= TEAM_BUDGET;
}

// ── Portrait Renderer ───────────────────────────────────────

function renderPortrait(
  char: { portrait: { bg: string; icon: string; accent: string; img: string }; name: string },
  size: 'sm' | 'md' | 'lg' = 'md',
  evolutionClass: string = '',
): string {
  const sizes = { sm: '48px', md: '80px', lg: '120px' };
  const s = sizes[size];
  const portraitHtml = `
    <div class="portrait portrait-${size}" style="
      width:${s}; height:${s};
      background:${char.portrait.bg};
      border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 0 15px ${char.portrait.accent}44, inset 0 0 20px rgba(0,0,0,0.3);
      border: 2px solid ${char.portrait.accent}66;
      position:relative;
      overflow:hidden;
    " title="${char.name}">
      <img src="${char.portrait.img}" alt="${char.name}"
           style="width:90%; height:90%; object-fit:contain; filter:drop-shadow(0 0 6px ${char.portrait.accent}); z-index:1;"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
      <span style="display:none; font-size:${size === 'lg' ? '4rem' : size === 'md' ? '2.4rem' : '1.4rem'}; z-index:1;">${char.portrait.icon}</span>
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 60%);z-index:2;pointer-events:none;"></div>
    </div>
  `;
  if (!evolutionClass) return portraitHtml;
  return `<div class="evo-wrapper ${evolutionClass}">${portraitHtml}</div>`;
}

// ── Language Toggle ─────────────────────────────────────────

function renderLangToggle(): string {
  return `
    <div class="lang-toggle">
      <button class="lang-btn ${getLang() === 'en' ? 'active' : ''}" data-lang="en">EN</button>
      <button class="lang-btn ${getLang() === 'de' ? 'active' : ''}" data-lang="de">DE</button>
    </div>
  `;
}

function setupLangToggle() {
  app.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = (btn as HTMLElement).dataset.lang as 'en' | 'de';
      setLang(lang);
      render();
    });
  });
}

// ── Help Overlay ────────────────────────────────────────────

function showHelpOverlay() {
  const existing = document.querySelector('.help-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <h2>${t('help.title')}</h2>
      ${getHelpHTML()}
      <button class="btn btn-small" id="btn-close-help">${t('help.close')}</button>
    </div>
  `;
  app.appendChild(overlay);

  overlay.querySelector('#btn-close-help')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// ── Floating Damage Number ──────────────────────────────────

function showFloatingText(targetId: string, text: string, color: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.color = color;
  target.style.position = 'relative';
  target.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function showCatchphrase(text: string) {
  const existing = document.querySelector('.catchphrase-popup');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'catchphrase-popup';
  el.innerHTML = `"${text}"`;
  app.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ── Render Router ───────────────────────────────────────────

function render() {
  switch (state.screen) {
    case 'title': renderTitle(); break;
    case 'select': renderSelect(); break;
    case 'endless_select': renderEndlessSelect(); break;
    case 'battle': renderBattle(); break;
    case 'result': renderResult(); break;
  }
}

// ── Title Screen ────────────────────────────────────────────

function renderTitle() {
  const s = state.stats;
  const streakDisplay = s.winStreak > 0
    ? `<span style="color:var(--green)">🔥 ${s.winStreak} win streak</span>`
    : '';
  const endlessUnlocked = s.highestArena >= 5;

  app.innerHTML = `
    <div class="title-screen">
      ${renderLangToggle()}
      <div>
        <div class="title-logo">
          ROTMON<br>BATTLES
          <span class="subtitle">${randomIntroLine()}</span>
        </div>
      </div>
      <div class="title-characters">
        ${['🦈', '🐊', '🪵', '☕', '🪐', '🌳', '🍌'].map(e =>
          `<span class="title-char-icon">${e}</span>`
        ).join('')}
      </div>
      <div class="title-buttons">
        <button class="btn btn-large" id="btn-start">${t('title.arena')}</button>
        ${endlessUnlocked ? `<button class="btn btn-large" id="btn-endless" style="border-color:var(--yellow);color:var(--yellow)">${t('title.endless')}</button>` : ''}
      </div>
      <div class="title-stats">
        <p>${t('title.arena_level', { level: state.arenaLevel })} ${streakDisplay}</p>
        <p>${s.wins}W - ${s.losses}L ${s.bestStreak > 0 ? `| ${t('title.best_streak', { n: s.bestStreak })}` : ''}</p>
        <p style="font-size:0.65rem; margin-top:0.3rem">${t('title.rotmons_unlocked', { n: s.unlockedIds.length, total: CHARACTERS.length })}</p>
        ${endlessUnlocked ? `
          <p style="font-size:0.65rem; margin-top:0.3rem; color:var(--yellow)">
            ${t('title.endless_stats', { floor: s.endless.bestFloor, elo: s.endless.elo })}
          </p>
        ` : ''}
      </div>
      <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
        ${s.wins > 0 ? `<button class="btn btn-small" id="btn-reset" style="opacity:0.5">${t('title.reset')}</button>` : ''}
        <button class="btn btn-small" id="btn-help" style="opacity:0.5">${t('help.button')}</button>
      </div>
    </div>
  `;

  document.getElementById('btn-start')!.addEventListener('click', () => {
    state.playerTeam = [];
    state.mode = 'arena';
    state.screen = 'select';
    render();
  });

  document.getElementById('btn-endless')?.addEventListener('click', () => {
    state.playerTeam = [];
    state.mode = 'endless';
    state.screen = 'endless_select';
    render();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm(t('title.reset_confirm'))) {
      localStorage.removeItem(STORAGE_KEY);
      state.stats = loadStats();
      state.arenaLevel = 1;
      render();
    }
  });

  document.getElementById('btn-help')?.addEventListener('click', () => {
    showHelpOverlay();
  });

  setupLangToggle();
}

// ── Character Select (shared rendering logic) ───────────────

function renderCharacterGrid(chars: { template: typeof CHARACTERS[0]; isSelected: boolean; disabled: boolean; locked: boolean; tooExpensive: boolean }[]): string {
  return chars.map(({ template: c, isSelected, disabled, locked, tooExpensive }) => {
    const info = TYPE_INFO[c.type];
    const level = getCharLevel(c.id);
    const evo = getEvolutionStage(level);
    const displayName = getDisplayName(c.name, level);
    const xpPct = xpProgressPercent(c.id);
    return `
      <div class="char-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${locked ? 'locked' : ''}"
           data-id="${c.id}">
        ${locked ? '<div class="lock-overlay">🔒 Arena ' + c.unlockArena + '</div>' : ''}
        <div class="char-card-portrait">
          ${renderPortrait(c, 'sm', evo.cssClass)}
        </div>
        <div class="char-card-info">
          <div class="char-card-name">${displayName}</div>
          <div class="char-card-meta">
            <span class="type-badge" style="background:${info.color}22; color:${info.color}">
              ${info.emoji} ${info.label}
            </span>
            <span class="tier-badge tier-${c.tier}">T${c.tier}</span>
            <span class="cost-badge" style="color:${tooExpensive ? 'var(--red)' : 'var(--text-dim)'}">⬡${c.cost}</span>
            <span class="level-badge">Lv.${level}</span>
          </div>
          <div class="char-card-stats">
            <span>HP:${c.hp}</span>
            <span>ATK:${c.atk}</span>
            <span>DEF:${c.def}</span>
            <span>SPD:${c.spd}</span>
          </div>
          <div class="char-card-passive">${c.passive.emoji} ${c.passive.name}</div>
          ${level < 20 ? `
            <div class="xp-bar-mini">
              <div class="xp-bar-fill" style="width:${xpPct}%"></div>
            </div>
          ` : `<div class="xp-bar-mini"><div class="xp-bar-fill xp-max" style="width:100%"></div></div>`}
        </div>
      </div>
    `;
  }).join('');
}

function setupCardEvents() {
  app.querySelectorAll('.char-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!;
      const idx = state.playerTeam.findIndex(c => c.id === id);
      if (idx >= 0) {
        state.playerTeam.splice(idx, 1);
      } else if (state.playerTeam.length < 3) {
        const char = CHARACTERS.find(c => c.id === id)!;
        if (canAfford(char.cost)) {
          state.playerTeam.push(char);
        }
      }
      render();
    });
  });

  app.querySelectorAll('[data-remove]').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((slot as HTMLElement).dataset.remove!);
      state.playerTeam.splice(idx, 1);
      render();
    });
  });
}

// ── Arena Select Screen ─────────────────────────────────────

function renderSelect() {
  const selectedIds = state.playerTeam.map(c => c.id);
  const currentCost = getTeamCost();
  const remaining = TEAM_BUDGET - currentCost;

  const cardData = CHARACTERS.map(c => {
    const isSelected = selectedIds.includes(c.id);
    const locked = !isUnlocked(c.id);
    const tooExpensive = !isSelected && state.playerTeam.length < 3 && !canAfford(c.cost);
    const isFull = state.playerTeam.length >= 3 && !isSelected;
    return { template: c, isSelected, disabled: locked || tooExpensive || isFull, locked, tooExpensive };
  });

  app.innerHTML = `
    <div class="select-screen">
      ${renderLangToggle()}
      <div class="select-header">
        <h2>${t('select.header')}</h2>
        <div class="budget-bar">
          <span>${t('select.budget')} </span>
          <span class="budget-dots">
            ${Array.from({ length: TEAM_BUDGET }, (_, i) =>
              `<span class="budget-dot ${i < currentCost ? 'spent' : 'available'}"></span>`
            ).join('')}
          </span>
          <span class="budget-remaining">${t('select.remaining', { n: remaining })}</span>
        </div>
        <p style="color:var(--text-dim);font-size:0.75rem;margin-top:0.3rem">
          ${t('select.selected_info', { n: state.playerTeam.length, arena: state.arenaLevel })}
        </p>
      </div>

      <div class="team-preview">
        ${[0, 1, 2].map(i => {
          const char = state.playerTeam[i];
          const level = char ? getCharLevel(char.id) : 1;
          const evo = char ? getEvolutionStage(level) : null;
          return `<div class="team-slot ${char ? 'filled' : ''}" ${char ? `data-remove="${i}"` : ''}>
            ${char ? renderPortrait(char, 'sm', evo?.cssClass || '') : '<span style="color:var(--text-dim);font-size:1.5rem">?</span>'}
          </div>`;
        }).join('')}
      </div>

      ${renderItemEquipRow()}

      <div class="character-grid">
        ${renderCharacterGrid(cardData)}
      </div>

      <div class="select-footer">
        <button class="btn btn-small" id="btn-back">${t('select.back')}</button>
        <button class="btn btn-small" id="btn-help-select" style="opacity:0.5">${t('help.button')}</button>
        <button class="btn ${state.playerTeam.length === 3 ? 'btn-large' : 'btn-small'}"
                id="btn-fight"
                ${state.playerTeam.length < 3 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>
          ${t('select.fight')}
        </button>
      </div>
    </div>
  `;

  setupCardEvents();
  setupItemEvents();

  document.getElementById('btn-back')!.addEventListener('click', () => {
    state.screen = 'title';
    render();
  });

  document.getElementById('btn-help-select')?.addEventListener('click', () => {
    showHelpOverlay();
  });

  document.getElementById('btn-fight')!.addEventListener('click', () => {
    if (state.playerTeam.length === 3) {
      const playerLevels = state.playerTeam.map(c => getCharLevel(c.id));
      const playerItemArray = state.playerTeam.map(c => state.playerItems[c.id] || null);
      const { team, levels: cpuLevels } = generateCpuTeam(state.playerTeam, state.arenaLevel);
      const cpuItemArray = cpuEquipItems(team, state.arenaLevel, 0);
      state.cpuTeam = team;
      state.battle = initBattle(state.playerTeam, state.cpuTeam, playerLevels, cpuLevels, playerItemArray, cpuItemArray);
      state.battle.log = [t('battle.start')];
      state.screen = 'battle';
      trackEvent(`arena-start-lv${state.arenaLevel}`);
      render();
    }
  });

  setupLangToggle();
}

// ── Endless Select Screen ───────────────────────────────────

function renderEndlessSelect() {
  const selectedIds = state.playerTeam.map(c => c.id);
  const currentCost = getTeamCost();
  const remaining = TEAM_BUDGET - currentCost;
  const e = state.stats.endless;
  const nextFloor = e.floor + 1;
  const isBoss = nextFloor % 5 === 0 && nextFloor > 0;

  // In endless mode, all characters are available
  const cardData = CHARACTERS.map(c => {
    const isSelected = selectedIds.includes(c.id);
    const tooExpensive = !isSelected && state.playerTeam.length < 3 && !canAfford(c.cost);
    const isFull = state.playerTeam.length >= 3 && !isSelected;
    return { template: c, isSelected, disabled: tooExpensive || isFull, locked: false, tooExpensive };
  });

  app.innerHTML = `
    <div class="select-screen">
      ${renderLangToggle()}
      <div class="endless-header">
        <div class="endless-stat">
          <span class="endless-stat-label">${t('endless.floor')}</span>
          <span class="endless-stat-value">${nextFloor} ${isBoss ? '👑' : ''}</span>
        </div>
        <div class="endless-stat">
          <span class="endless-stat-label">${t('endless.elo')}</span>
          <span class="endless-stat-value elo-display">${e.elo}</span>
        </div>
        <div class="endless-stat">
          <span class="endless-stat-label">${t('endless.streak')}</span>
          <span class="endless-stat-value">${e.streak > 0 ? '🔥 ' + e.streak : '0'}</span>
        </div>
        <div class="endless-stat">
          <span class="endless-stat-label">${t('endless.best')}</span>
          <span class="endless-stat-value">F${e.bestFloor}</span>
        </div>
      </div>

      <div class="select-header">
        <h2>${t('endless.header')}</h2>
        <div class="budget-bar">
          <span>${t('select.budget')} </span>
          <span class="budget-dots">
            ${Array.from({ length: TEAM_BUDGET }, (_, i) =>
              `<span class="budget-dot ${i < currentCost ? 'spent' : 'available'}"></span>`
            ).join('')}
          </span>
          <span class="budget-remaining">${t('select.remaining', { n: remaining })}</span>
        </div>
        <p style="color:var(--text-dim);font-size:0.75rem;margin-top:0.3rem">
          ${t('endless.selected_info', { n: state.playerTeam.length })}
        </p>
      </div>

      <div class="team-preview">
        ${[0, 1, 2].map(i => {
          const char = state.playerTeam[i];
          const level = char ? getCharLevel(char.id) : 1;
          const evo = char ? getEvolutionStage(level) : null;
          return `<div class="team-slot ${char ? 'filled' : ''}" ${char ? `data-remove="${i}"` : ''}>
            ${char ? renderPortrait(char, 'sm', evo?.cssClass || '') : '<span style="color:var(--text-dim);font-size:1.5rem">?</span>'}
          </div>`;
        }).join('')}
      </div>

      ${renderItemEquipRow()}

      <div class="character-grid">
        ${renderCharacterGrid(cardData)}
      </div>

      <div class="select-footer">
        <button class="btn btn-small" id="btn-back">${t('select.back')}</button>
        <button class="btn btn-small" id="btn-help-endless" style="opacity:0.5">${t('help.button')}</button>
        <button class="btn ${state.playerTeam.length === 3 ? 'btn-large' : 'btn-small'}"
                id="btn-fight"
                ${state.playerTeam.length < 3 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>
          ${isBoss ? t('endless.fight_boss', { floor: nextFloor }) : t('endless.fight', { floor: nextFloor })}
        </button>
      </div>
    </div>
  `;

  setupCardEvents();
  setupItemEvents();

  document.getElementById('btn-back')!.addEventListener('click', () => {
    state.screen = 'title';
    render();
  });

  document.getElementById('btn-help-endless')?.addEventListener('click', () => {
    showHelpOverlay();
  });

  document.getElementById('btn-fight')!.addEventListener('click', () => {
    if (state.playerTeam.length === 3) {
      const playerLevels = state.playerTeam.map(c => getCharLevel(c.id));
      const playerItemArray = state.playerTeam.map(c => state.playerItems[c.id] || null);
      const { team, levels: cpuLevels } = generateEndlessCpuTeam(state.playerTeam, nextFloor);
      const cpuItemArray = cpuEquipItems(team, state.arenaLevel, nextFloor);
      state.cpuTeam = team;
      state.battle = initBattle(state.playerTeam, state.cpuTeam, playerLevels, cpuLevels, playerItemArray, cpuItemArray);
      state.battle.log = [t('battle.start')];
      state.screen = 'battle';
      trackEvent(`endless-start-f${nextFloor}`);
      render();
    }
  });

  setupLangToggle();
}

// ── Item Equip UI ──────────────────────────────────────────

function renderItemEquipRow(): string {
  if (state.playerTeam.length === 0) return '';
  const unlockedItemIds = state.stats.unlockedItems;
  return `
    <div class="item-equip-row">
      ${state.playerTeam.map(char => {
        const itemId = state.playerItems[char.id];
        const item = itemId ? ITEMS.find(i => i.id === itemId) : null;
        return `
          <div class="item-slot" data-equip-char="${char.id}">
            <span style="font-size:0.6rem;color:var(--text-dim);font-family:var(--font-pixel)">${char.name.split(' ')[0]}</span>
            <span class="item-slot-icon">${item ? item.emoji : '➕'}</span>
            <span style="font-size:0.55rem;color:${item ? 'var(--yellow)' : 'var(--text-dim)'}">${item ? item.name : t('item.no_item')}</span>
          </div>
        `;
      }).join('')}
    </div>
    <p style="color:var(--text-dim);font-size:0.6rem;text-align:center;margin-top:0.2rem">${t('select.items_unlocked', { n: unlockedItemIds.length, total: ITEMS.length })}</p>
  `;
}

function showItemModal(charId: string) {
  const existing = document.querySelector('.item-modal-overlay');
  if (existing) existing.remove();

  const char = CHARACTERS.find(c => c.id === charId)!;
  const unlockedItemIds = state.stats.unlockedItems;
  const currentItemId = state.playerItems[charId];

  // Items already equipped by other team members
  const equippedByOthers = new Set(
    state.playerTeam
      .filter(c => c.id !== charId && state.playerItems[c.id])
      .map(c => state.playerItems[c.id]!)
  );

  const overlay = document.createElement('div');
  overlay.className = 'item-modal-overlay';
  overlay.innerHTML = `
    <div class="item-modal">
      <h3 style="font-family:var(--font-pixel);font-size:0.7rem;margin-bottom:0.5rem">${t('item.equip_title', { name: char.name.split(' ')[0] })}</h3>
      <div class="item-grid">
        <div class="item-card ${!currentItemId ? 'selected' : ''}" data-item-pick="">
          <span class="item-card-emoji">✖</span>
          <span class="item-card-name">${t('item.none')}</span>
        </div>
        ${ITEMS.map(item => {
          const unlocked = unlockedItemIds.includes(item.id);
          const taken = equippedByOthers.has(item.id);
          const selected = currentItemId === item.id;
          return `
            <div class="item-card ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''} ${taken ? 'taken' : ''}"
                 data-item-pick="${item.id}" ${!unlocked || taken ? '' : ''}>
              ${!unlocked ? '<div class="lock-overlay" style="font-size:0.5rem">🔒</div>' : ''}
              ${taken ? `<div class="lock-overlay" style="font-size:0.5rem">${t('item.in_use')}</div>` : ''}
              <span class="item-card-emoji">${item.emoji}</span>
              <span class="item-card-name">${item.name}</span>
              <span class="item-card-desc">${tDesc(item.description)}</span>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn btn-small" id="btn-close-items" style="margin-top:0.5rem">${t('item.close')}</button>
    </div>
  `;

  app.appendChild(overlay);

  overlay.querySelector('#btn-close-items')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelectorAll('.item-card:not(.locked):not(.taken)').forEach(card => {
    card.addEventListener('click', () => {
      const itemId = (card as HTMLElement).dataset.itemPick!;
      if (itemId) {
        state.playerItems[charId] = itemId;
      } else {
        state.playerItems[charId] = null;
      }
      overlay.remove();
      render();
    });
  });
}

function setupItemEvents() {
  app.querySelectorAll('[data-equip-char]').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      const charId = (slot as HTMLElement).dataset.equipChar!;
      showItemModal(charId);
    });
  });
}

// ── Battle Screen ───────────────────────────────────────────

function renderBattle() {
  if (!state.battle) return;
  const b = state.battle;
  const player = b.playerTeam[b.playerActive];
  const cpu = b.cpuTeam[b.cpuActive];
  const playerEvo = getEvolutionStage(player.level).cssClass;
  const cpuEvo = getEvolutionStage(cpu.level).cssClass;
  const playerName = getDisplayName(player.template.name, player.level);
  const cpuName = getDisplayName(cpu.template.name, cpu.level);

  app.innerHTML = `
    <div class="battle-screen">
      <div class="team-bench">
        <div class="bench-side">
          ${b.playerTeam.map((c, i) => `
            <div class="bench-icon ${i === b.playerActive ? 'active' : ''} ${!c.isAlive ? 'fainted' : ''} ${b.phase === 'switch' && c.isAlive && i !== b.playerActive ? 'clickable' : ''}"
                 ${b.phase === 'switch' && c.isAlive && i !== b.playerActive ? `data-switch="${i}"` : ''}>
              ${c.template.emoji}
            </div>
          `).join('')}
          <span style="font-size:0.7rem; color:var(--text-dim); align-self:center; margin-left:0.3rem">${t('battle.you')}</span>
        </div>
        <div class="bench-side">
          <span style="font-size:0.7rem; color:var(--text-dim); align-self:center; margin-right:0.3rem">${t('battle.cpu')}</span>
          ${b.cpuTeam.map((c, i) => `
            <div class="bench-icon ${i === b.cpuActive ? 'active' : ''} ${!c.isAlive ? 'fainted' : ''}">
              ${c.template.emoji}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="battle-field">
        <div class="fighter fighter-player" id="fighter-player">
          ${renderPortrait(player.template, 'lg', playerEvo)}
          <div class="fighter-info">
            <div class="fighter-name">${playerName} <span class="level-indicator">Lv.${player.level}</span></div>
            ${renderHpBar(player)}
            ${renderStatus(player)}
            <div class="fighter-indicators">
              <span class="passive-indicator" title="${tDesc(player.template.passive.description)}">${player.template.passive.emoji} ${player.template.passive.name}</span>
              ${player.item ? `<span class="item-indicator" title="${tDesc(ITEMS.find(i => i.id === player.item)?.description || '')}">${ITEMS.find(i => i.id === player.item)?.emoji || ''} ${ITEMS.find(i => i.id === player.item)?.name || ''}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="fighter fighter-cpu" id="fighter-cpu">
          ${renderPortrait(cpu.template, 'lg', cpuEvo)}
          <div class="fighter-info">
            <div class="fighter-name">${cpuName} <span class="level-indicator">Lv.${cpu.level}</span></div>
            ${renderHpBar(cpu)}
            ${renderStatus(cpu)}
            <div class="fighter-indicators">
              <span class="passive-indicator" title="${tDesc(cpu.template.passive.description)}">${cpu.template.passive.emoji} ${cpu.template.passive.name}</span>
              ${cpu.item ? `<span class="item-indicator" title="${tDesc(ITEMS.find(i => i.id === cpu.item)?.description || '')}">${ITEMS.find(i => i.id === cpu.item)?.emoji || ''} ${ITEMS.find(i => i.id === cpu.item)?.name || ''}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${b.phase === 'switch' ? renderSwitchPrompt() : ''}
      ${b.phase === 'select_action' ? renderMoveButtons(player) : ''}
      ${b.phase === 'animating' ? '<div style="text-align:center;padding:1rem;"><span class="pixel-text" style="font-size:0.6rem;color:var(--text-dim)">...</span></div>' : ''}

      <div class="battle-log" id="battle-log">
        ${b.log.slice(-6).map(l => `<p>${l}</p>`).join('')}
      </div>
    </div>
  `;

  const logEl = document.getElementById('battle-log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;

  app.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (b.phase !== 'select_action') return;
      const moveIdx = parseInt((btn as HTMLElement).dataset.move!);
      executeTurn(moveIdx);
    });
  });

  app.querySelectorAll('[data-switch]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.switch!);
      b.playerActive = idx;
      b.log.push(t('battle.send_out', { name: b.playerTeam[idx].template.name }));
      const switchResult = onSwitchIn(b.playerTeam[idx], b.cpuTeam[b.cpuActive]);
      if (switchResult.confusedOpponent) {
        b.log.push(t('battle.dramatic_entrance', { name: b.cpuTeam[b.cpuActive].template.name }));
      }
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
  return `<span class="status-badge status-${char.status.type}">${t(`status.${char.status.type}`)} (${char.status.duration})</span>`;
}

function renderMoveButtons(player: BattleCharacter): string {
  return `
    <div class="battle-controls">
      ${player.template.moves.map((move, i) => {
        const onCooldown = player.cooldowns[i] > 0;
        const info = TYPE_INFO[move.type];
        const isSpecial = move.cooldown >= 3;
        return `
          <button class="move-btn ${isSpecial ? 'move-special' : ''}" data-move="${i}" ${onCooldown ? 'disabled' : ''}>
            <div class="move-btn-name">${move.name} ${isSpecial ? '⭐' : ''}</div>
            <div class="move-btn-meta">
              <span class="type-badge" style="background:${info.color}22; color:${info.color}">
                ${info.emoji} ${info.label}
              </span>
              <span>${t('battle.power')} ${move.power || t('battle.heal')}</span>
              ${onCooldown ? `<span style="color:var(--red)">${t('battle.cooldown')} ${player.cooldowns[i]}</span>` : ''}
              ${move.effect ? `<span>${effectLabel(move.effect.type)}</span>` : ''}
            </div>
            <div class="move-btn-desc">${tDesc(move.description)}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderSwitchPrompt(): string {
  return `
    <div class="switch-prompt">
      <h3>${t('battle.switch_title')}</h3>
      <p style="color:var(--text-dim);font-size:0.8rem">${t('battle.switch_hint')}</p>
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

  // In endless mode, AI gets smarter at higher floors
  const smartness = state.mode === 'endless' ? getEndlessSmartness(state.stats.endless.floor + 1) : 0.5;
  const cpuMoveIdx = cpuChooseMove(cpu, player, smartness);

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

  await endOfTurnTick(b, player, cpu, 'Your', 'Enemy');
  await endOfTurnTick(b, cpu, player, 'Enemy', 'Your');

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
  const name = getDisplayName(attacker.template.name, attacker.level);
  const move = attacker.template.moves[moveIdx];

  if (isFrozen(attacker)) {
    b.log.push(t('battle.frozen', { prefix, name }));
    attacker.status!.duration -= 1;
    if (attacker.status!.duration <= 0) attacker.status = null;
    render();
    await delay(1000);
    return;
  }

  // Show catchphrase for special moves (cooldown >= 3)
  if (move.cooldown >= 3) {
    showCatchphrase(attacker.template.catchphrase);
  }

  b.log.push(t('battle.uses_move', { prefix, name, move: move.name }));
  render();
  await delay(900);

  const attackerTeam = side === 'player' ? b.playerTeam : b.cpuTeam;
  const result = applyMove(attacker, defender, moveIdx, attackerTeam);

  // Floating damage numbers
  const targetId = side === 'player' ? 'fighter-cpu' : 'fighter-player';
  if (result.damage > 0) {
    const color = result.effectiveness > 1.5 ? '#ff4757' : result.effectiveness < 0.8 ? '#aaa' : '#fff';
    showFloatingText(targetId, `-${result.damage}`, color);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.classList.add('animate-shake');
      setTimeout(() => targetEl.classList.remove('animate-shake'), 300);
    }
  }
  if (result.healed > 0) {
    const selfId = side === 'player' ? 'fighter-player' : 'fighter-cpu';
    showFloatingText(selfId, `+${result.healed}`, '#2ed573');
  }

  logMoveResult(b, result, attacker, defender, side);

  render();
  await delay(1000);
}

function logMoveResult(
  b: BattleState,
  result: MoveResult,
  attacker: BattleCharacter,
  defender: BattleCharacter,
  side: 'player' | 'cpu'
) {
  const prefix = side === 'player' ? '' : 'Enemy ';
  const attackerName = getDisplayName(attacker.template.name, attacker.level);
  const defenderName = getDisplayName(defender.template.name, defender.level);

  if (result.hitSelf) {
    b.log.push(t('battle.confused_self', { prefix, name: attackerName, n: result.selfDamage }));
    return;
  }

  if (result.dodged) {
    b.log.push(t('battle.dodged', { name: defenderName }));
    return;
  }

  if (result.damage > 0) {
    let msg = t('battle.damage', { n: result.damage });
    if (result.effectiveness > 1.5) msg += ' ' + t('battle.super_effective');
    else if (result.effectiveness < 0.8) msg += ' ' + t('battle.not_effective');
    b.log.push(msg);
  }

  if (result.healed > 0) {
    b.log.push(t('battle.healed', { prefix, name: attackerName, n: result.healed }));
  }

  if (result.selfDamage > 0 && !result.hitSelf) {
    b.log.push(t('battle.recoil', { prefix, name: attackerName, n: result.selfDamage }));
  }

  if (result.statusApplied) {
    const target = result.statusApplied.type === 'caffeinated' ? attacker : defender;
    const targetName = target === attacker ? attackerName : defenderName;
    const tPrefix = target === attacker ? prefix : (side === 'player' ? 'Enemy ' : '');
    b.log.push(`${tPrefix}${targetName} ${t(`status.${result.statusApplied.type}_applied`)}`);
  }

  if (!defender.isAlive) {
    const dPrefix = side === 'player' ? 'Enemy ' : '';
    b.log.push(t('battle.fainted', { prefix: dPrefix, name: defenderName }));
  }
}

async function endOfTurnTick(b: BattleState, char: BattleCharacter, opponent: BattleCharacter, label: string, oppLabel: string) {
  if (!char.isAlive) return;
  const name = getDisplayName(char.template.name, char.level);
  const oppName = getDisplayName(opponent.template.name, opponent.level);
  const { bleedDamage, passiveHeal, itemHeal, nightmareDamage } = tickEndOfTurn(char, opponent);

  let logged = false;
  if (bleedDamage > 0) {
    b.log.push(t('battle.bleed_tick', { label, name, n: bleedDamage }));
    logged = true;
  }
  if (passiveHeal > 0) {
    b.log.push(t('battle.passive_heal', { label, name, n: passiveHeal }));
    logged = true;
  }
  if (itemHeal > 0) {
    b.log.push(t('battle.item_heal', { label, name, n: itemHeal }));
    logged = true;
  }
  if (nightmareDamage > 0) {
    b.log.push(t('battle.nightmare_tick', { label: oppLabel, name: oppName, n: nightmareDamage }));
    logged = true;
  }
  if (logged) {
    render();
    await delay(700);
  }
}

async function checkFaintAndSwitch(b: BattleState): Promise<boolean> {
  if (!b.cpuTeam[b.cpuActive].isAlive) {
    if (isTeamDefeated(b.cpuTeam)) {
      b.phase = 'game_over';
      b.winner = 'player';
      handleGameEnd(true);
      state.screen = 'result';
      render();
      return true;
    }
    const next = getNextAlive(b.cpuTeam, b.cpuActive);
    if (next !== null) {
      b.cpuActive = next;
      b.log.push(t('battle.cpu_send_out', { name: b.cpuTeam[next].template.name }));
      const switchResult = onSwitchIn(b.cpuTeam[next], b.playerTeam[b.playerActive]);
      if (switchResult.confusedOpponent) {
        b.log.push(t('battle.dramatic_entrance', { name: b.playerTeam[b.playerActive].template.name }));
      }
      render();
      await delay(900);
    }
  }

  if (!b.playerTeam[b.playerActive].isAlive) {
    if (isTeamDefeated(b.playerTeam)) {
      b.phase = 'game_over';
      b.winner = 'cpu';
      handleGameEnd(false);
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

// ── Game End Logic ──────────────────────────────────────────

function handleGameEnd(won: boolean) {
  const s = state.stats;

  if (state.mode === 'arena') {
    trackEvent(`arena-${won ? 'win' : 'loss'}-lv${state.arenaLevel}`);
  } else {
    trackEvent(`endless-${won ? 'win' : 'loss'}-f${s.endless.floor + 1}`);
  }

  // Award XP to all player team characters
  const floor = s.endless.floor + 1;
  const xpAmount = calculateXpReward(won, state.arenaLevel, floor, state.mode);
  lastXpAwarded = xpAmount;
  lastLevelUps = [];

  for (const char of state.playerTeam) {
    const { oldLevel, newLevel } = addXpToChar(char.id, xpAmount);
    if (newLevel > oldLevel) {
      lastLevelUps.push({ name: char.name, oldLevel, newLevel });
    }
  }

  if (state.mode === 'endless') {
    if (won) {
      s.endless.floor++;
      s.endless.streak++;
      if (s.endless.streak > s.endless.bestStreak) s.endless.bestStreak = s.endless.streak;
      if (s.endless.floor > s.endless.bestFloor) s.endless.bestFloor = s.endless.floor;
    } else {
      s.endless.streak = 0;
    }
    s.endless.elo = calculateElo(s.endless.elo, floor, won);
  }

  if (state.mode === 'arena') {
    if (won) {
      s.wins++;
      s.winStreak++;
      if (s.winStreak > s.bestStreak) s.bestStreak = s.winStreak;

      // Unlock characters for beating this arena
      const unlocks = ARENA_UNLOCK_CHARS[state.arenaLevel] || [];
      lastNewUnlocks = [];
      for (const id of unlocks) {
        if (!s.unlockedIds.includes(id)) {
          s.unlockedIds.push(id);
          lastNewUnlocks.push(id);
        }
      }

      if (state.arenaLevel > s.highestArena) {
        s.highestArena = state.arenaLevel;
      }
    } else {
      s.losses++;
      s.winStreak = 0;
      lastNewUnlocks = [];
    }
  }

  // Check for new item unlocks
  lastNewItemUnlocks = [];
  for (const item of ITEMS) {
    if (!s.unlockedItems.includes(item.id) && isItemUnlocked(item, s)) {
      s.unlockedItems.push(item.id);
      lastNewItemUnlocks.push(item.id);
    }
  }

  saveStats(s);
}

// ── Result Screen ───────────────────────────────────────────

function renderResult() {
  const won = state.battle?.winner === 'player';
  const line = won ? randomVictoryLine() : randomDefeatLine();
  const lastAlive = won
    ? state.battle!.playerTeam.find(c => c.isAlive)
    : state.battle!.cpuTeam.find(c => c.isAlive);
  const unlockedChars = lastNewUnlocks.map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
  const lastAliveLevel = lastAlive ? lastAlive.level : 1;
  const lastAliveEvo = getEvolutionStage(lastAliveLevel).cssClass;

  const evoLabels: Record<number, string> = { 5: t('result.evo_ex'), 10: t('result.evo_ultra'), 15: t('result.evo_omega') };

  app.innerHTML = `
    <div class="result-screen">
      ${renderLangToggle()}
      <div class="result-title ${won ? 'victory' : 'defeat'}">
        ${won ? t('result.victory') : t('result.defeat')}
      </div>
      ${lastAlive ? renderPortrait(lastAlive.template, 'lg', lastAliveEvo) : '<div style="font-size:4rem">💀</div>'}
      <p class="result-subtitle">${line}</p>
      ${lastAlive ? `<p class="result-catchphrase">"${lastAlive.template.catchphrase}"</p>` : ''}

      <div class="xp-reward-section">
        <p class="xp-awarded">${t('result.xp_awarded', { n: lastXpAwarded })}</p>
        ${lastLevelUps.map(lu => `
          <div class="level-up-notification animate-fade-in">
            ${t('result.level_up', { name: lu.name, level: lu.newLevel })}
            ${evoLabels[lu.newLevel] ? `<br><span style="color:var(--accent-glow)">${evoLabels[lu.newLevel]}</span>` : ''}
          </div>
        `).join('')}
      </div>

      ${state.mode === 'endless' ? `
        <div class="endless-result-stats">
          <span>${t('endless.floor')} ${state.stats.endless.floor}</span>
          <span class="elo-display">${t('endless.elo')} ${state.stats.endless.elo}</span>
          ${state.stats.endless.streak > 1 ? `<span>🔥 ${state.stats.endless.streak} streak</span>` : ''}
          <span>${t('endless.best')}: F${state.stats.endless.bestFloor}</span>
        </div>
      ` : ''}

      ${state.stats.winStreak > 1 && state.mode === 'arena' ? `
        <div class="streak-banner">${t('result.streak', { n: state.stats.winStreak })}</div>
      ` : ''}

      ${unlockedChars.length > 0 ? `
        <div class="unlock-banner animate-fade-in">
          <h3 class="pixel-text" style="font-size:0.6rem;color:var(--yellow);margin-bottom:0.5rem">${t('result.new_rotmons')}</h3>
          <div style="display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap">
            ${unlockedChars.map(c => c ? `
              <div class="unlock-card">
                ${renderPortrait(c, 'sm')}
                <span style="font-size:0.6rem;color:var(--text-bright);font-family:var(--font-pixel);margin-top:0.3rem;text-align:center">${c.name}</span>
              </div>
            ` : '').join('')}
          </div>
        </div>
      ` : ''}

      ${lastNewItemUnlocks.length > 0 ? `
        <div class="unlock-banner animate-fade-in">
          <h3 class="pixel-text" style="font-size:0.6rem;color:var(--yellow);margin-bottom:0.5rem">${t('result.new_items')}</h3>
          <div style="display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap">
            ${lastNewItemUnlocks.map(id => {
              const item = ITEMS.find(i => i.id === id);
              return item ? `
                <div class="unlock-card">
                  <span style="font-size:2rem">${item.emoji}</span>
                  <span style="font-size:0.6rem;color:var(--text-bright);font-family:var(--font-pixel);margin-top:0.3rem;text-align:center">${item.name}</span>
                </div>
              ` : '';
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="result-buttons">
        ${state.mode === 'arena' ? `
          ${won && state.arenaLevel < 5 ? `
            <button class="btn btn-large" id="btn-next">${t('result.next_arena')}</button>
          ` : ''}
          <button class="btn ${won && state.arenaLevel < 5 ? 'btn-small' : 'btn-large'}" id="btn-menu">${t('result.main_menu')}</button>
          <button class="btn btn-small" id="btn-rematch">${t('result.rematch')}</button>
        ` : `
          ${won ? `<button class="btn btn-large" id="btn-next-floor">${t('result.next_floor')}</button>` : ''}
          ${!won ? `<button class="btn btn-large" id="btn-retry-floor">${t('result.retry_floor')}</button>` : ''}
          <button class="btn btn-small" id="btn-menu">${t('result.main_menu')}</button>
          <button class="btn btn-small" id="btn-reselect">${t('result.change_team')}</button>
        `}
      </div>
    </div>
  `;

  // Arena buttons
  document.getElementById('btn-next')?.addEventListener('click', () => {
    state.arenaLevel++;
    state.screen = 'select';
    state.playerTeam = [];
    render();
  });

  document.getElementById('btn-rematch')?.addEventListener('click', () => {
    const playerLevels = state.playerTeam.map(c => getCharLevel(c.id));
    const playerItemArray = state.playerTeam.map(c => state.playerItems[c.id] || null);
    const { team, levels: cpuLevels } = generateCpuTeam(state.playerTeam, state.arenaLevel);
    const cpuItemArray = cpuEquipItems(team, state.arenaLevel, 0);
    state.cpuTeam = team;
    state.battle = initBattle(state.playerTeam, state.cpuTeam, playerLevels, cpuLevels, playerItemArray, cpuItemArray);
    state.battle.log = [t('battle.start')];
    state.screen = 'battle';
    render();
  });

  // Endless buttons
  document.getElementById('btn-next-floor')?.addEventListener('click', () => {
    const playerLevels = state.playerTeam.map(c => getCharLevel(c.id));
    const playerItemArray = state.playerTeam.map(c => state.playerItems[c.id] || null);
    const nextFloor = state.stats.endless.floor + 1;
    const { team, levels: cpuLevels } = generateEndlessCpuTeam(state.playerTeam, nextFloor);
    const cpuItemArray = cpuEquipItems(team, state.arenaLevel, nextFloor);
    state.cpuTeam = team;
    state.battle = initBattle(state.playerTeam, state.cpuTeam, playerLevels, cpuLevels, playerItemArray, cpuItemArray);
    state.battle.log = [t('battle.start')];
    state.screen = 'battle';
    render();
  });

  document.getElementById('btn-retry-floor')?.addEventListener('click', () => {
    const playerLevels = state.playerTeam.map(c => getCharLevel(c.id));
    const playerItemArray = state.playerTeam.map(c => state.playerItems[c.id] || null);
    const retryFloor = state.stats.endless.floor + 1;
    const { team, levels: cpuLevels } = generateEndlessCpuTeam(state.playerTeam, retryFloor);
    const cpuItemArray = cpuEquipItems(team, state.arenaLevel, retryFloor);
    state.cpuTeam = team;
    state.battle = initBattle(state.playerTeam, state.cpuTeam, playerLevels, cpuLevels, playerItemArray, cpuItemArray);
    state.battle.log = [t('battle.start')];
    state.screen = 'battle';
    render();
  });

  document.getElementById('btn-reselect')?.addEventListener('click', () => {
    state.playerTeam = [];
    state.screen = 'endless_select';
    render();
  });

  document.getElementById('btn-menu')!.addEventListener('click', () => {
    state.screen = 'title';
    state.playerTeam = [];
    state.arenaLevel = 1;
    render();
  });

  setupLangToggle();
}

// ── Boot ────────────────────────────────────────────────────

render();
