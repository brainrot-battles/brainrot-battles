// ── Internationalization ────────────────────────────────────

export type Lang = 'en' | 'de';
const LANG_KEY = 'brainrot-lang';

let lang: Lang = (localStorage.getItem(LANG_KEY) as Lang) || 'en';

export function getLang(): Lang { return lang; }
export function setLang(l: Lang) { lang = l; localStorage.setItem(LANG_KEY, l); }

// ── Main t() function ──────────────────────────────────────

const strings: Record<Lang, Record<string, string>> = {
  en: {
    // Title
    'title.arena': 'ARENA MODE',
    'title.endless': 'ENDLESS MODE',
    'title.reset': 'RESET PROGRESS',
    'title.reset_confirm': 'Reset all progress? Unlocks, stats, XP, everything gone.',
    'title.arena_level': 'Arena {level} / 5',
    'title.best_streak': 'Best streak: {n}',
    'title.rotmons_unlocked': '{n} / {total} Rotmons unlocked',
    'title.endless_stats': 'Endless: Floor {floor} | ELO {elo}',

    // Select
    'select.header': 'CHOOSE YOUR ROTMONS',
    'select.budget': 'BUDGET:',
    'select.remaining': '{n} left',
    'select.selected_info': '{n}/3 selected | S=5 A=4 B=3 C=2 points | Arena {arena}',
    'select.back': 'BACK',
    'select.fight': 'FIGHT!',
    'select.items_unlocked': '{n}/{total} items unlocked',

    // Endless Select
    'endless.header': 'ENDLESS MODE',
    'endless.floor': 'FLOOR',
    'endless.elo': 'ELO',
    'endless.streak': 'STREAK',
    'endless.best': 'BEST',
    'endless.selected_info': '{n}/3 selected | All Rotmons unlocked',
    'endless.fight': 'FLOOR {floor} — FIGHT!',
    'endless.fight_boss': 'FLOOR {floor} (BOSS) — FIGHT!',

    // Battle
    'battle.start': '\u2694\uFE0F BATTLE START! Send your Rotmons into battle!',
    'battle.you': 'YOU',
    'battle.cpu': 'CPU',
    'battle.power': 'PWR:',
    'battle.heal': 'Heal',
    'battle.cooldown': 'CD:',
    'battle.switch_title': 'Your Rotmon fainted! Choose your next one:',
    'battle.switch_hint': 'Click an alive team member above',
    'battle.uses_move': '{prefix}{name} uses {move}!',
    'battle.damage': 'It deals {n} damage!',
    'battle.super_effective': 'Super effective! \uD83D\uDCA5',
    'battle.not_effective': 'Not very effective...',
    'battle.healed': '{prefix}{name} restored {n} HP! \uD83D\uDC9A',
    'battle.recoil': '{prefix}{name} took {n} recoil damage!',
    'battle.fainted': '{prefix}{name} fainted! \uD83D\uDC80',
    'battle.frozen': '{prefix}{name} is frozen and can\'t move! \uD83E\uDDCA',
    'battle.confused_self': '{prefix}{name} hurt itself in confusion! (-{n} HP)',
    'battle.dodged': '{name} dodged the attack! \uD83D\uDCA8',
    'battle.send_out': 'You send out {name}!',
    'battle.cpu_send_out': 'CPU sends out {name}!',
    'battle.dramatic_entrance': '{name} is confused by the dramatic entrance! \uD83C\uDFAD',
    'battle.bleed_tick': '{label} {name} takes {n} bleed damage! \uD83E\uDE78',
    'battle.passive_heal': '{label} {name} heals {n} HP! \u23F3',
    'battle.item_heal': '{label} {name} heals {n} HP! \uD83C\uDF47',
    'battle.nightmare_tick': '{label} {name} takes {n} nightmare damage! \uD83D\uDE31',

    // Status
    'status.bleed': '\uD83E\uDE78 Bleeding',
    'status.confuse': '\uD83D\uDE35 Confused',
    'status.freeze': '\uD83E\uDDCA Frozen',
    'status.caffeinated': '\u26A1 Caffeinated',
    'status.brainrot': '\uD83E\uDDE0 Brainrot',
    'status.bleed_applied': 'is bleeding! \uD83E\uDE78',
    'status.confuse_applied': 'is confused! \uD83D\uDE35',
    'status.freeze_applied': 'is frozen solid! \uD83E\uDDCA',
    'status.caffeinated_applied': 'got caffeinated! \u26A1',
    'status.brainrot_applied': 'caught brainrot! \uD83E\uDDE0',

    // Result
    'result.victory': 'VICTORY!',
    'result.defeat': 'DEFEAT...',
    'result.xp_awarded': '+{n} XP to all Rotmons',
    'result.level_up': '\u2B06\uFE0F {name} reached Level {level}!',
    'result.evo_ex': 'EX EVOLUTION!',
    'result.evo_ultra': 'ULTRA EVOLUTION!',
    'result.evo_omega': 'OMEGA EVOLUTION!',
    'result.new_rotmons': 'NEW ROTMONS UNLOCKED!',
    'result.new_items': 'NEW ITEMS UNLOCKED!',
    'result.streak': '\uD83D\uDD25 {n} WIN STREAK \uD83D\uDD25',
    'result.next_arena': 'NEXT ARENA',
    'result.main_menu': 'MAIN MENU',
    'result.rematch': 'REMATCH',
    'result.next_floor': 'NEXT FLOOR',
    'result.retry_floor': 'RETRY FLOOR',
    'result.change_team': 'CHANGE TEAM',

    // Items
    'item.no_item': 'No item',
    'item.equip_title': 'EQUIP ITEM \u2014 {name}',
    'item.none': 'None',
    'item.in_use': 'IN USE',
    'item.close': 'CLOSE',

    // Help
    'help.title': 'HOW TO PLAY',
    'help.close': 'CLOSE',
    'help.button': 'HELP',

    // Account
    'account.button': 'ACCOUNT',
    'account.title': 'ACCOUNT',
    'account.logged_in_as': 'Logged in as',
    'account.logout': 'LOGOUT',
    'account.login_google': 'SIGN IN WITH GOOGLE',
    'account.login_email': 'SIGN IN WITH E-MAIL',
    'account.register_email': 'CREATE ACCOUNT',
    'account.email_placeholder': 'E-Mail',
    'account.password_placeholder': 'Password (min. 6 chars)',
    'account.or': 'or',
    'account.close': 'CLOSE',
    'account.synced': 'Cloud save synced',
    'account.uploaded': 'Progress uploaded to cloud',
    'account.loaded': 'Cloud save loaded',
    'account.error': 'Error: {msg}',
    'account.cloud_exists': 'Cloud save found! Load cloud save or keep local progress?',
    'account.btn_cloud': 'LOAD CLOUD',
    'account.btn_local': 'KEEP LOCAL',
  },

  de: {
    // Title
    'title.arena': 'ARENA-MODUS',
    'title.endless': 'ENDLOS-MODUS',
    'title.reset': 'FORTSCHRITT ZURÜCKSETZEN',
    'title.reset_confirm': 'Gesamten Fortschritt zurücksetzen? Unlocks, Stats, XP, alles weg.',
    'title.arena_level': 'Arena {level} / 5',
    'title.best_streak': 'Beste Serie: {n}',
    'title.rotmons_unlocked': '{n} / {total} Rotmons freigeschaltet',
    'title.endless_stats': 'Endlos: Etage {floor} | ELO {elo}',

    // Select
    'select.header': 'WÄHLE DEINE ROTMONS',
    'select.budget': 'BUDGET:',
    'select.remaining': '{n} übrig',
    'select.selected_info': '{n}/3 gewählt | S=5 A=4 B=3 C=2 Punkte | Arena {arena}',
    'select.back': 'ZURÜCK',
    'select.fight': 'KAMPF!',
    'select.items_unlocked': '{n}/{total} Items freigeschaltet',

    // Endless Select
    'endless.header': 'ENDLOS-MODUS',
    'endless.floor': 'ETAGE',
    'endless.elo': 'ELO',
    'endless.streak': 'SERIE',
    'endless.best': 'REKORD',
    'endless.selected_info': '{n}/3 gewählt | Alle Rotmons verfügbar',
    'endless.fight': 'ETAGE {floor} \u2014 KAMPF!',
    'endless.fight_boss': 'ETAGE {floor} (BOSS) \u2014 KAMPF!',

    // Battle
    'battle.start': '\u2694\uFE0F KAMPF START! Schick deine Rotmons in den Kampf!',
    'battle.you': 'DU',
    'battle.cpu': 'CPU',
    'battle.power': 'STK:',
    'battle.heal': 'Heil',
    'battle.cooldown': 'CD:',
    'battle.switch_title': 'Dein Rotmon ist besiegt! Wähle dein nächstes:',
    'battle.switch_hint': 'Klicke auf ein lebendes Teammitglied oben',
    'battle.uses_move': '{prefix}{name} setzt {move} ein!',
    'battle.damage': 'Es verursacht {n} Schaden!',
    'battle.super_effective': 'Super effektiv! \uD83D\uDCA5',
    'battle.not_effective': 'Nicht sehr effektiv...',
    'battle.healed': '{prefix}{name} stellt {n} HP wieder her! \uD83D\uDC9A',
    'battle.recoil': '{prefix}{name} erleidet {n} Rückstoßschaden!',
    'battle.fainted': '{prefix}{name} wurde besiegt! \uD83D\uDC80',
    'battle.frozen': '{prefix}{name} ist eingefroren und kann nicht handeln! \uD83E\uDDCA',
    'battle.confused_self': '{prefix}{name} hat sich vor Verwirrung selbst getroffen! (-{n} HP)',
    'battle.dodged': '{name} ist dem Angriff ausgewichen! \uD83D\uDCA8',
    'battle.send_out': 'Du schickst {name} in den Kampf!',
    'battle.cpu_send_out': 'CPU schickt {name} in den Kampf!',
    'battle.dramatic_entrance': '{name} ist verwirrt durch den dramatischen Auftritt! \uD83C\uDFAD',
    'battle.bleed_tick': '{label} {name} erleidet {n} Blutungsschaden! \uD83E\uDE78',
    'battle.passive_heal': '{label} {name} heilt {n} HP! \u23F3',
    'battle.item_heal': '{label} {name} heilt {n} HP! \uD83C\uDF47',
    'battle.nightmare_tick': '{label} {name} erleidet {n} Alptraumschaden! \uD83D\uDE31',

    // Status
    'status.bleed': '\uD83E\uDE78 Blutung',
    'status.confuse': '\uD83D\uDE35 Verwirrt',
    'status.freeze': '\uD83E\uDDCA Eingefroren',
    'status.caffeinated': '\u26A1 Koffeiniert',
    'status.brainrot': '\uD83E\uDDE0 Hirnfäule',
    'status.bleed_applied': 'blutet! \uD83E\uDE78',
    'status.confuse_applied': 'ist verwirrt! \uD83D\uDE35',
    'status.freeze_applied': 'ist eingefroren! \uD83E\uDDCA',
    'status.caffeinated_applied': 'ist koffeiniert! \u26A1',
    'status.brainrot_applied': 'hat Hirnfäule! \uD83E\uDDE0',

    // Result
    'result.victory': 'SIEG!',
    'result.defeat': 'NIEDERLAGE...',
    'result.xp_awarded': '+{n} XP für alle Rotmons',
    'result.level_up': '\u2B06\uFE0F {name} hat Level {level} erreicht!',
    'result.evo_ex': 'EX EVOLUTION!',
    'result.evo_ultra': 'ULTRA EVOLUTION!',
    'result.evo_omega': 'OMEGA EVOLUTION!',
    'result.new_rotmons': 'NEUE ROTMONS FREIGESCHALTET!',
    'result.new_items': 'NEUE ITEMS FREIGESCHALTET!',
    'result.streak': '\uD83D\uDD25 {n}ER SIEGESSERIE \uD83D\uDD25',
    'result.next_arena': 'NÄCHSTE ARENA',
    'result.main_menu': 'HAUPTMENÜ',
    'result.rematch': 'REVANCHE',
    'result.next_floor': 'NÄCHSTE ETAGE',
    'result.retry_floor': 'ETAGE WIEDERHOLEN',
    'result.change_team': 'TEAM ÄNDERN',

    // Items
    'item.no_item': 'Kein Item',
    'item.equip_title': 'ITEM AUSRÜSTEN \u2014 {name}',
    'item.none': 'Keins',
    'item.in_use': 'IN BENUTZUNG',
    'item.close': 'SCHLIESSEN',

    // Help
    'help.title': 'SPIELANLEITUNG',
    'help.close': 'SCHLIESSEN',
    'help.button': 'HILFE',

    // Account
    'account.button': 'KONTO',
    'account.title': 'KONTO',
    'account.logged_in_as': 'Eingeloggt als',
    'account.logout': 'ABMELDEN',
    'account.login_google': 'MIT GOOGLE ANMELDEN',
    'account.login_email': 'MIT E-MAIL ANMELDEN',
    'account.register_email': 'KONTO ERSTELLEN',
    'account.email_placeholder': 'E-Mail',
    'account.password_placeholder': 'Passwort (min. 6 Zeichen)',
    'account.or': 'oder',
    'account.close': 'SCHLIESSEN',
    'account.synced': 'Cloud-Spielstand synchronisiert',
    'account.uploaded': 'Fortschritt in die Cloud hochgeladen',
    'account.loaded': 'Cloud-Spielstand geladen',
    'account.error': 'Fehler: {msg}',
    'account.cloud_exists': 'Cloud-Spielstand gefunden! Cloud laden oder lokalen Fortschritt behalten?',
    'account.btn_cloud': 'CLOUD LADEN',
    'account.btn_local': 'LOKAL BEHALTEN',
  },
};

export function t(key: string, params?: Record<string, string | number>): string {
  let str = strings[lang][key] ?? strings['en'][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

// ── Description translator ─────────────────────────────────
// Translates inline descriptions (moves, passives, items) by English key

const descDe: Record<string, string> = {
  // ── Move Descriptions ──
  // Tung Tung
  'A devastating bat swing from beyond.': 'Ein verheerender Schlag aus dem Jenseits.',
  'Classified attack. Maximum destruction.': 'Geheime Attacke. Maximale Zerstörung.',
  'Rhythmic terror that bleeds the soul.': 'Rhythmischer Terror, der die Seele bluten lässt.',
  'Reality tears open. Something comes through.': 'Die Realität reißt auf. Etwas kommt durch.',
  // Vaca Saturno
  'An infinite gaze from the void.': 'Ein unendlicher Blick aus der Leere.',
  'A gravitational moo that devours everything.': 'Ein Gravitationsmuhen, das alles verschlingt.',
  "Saturn's rings slice through space-time.": 'Saturns Ringe schneiden durch die Raumzeit.',
  '...': '...',
  // Bombardiro
  'Standard explosive payload.': 'Standard-Sprengladung.',
  'Indiscriminate area bombardment.': 'Flächenbombardierung ohne Rücksicht.',
  'Prehistoric jaws snap shut.': 'Urzeitliche Kiefer schnappen zu.',
  "Geneva Convention? Never heard of it.": 'Genfer Konvention? Nie gehört.',
  // Tralalero
  'Triple-legged sneaker combo.': 'Dreibeinige Sneaker-Combo.',
  'A screech that breaks the fourth wall.': 'Ein Schrei, der die vierte Wand durchbricht.',
  'Three legs, three kicks, no mercy.': 'Drei Beine, drei Tritte, keine Gnade.',
  'Full-speed Nike-powered blitz.': 'Nike-Blitz mit Vollgas.',
  // Brr Patapim
  'Ancient roots erupt from below.': 'Uralte Wurzeln brechen aus dem Boden.',
  'The forest heals its guardian. Restores 25 HP.': 'Der Wald heilt seinen Wächter. Stellt 25 HP wieder her.',
  'Vines constrict and squeeze.': 'Ranken umschließen und zerquetschen.',
  'Giant feet descend. The earth trembles.': 'Riesige Füße stampfen herab. Die Erde bebt.',
  // Cappuccino Assassino
  'Boiling coffee stars fly.': 'Kochend heiße Kaffee-Sterne fliegen.',
  'Disappears into the steam.': 'Verschwindet im Dampf.',
  'One clean cut. No mercy.': 'Ein sauberer Schnitt. Keine Gnade.',
  'All the pain of betrayal in one strike.': 'All der Schmerz des Verrats in einem Schlag.',
  // Ballerina
  'Hot coffee sprays in a graceful spin.': 'Heißer Kaffee spritzt in eleganter Drehung.',
  'Mesmerizing dance.': 'Bezaubernder Tanz.',
  'Too much espresso. Chaos ensues.': 'Zu viel Espresso. Chaos bricht aus.',
  'The entire love triangle crashes down.': 'Das ganze Liebesdreieck stürzt ein.',
  // Chimpanzini
  'Not just a fruit anymore.': 'Nicht mehr nur eine Frucht.',
  'Classic but effective.': 'Klassisch, aber effektiv.',
  'The banana opens. Death emerges.': 'Die Banane öffnet sich. Der Tod tritt hervor.',
  'Calculated. Precise. Lethal.': 'Kalkuliert. Präzise. Tödlich.',
  // Bobrito
  'Infinite ammo. No aim needed.': 'Unendlich Munition. Zielen unnötig.',
  'Disappears into the night.': 'Verschwindet in die Nacht.',
  'A razor-sharp hat through the air.': 'Ein rasiermesserscharfer Hut durch die Luft.',
  'Steals your HP and your dignity.': 'Klaut deine HP und deine Würde.',
  // Trippi Troppi
  'Water from an unknowable dimension.': 'Wasser aus einer unbekannten Dimension.',
  'Changes form. Which one? Yes.': 'Wechselt die Form. Welche? Ja.',
  'Surprisingly devastating.': 'Überraschend verheerend.',
  'All forms attack at once.': 'Alle Formen greifen gleichzeitig an.',
  // Lirili
  'Oversized footwear, maximum impact.': 'Übergroßes Schuhwerk, maximaler Impact.',
  'Spiny defense. Restores 20 HP.': 'Stachelige Verteidigung. Stellt 20 HP wieder her.',
  'Attacks from a different timeline.': 'Greift aus einer anderen Timeline an.',
  'Sand and needles everywhere.': 'Sand und Nadeln überall.',
  // Frigo Camelo
  'Refrigerated camel breath. Gross.': 'Gekühlter Kamelatem. Ekelhaft.',
  'Opens the fridge door. Everything freezes.': 'Öffnet die Kühlschranktür. Alles friert ein.',
  'Ice chunks fly everywhere.': 'Eisbrocken fliegen überall hin.',
  'Refuses to die. Restores 30 HP.': 'Weigert sich zu sterben. Stellt 30 HP wieder her.',
  // Boneca
  'Rolls menacingly toward you.': 'Rollt bedrohlich auf dich zu.',
  'You feel deeply uncomfortable.': 'Du fühlst dich zutiefst unwohl.',
  'Indonesian dark magic.': 'Indonesische Schwarzmagie.',
  'Leaps and lands on your face.': 'Springt und landet auf deinem Gesicht.',
  // Rhino Toasterino
  'Surprise! Burning toast to the face.': 'Überraschung! Brennender Toast ins Gesicht.',
  'Crumbs everywhere. Annoying and painful.': 'Krümel überall. Nervig und schmerzhaft.',
  'Full speed, toaster glowing red.': 'Volle Geschwindigkeit, Toaster glüht rot.',
  'Eats own toast. Heals 20 HP. Questionable.': 'Isst eigenen Toast. Heilt 20 HP. Fragwürdig.',
  // Bananita
  'Tail whip with banana physics.': 'Schwanzschlag mit Bananen-Physik.',
  'Too slippery. Gains caffeinated buff.': 'Zu rutschig. Koffein-Buff aktiviert.',
  'Majestic airborne banana impact.': 'Majestätischer Bananen-Aufprall aus der Luft.',
  'Full-speed frulli combo.': 'Volle Geschwindigkeit Frulli-Combo.',
  // Orangutini
  'Spiky fist to the face.': 'Stachelige Faust ins Gesicht.',
  'Hardens the pineapple shell. Heals 15 HP.': 'Härtet die Ananasschale. Heilt 15 HP.',
  'Full-body pineapple press.': 'Ganzkörper-Ananas-Presse.',
  'Goes full ape. Unstoppable.': 'Dreht voll durch. Unaufhaltbar.',

  // ── Passive Descriptions ──
  'Deals 10% more damage when an ally has fainted.': 'Verursacht 10% mehr Schaden wenn ein Verbündeter besiegt wurde.',
  'Status effects last 1 extra turn.': 'Statuseffekte halten 1 Runde länger.',
  'Super-effective attacks deal 15% more damage.': 'Super-effektive Angriffe verursachen 15% mehr Schaden.',
  'Always has +15% speed.': 'Immer +15% Geschwindigkeit.',
  'Takes 10% less damage from all attacks.': 'Erleidet 10% weniger Schaden.',
  'First attack each battle deals 20% more damage.': 'Erster Angriff pro Kampf verursacht 20% mehr Schaden.',
  '30% chance to confuse opponent on switch-in.': '30% Chance den Gegner beim Einwechseln zu verwirren.',
  'Cooldowns reduce 1 turn faster.': 'Cooldowns reduzieren sich 1 Runde schneller.',
  'Multi-hit moves deal 10% more damage.': 'Multi-Hit-Moves verursachen 10% mehr Schaden.',
  '25% chance to resist status effects.': '25% Chance Statuseffekte zu widerstehen.',
  'Heals 5 HP at end of each turn.': 'Heilt 5 HP am Ende jeder Runde.',
  '+20% defense when below 25% HP.': '+20% Verteidigung unter 25% HP.',
  'Opponent takes 3 damage at end of each turn.': 'Gegner erleidet 3 Schaden am Ende jeder Runde.',
  '20% chance to negate recoil damage.': '20% Chance Rückstoßschaden zu negieren.',
  '20% chance to dodge attacks completely.': '20% Chance Angriffen komplett auszuweichen.',
  'Starts battle with +10% max HP.': 'Startet den Kampf mit +10% max HP.',

  // ── Item Descriptions ──
  '+10% speed.': '+10% Geschwindigkeit.',
  '-8% incoming damage.': '-8% erlittener Schaden.',
  '+8% damage dealt.': '+8% verursachter Schaden.',
  '+8 HP healed per turn.': '+8 HP Heilung pro Runde.',
  '30% status resistance.': '30% Statusresistenz.',
  '+20% damage, but +10% incoming damage.': '+20% Schaden, aber +10% erlittener Schaden.',
  'Cooldowns reduce 1 turn faster.': 'Cooldowns reduzieren sich 1 Runde schneller.',
  '+15% status effect chance.': '+15% Status-Chance.',
  '+12% damage, 5 recoil per attack.': '+12% Schaden, 5 Rückstoß pro Angriff.',
  '+25% damage when below 30% HP.': '+25% Schaden unter 30% HP.',
};

export function tDesc(englishDesc: string): string {
  if (lang === 'en') return englishDesc;
  return descDe[englishDesc] ?? englishDesc;
}

// ── Sarcastic Lines ────────────────────────────────────────

const victoryLines: Record<Lang, string[]> = {
  en: [
    "You won. Your dopamine receptors are thrilled. Are you proud?",
    "Congratulations, you defeated a CPU. The machines aren't scared yet.",
    "Victory! Your screen time was totally worth it.",
    "You did it! Now close this tab and go outside. Just kidding.",
    "Winner winner, brainrot dinner.",
    "The algorithm approves of your combat skills.",
  ],
  de: [
    "Gewonnen. Deine Dopamin-Rezeptoren flippen aus. Bist du stolz?",
    "Glückwunsch, du hast eine KI besiegt. Die Maschinen zittern noch nicht.",
    "Sieg! Deine Bildschirmzeit hat sich voll gelohnt.",
    "Geschafft! Jetzt mach den Tab zu und geh raus. War nur Spaß.",
    "Gewinner Gewinner, Hirnfäule-Dinner.",
    "Der Algorithmus billigt deine Kampfkünste.",
  ],
};

const defeatLines: Record<Lang, string[]> = {
  en: [
    "You lost to an AI playing fictional meme creatures. Rock bottom.",
    "Defeat. Even Frigo Camelo would be disappointed.",
    "The brainrot consumed you. There is no cure.",
    "L + ratio + you lost to Italian meme animals.",
    "Your dopamine crashed harder than your team.",
    "Maybe try touching grass? It's super effective.",
  ],
  de: [
    "Du hast gegen eine KI mit fiktiven Meme-Viechern verloren. Tiefpunkt.",
    "Niederlage. Selbst Frigo Camelo wäre enttäuscht.",
    "Die Hirnfäule hat dich verschlungen. Es gibt keine Heilung.",
    "L + Ratio + du hast gegen italienische Meme-Tiere verloren.",
    "Dein Dopamin ist härter gecrasht als dein Team.",
    "Versuch's mal mit Gras anfassen. Ist super effektiv.",
  ],
};

const introLines: Record<Lang, string[]> = {
  en: [
    "Your brain cells called. They want a refund.",
    "Warning: This game has zero educational value.",
    "Surgeon General's Warning: Pure brainrot ahead.",
    "The memes have evolved. They fight now.",
    "Italy's greatest cultural export since pizza.",
  ],
  de: [
    "Deine Gehirnzellen haben angerufen. Sie wollen ihr Geld zurück.",
    "Warnung: Dieses Spiel hat null Bildungswert.",
    "Gesundheitswarnung: Reine Hirnfäule voraus.",
    "Die Memes haben sich weiterentwickelt. Sie kämpfen jetzt.",
    "Italiens größter Kulturexport seit Pizza.",
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomVictoryLine(): string { return randomFrom(victoryLines[lang]); }
export function randomDefeatLine(): string { return randomFrom(defeatLines[lang]); }
export function randomIntroLine(): string { return randomFrom(introLines[lang]); }

// ── Help Page Content ──────────────────────────────────────

const helpContent: Record<Lang, string> = {
  en: `
    <div class="help-content">
      <section class="help-section">
        <h3>WHAT ARE ROTMONS?</h3>
        <p>Rotmons are Italian brainrot meme creatures that battle each other. Each Rotmon has unique stats, moves, a passive ability, and an element type. Build a team of 3 and fight!</p>
      </section>

      <section class="help-section">
        <h3>TYPES & EFFECTIVENESS</h3>
        <p>There are 7 element types. Each has strengths (2x damage) and weaknesses (0.5x damage).</p>
        <table class="help-type-table">
          <tr><th>Type</th><th>Strong vs</th><th>Weak vs</th></tr>
          <tr><td>\uD83D\uDCA3 Militare</td><td>Natura, Frutta</td><td>Cosmico, Aquatico</td></tr>
          <tr><td>\uD83C\uDF3F Natura</td><td>Aquatico, Cucina</td><td>Militare, Frutta</td></tr>
          <tr><td>\uD83C\uDF0A Aquatico</td><td>Militare, Cucina</td><td>Natura, Spirito</td></tr>
          <tr><td>\u2728 Cosmico</td><td>Militare, Spirito</td><td>Cucina, Natura</td></tr>
          <tr><td>\uD83D\uDC7B Spirito</td><td>Natura, Aquatico</td><td>Cosmico, Frutta</td></tr>
          <tr><td>\u2615 Cucina</td><td>Cosmico, Spirito</td><td>Aquatico, Militare</td></tr>
          <tr><td>\uD83C\uDF4C Frutta</td><td>Natura, Cucina</td><td>Militare, Spirito</td></tr>
        </table>
      </section>

      <section class="help-section">
        <h3>BUILDING YOUR TEAM</h3>
        <p>You have a <strong>budget of 10 points</strong> to build a team of 3 Rotmons.</p>
        <p>S-Tier = 5 pts | A-Tier = 4 pts | B-Tier = 3 pts | C-Tier = 2 pts</p>
        <p>Mix and match! A full S+A+C team (5+4+2=11) is too expensive, but S+C+C (5+2+2=9) works.</p>
      </section>

      <section class="help-section">
        <h3>BATTLE SYSTEM</h3>
        <p>Each Rotmon has 4 moves. The faster Rotmon attacks first each turn.</p>
        <p>Moves have power, type, and cooldowns. Special moves (cooldown 3+) are stronger but can't be spammed.</p>
        <p>Some moves heal, inflict status effects, or deal recoil damage to the user.</p>
      </section>

      <section class="help-section">
        <h3>STATUS EFFECTS</h3>
        <p>\uD83E\uDE78 <strong>Bleed</strong> \u2014 5 damage per turn</p>
        <p>\uD83D\uDE35 <strong>Confuse</strong> \u2014 30% chance to hit yourself</p>
        <p>\uD83E\uDDCA <strong>Freeze</strong> \u2014 Can't move for the duration</p>
        <p>\u26A1 <strong>Caffeinated</strong> \u2014 +50% speed (buff!)</p>
        <p>\uD83E\uDDE0 <strong>Brainrot</strong> \u2014 Uses a random move instead</p>
      </section>

      <section class="help-section">
        <h3>PASSIVES</h3>
        <p>Every Rotmon has a unique passive ability that's always active. Some boost damage, some provide defense, some trigger on switch-in. Check each Rotmon's card to see their passive!</p>
      </section>

      <section class="help-section">
        <h3>ITEMS</h3>
        <p>Equip 1 item per Rotmon before battle. Items give bonus stats or special effects.</p>
        <p>3 items are available from the start. More unlock as you progress through Arena and Endless mode.</p>
      </section>

      <section class="help-section">
        <h3>XP & EVOLUTION</h3>
        <p>Your Rotmons earn XP after every battle (win or lose). As they level up, their stats increase (+2.5% per level).</p>
        <p>At certain levels, they evolve and gain visual upgrades:</p>
        <p>Level 5 \u2192 <strong>EX</strong> | Level 10 \u2192 <strong>ULTRA</strong> | Level 15 \u2192 <strong>OMEGA</strong></p>
      </section>

      <section class="help-section">
        <h3>GAME MODES</h3>
        <p><strong>Arena Mode</strong> \u2014 Beat 5 arena levels to unlock all Rotmons. New Rotmons unlock after each win.</p>
        <p><strong>Endless Mode</strong> \u2014 Unlocks after Arena 5. How far can you climb? Enemies scale with each floor. Boss fights every 5 floors. Track your ELO rating!</p>
      </section>
    </div>
  `,

  de: `
    <div class="help-content">
      <section class="help-section">
        <h3>WAS SIND ROTMONS?</h3>
        <p>Rotmons sind italienische Brainrot-Meme-Kreaturen, die gegeneinander kämpfen. Jedes Rotmon hat einzigartige Stats, Moves, eine passive Fähigkeit und einen Elementtyp. Baue ein Team aus 3 und kämpfe!</p>
      </section>

      <section class="help-section">
        <h3>TYPEN & EFFEKTIVITÄT</h3>
        <p>Es gibt 7 Elementtypen. Jeder hat Stärken (2x Schaden) und Schwächen (0.5x Schaden).</p>
        <table class="help-type-table">
          <tr><th>Typ</th><th>Stark gegen</th><th>Schwach gegen</th></tr>
          <tr><td>\uD83D\uDCA3 Militare</td><td>Natura, Frutta</td><td>Cosmico, Aquatico</td></tr>
          <tr><td>\uD83C\uDF3F Natura</td><td>Aquatico, Cucina</td><td>Militare, Frutta</td></tr>
          <tr><td>\uD83C\uDF0A Aquatico</td><td>Militare, Cucina</td><td>Natura, Spirito</td></tr>
          <tr><td>\u2728 Cosmico</td><td>Militare, Spirito</td><td>Cucina, Natura</td></tr>
          <tr><td>\uD83D\uDC7B Spirito</td><td>Natura, Aquatico</td><td>Cosmico, Frutta</td></tr>
          <tr><td>\u2615 Cucina</td><td>Cosmico, Spirito</td><td>Aquatico, Militare</td></tr>
          <tr><td>\uD83C\uDF4C Frutta</td><td>Natura, Cucina</td><td>Militare, Spirito</td></tr>
        </table>
      </section>

      <section class="help-section">
        <h3>TEAM ZUSAMMENSTELLEN</h3>
        <p>Du hast ein <strong>Budget von 10 Punkten</strong> für ein Team aus 3 Rotmons.</p>
        <p>S-Tier = 5 Pkt | A-Tier = 4 Pkt | B-Tier = 3 Pkt | C-Tier = 2 Pkt</p>
        <p>Mischen erlaubt! S+A+C (5+4+2=11) ist zu teuer, aber S+C+C (5+2+2=9) geht.</p>
      </section>

      <section class="help-section">
        <h3>KAMPFSYSTEM</h3>
        <p>Jedes Rotmon hat 4 Moves. Das schnellere Rotmon greift pro Runde zuerst an.</p>
        <p>Moves haben Stärke, Typ und Cooldowns. Spezial-Moves (Cooldown 3+) sind stärker, aber nicht spammbar.</p>
        <p>Manche Moves heilen, verursachen Statuseffekte oder Rückstoßschaden.</p>
      </section>

      <section class="help-section">
        <h3>STATUSEFFEKTE</h3>
        <p>\uD83E\uDE78 <strong>Blutung</strong> \u2014 5 Schaden pro Runde</p>
        <p>\uD83D\uDE35 <strong>Verwirrt</strong> \u2014 30% Chance sich selbst zu treffen</p>
        <p>\uD83E\uDDCA <strong>Eingefroren</strong> \u2014 Kann nicht handeln</p>
        <p>\u26A1 <strong>Koffeiniert</strong> \u2014 +50% Geschwindigkeit (Buff!)</p>
        <p>\uD83E\uDDE0 <strong>Hirnfäule</strong> \u2014 Benutzt einen zufälligen Move</p>
      </section>

      <section class="help-section">
        <h3>PASSIVE FÄHIGKEITEN</h3>
        <p>Jedes Rotmon hat eine einzigartige passive Fähigkeit, die immer aktiv ist. Manche boosten Schaden, manche bieten Verteidigung, manche lösen beim Einwechseln aus. Schau auf die Karte jedes Rotmons!</p>
      </section>

      <section class="help-section">
        <h3>ITEMS</h3>
        <p>Rüste 1 Item pro Rotmon vor dem Kampf aus. Items geben Bonus-Stats oder Spezialeffekte.</p>
        <p>3 Items sind von Anfang an verfügbar. Weitere schaltest du im Arena- und Endlos-Modus frei.</p>
      </section>

      <section class="help-section">
        <h3>XP & EVOLUTION</h3>
        <p>Deine Rotmons bekommen XP nach jedem Kampf (Sieg oder Niederlage). Mit jedem Level steigen ihre Stats (+2,5% pro Level).</p>
        <p>Bei bestimmten Leveln entwickeln sie sich weiter und bekommen visuelle Upgrades:</p>
        <p>Level 5 \u2192 <strong>EX</strong> | Level 10 \u2192 <strong>ULTRA</strong> | Level 15 \u2192 <strong>OMEGA</strong></p>
      </section>

      <section class="help-section">
        <h3>SPIELMODI</h3>
        <p><strong>Arena-Modus</strong> \u2014 Besiege 5 Arena-Level um alle Rotmons freizuschalten. Neue Rotmons werden nach jedem Sieg freigeschaltet.</p>
        <p><strong>Endlos-Modus</strong> \u2014 Wird nach Arena 5 freigeschaltet. Wie weit kommst du? Gegner skalieren mit jeder Etage. Bosskämpfe alle 5 Etagen. Verfolge dein ELO-Rating!</p>
      </section>
    </div>
  `,
};

export function getHelpHTML(): string {
  return helpContent[lang];
}
