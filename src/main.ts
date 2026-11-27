import './style.css';
import './ui/dayscreen.css';
import { h, btn } from './ui/dom';
import { getSave, commit, exportJson, exportCode, importText, replaceSave, defaults } from './game/save';
import { dayKey, nextDay, rank, RANK_TITLE, streak, unitDays } from './game/progress';
import { hasActiveSession } from './game/session';
import { startSession } from './game/daystart';
import { mountDayScreen, type DayScreen, type NavView } from './ui/dayscreen';
import { mountBucket } from './ui/bucketpanel';
import { manifest, cardsForDay, dayInfo, badgeOf, faults } from './content';
import { SHOW_UNREVIEWED } from './config';
import { SYMBOL_KEYS, symbolFigure } from './ui/symbols';

type View = 'home' | 'day' | 'lessons' | 'practice' | 'bucket' | 'progress' | 'settings';
const save0 = getSave();
// A saved session (mid-day, or finished but not dismissed) reopens straight into the one-screen day.
let view: View = save0.session ? 'day' : 'home';
const app = document.getElementById('app')!;
let dayScreen: DayScreen | null = null;

function theme() {
  const t = getSave().settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}
function go(v: View) { view = v; render(); window.scrollTo(0, 0); }
function openDay(day: number, extraRep: boolean) { startSession(getSave(), day, extraRep, dayKey()); commit(); go('day'); }

function paintBar(bar: HTMLElement) {
  const save = getSave();
  const items: [View, string][] = [['home', 'Work order'], ['lessons', 'Lessons'], ['practice', 'Practice'], ['bucket', 'Bucket'], ['progress', 'Progress']];
  bar.replaceChildren(...items.map(([t, l]) => h('button', { class: 'tab' + (view === t ? ' on' : ''), type: 'button', onclick: () => go(t) }, l)),
    ...(save.session ? [h('button', { class: 'tab', type: 'button', onclick: () => go('day') }, save.session.completed ? 'Back to the day' : 'Resume the day')] : []));
}

/** Symbol gallery at #symbols: every NEMA symbol the app draws, for review against NEMA ICS 19 / IEEE 315. */
function gallery() {
  dayScreen = null;
  app.replaceChildren(h('main', { class: 'main' }, h('h1', {}, 'Symbol gallery (for review)'), h('p', { class: 'small' }, 'Every symbol the app draws, from one renderer (src/ui/symbols.ts). Shapes pending reviewer cross-check against NEMA ICS 19 / IEEE 315.'),
    ...SYMBOL_KEYS.map((k) => h('div', { class: 'card' }, h('strong', {}, k), h('div', { class: 'symbox' }, symbolFigure(k, k === 'relay-coil' ? 'CR1' : k === 'pilot-light' ? 'G' : ''))))));
}

function render() {
  theme();
  if (location.hash === '#symbols') return gallery();
  const save = getSave();
  if (view === 'day' && !save.session) view = 'home';
  if (view === 'day') {
    if (dayScreen && app.contains(dayScreen.el)) return;
    document.body.classList.add('ds-body');
    dayScreen = mountDayScreen(app, {
      onNavigate: (v: NavView) => { dayScreen?.destroy(); dayScreen = null; go(v === 'lessons' ? 'lessons' : v === 'practice' ? 'practice' : v === 'progress' ? 'progress' : v === 'settings' ? 'settings' : 'home'); },
      onExit: (extra) => { dayScreen = null; if (extra) { const s = getSave(); openDay(Math.max(1, nextDay(s)), true); } else go('home'); },
    });
    return;
  }
  dayScreen?.destroy(); dayScreen = null;
  document.body.classList.remove('ds-body');
  const bar = h('nav', { class: 'bar', 'aria-label': 'Main' });
  const banners = h('div', { class: 'banners' });
  const main = h('main', { class: 'main page-main', id: 'page-main' });
  app.replaceChildren(bar, h('div', { class: 'workspace' }, banners, main));
  paintBar(bar);
  const b: HTMLElement[] = [];
  if (SHOW_UNREVIEWED) b.push(h('div', { class: 'testbanner' }, 'PLAY-TEST BUILD: content shows with UNREVIEWED badges until the reviewer approves it.'));
  b.push(h('div', { class: 'banner', id: 'loto-banner' }, 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.'));
  banners.replaceChildren(...b);
  const today = dayKey();
  const active = hasActiveSession(save, false) ? save.session : null;
  const activeExtra = hasActiveSession(save, true) ? save.session : null;

  if (view === 'home') {
    const day = nextDay(save), info = dayInfo(day);
    const done = Object.keys(save.completedDays).length;
    main.append(h('h1', {}, 'Understanding Motor Controls'), h('p', { class: 'small' }, `Act 1 · Chapter 1 · Bucket 1A · ${RANK_TITLE[rank(save)]} · streak ${streak(save.activity, save.settings.days, today)}`));
    if (active) main.append(h('div', { class: 'card' }, h('div', { class: 'small' }, 'Work order from the foreman'), h('h2', {}, `Day ${active.day} in progress`), h('p', {}, dayInfo(active.day)?.focus ?? ''), btn(`Resume Day ${active.day}`, () => go('day'), 'primary')));
    else if (activeExtra) main.append(h('div', { class: 'card' }, h('p', {}, 'You have an extra rep in progress.'), btn('Resume extra rep', () => go('day'), 'primary')));
    else main.append(h('div', { class: 'card' }, h('div', { class: 'small' }, 'Work order from the foreman'), h('h2', {}, `Day ${day}${save.completedDays[String(day)] ? ' (repeat)' : ''}`), h('p', {}, info?.focus ?? ''), h('p', { class: 'small' }, `${done}/10 days complete`), btn(`Start Day ${day}`, () => openDay(day, false), 'primary')));
    if (!active && !activeExtra) main.append(h('div', { class: 'card' }, h('strong', {}, 'Replay a day'), h('div', { class: 'row' }, ...Array.from({ length: 10 }, (_, i) => i + 1).filter((n) => save.completedDays[String(n)] || n <= day).map((n) => btn(String(n), () => openDay(n, false), 'small day')))));
    main.append(h('div', { class: 'card small' }, h('strong', {}, 'Exam / locally enforced edition notes'), h('p', {}, 'Exam / locally enforced edition notes — coming once confirmed.')));
  } else if (view === 'lessons') {
    main.append(h('h1', {}, 'Lessons'));
    for (let n = 1; n <= 9; n++) if (save.completedDays[String(n)] || n <= nextDay(save)) main.append(h('details', { class: 'card' }, h('summary', {}, `Day ${n}: ${dayInfo(n)?.focus}`), ...cardsForDay(n).map((c) => h('div', { class: 'lib' }, badgeOf.get(c.id) ? h('span', { class: 'badge unrev' }, badgeOf.get(c.id)!) : null, h('h3', {}, c.body.title), h('p', {}, c.body.text), h('p', { class: 'field' }, c.body.fieldNote)))));
  } else if (view === 'practice') {
    if (activeExtra) main.append(h('h1', {}, 'Practice'), h('p', {}, 'You have an extra rep in progress.'), btn('Resume extra rep', () => go('day'), 'primary'));
    else if (active) main.append(h('h1', {}, 'Practice'), h('p', {}, `You have Day ${active.day} in progress. Finish that session before starting an extra rep, so mid-day progress is not interrupted.`), btn(`Resume Day ${active.day}`, () => go('day'), 'primary'));
    else main.append(h('h1', {}, 'Practice'), h('p', {}, 'An optional extra rep: six mixed questions from the days you have reached.'), btn('Start extra rep', () => openDay(Math.max(1, nextDay(save)), true), 'primary'));
  } else if (view === 'bucket') {
    main.append(h('h1', {}, 'Bucket 1A (classic bench)'), h('p', { class: 'small' }, 'The full bench: physical and schematic views, meter, controls, process, lockout sheet. The one-screen day has the redrawn bucket.'));
    const host = h('div', { class: 'bench-page' });
    main.append(host);
    mountBucket(host, { title: 'Bucket 1A', showLoto: true, troubleshoot: false });
  } else if (view === 'progress') {
    main.append(h('h1', {}, 'Progress'), h('div', { class: 'card' }, h('p', {}, `Rank: ${RANK_TITLE[rank(save)]}`), h('p', {}, `XP: ${save.xp}`), h('p', {}, `Safety violations logged: ${save.safetyViolations}`),
      h('p', { class: 'small' }, 'Rank follows completed book units (and the Day 10 commissioning check), not XP alone.'), ...Object.entries(unitDays).map(([u, ds]) => h('p', {}, `Unit ${u}: ${ds.filter((n) => save.completedDays[String(n)]).length}/${ds.length} days`))),
      h('div', { class: 'card' }, h('strong', {}, 'Trouble-ticket log'), save.tickets.length ? h('ul', {}, ...save.tickets.slice().reverse().map((t) => h('li', {}, `${t.date} · ${faults().find((f) => f.body.engineId === t.faultId)?.body.title ?? t.faultId} · ${t.passed ? 'PASS' : 'needs work'} (${t.score})`))) : h('p', { class: 'small' }, 'No tickets yet.')),
      h('div', { class: 'card' }, h('strong', {}, 'Book practice scores (from the paper questions)'), ...[1, 2, 3].map((u) => { const cur = save.bookScores[String(u)]; const got = h('input', { type: 'number', min: 0, class: 'num', 'aria-label': `Unit ${u} score`, value: cur?.got ?? '' }) as HTMLInputElement; const tot = h('input', { type: 'number', min: 1, class: 'num', 'aria-label': `Unit ${u} total`, value: cur?.total ?? '' }) as HTMLInputElement; return h('div', { class: 'row' }, h('span', {}, `Unit ${u}:`), got, h('span', {}, '/'), tot, btn('Save', () => { if (got.value && tot.value) { save.bookScores[String(u)] = { got: +got.value, total: +tot.value, date: today }; commit(); render(); } }, 'small')); })),
      h('div', { class: 'row' }, btn('Settings, export and import', () => go('settings'))));
  } else {
    settings(main);
  }
}

function settings(main: HTMLElement) {
  const save = getSave();
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const area = h('textarea', { class: 'paste', rows: 4, 'aria-label': 'Paste save code or JSON', placeholder: 'Paste exported JSON or code here' }) as HTMLTextAreaElement;
  const out = h('div', { class: 'small', role: 'status' });
  main.append(h('h1', {}, 'Settings'),
    h('div', { class: 'card' }, h('strong', {}, 'Scheduled days (5 per week)'), h('div', { class: 'row' }, ...names.map((n, i) => h('button', { class: 'btn small day' + (save.settings.days.includes(i) ? ' active' : ''), type: 'button', 'aria-pressed': String(save.settings.days.includes(i)), onclick: () => { const s = new Set(save.settings.days); s.has(i) ? s.delete(i) : s.add(i); if (s.size) save.settings.days = [...s].sort(); commit(); render(); } }, n))), h('p', { class: 'small' }, 'Streaks count only these days; missing a weekend does not break a streak.')),
    h('div', { class: 'card' }, h('strong', {}, 'Theme'), h('div', { class: 'row' }, ...(['auto', 'light', 'dark'] as const).map((t) => btn(t, () => { save.settings.theme = t; commit(); render(); }, 'small' + (save.settings.theme === t ? ' active' : ''))))),
    h('div', { class: 'card' }, h('strong', {}, 'Book'), btn(save.settings.bookFree ? 'Book-free mode: ON (summaries stand alone)' : 'Book-free mode: OFF (show book page references)', () => { save.settings.bookFree = !save.settings.bookFree; commit(); render(); })),
    h('div', { class: 'card' }, h('strong', {}, 'Exam / locally enforced edition notes'), h('p', {}, 'Exam / locally enforced edition notes — coming once confirmed.')),
    h('div', { class: 'card' }, h('strong', {}, 'Save: export / import'),
      h('div', { class: 'row' }, btn('Download JSON file', () => { const a = h('a', { href: URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })), download: `motor-controls-save-${dayKey()}.json` }); document.body.append(a); a.click(); a.remove(); }, 'small'),
        btn('Show copy code', () => { area.value = exportCode(); out.textContent = 'Copy this code to another device.'; }, 'small')),
      area, h('div', { class: 'row' }, btn('Import pasted save', () => { try { replaceSave(importText(area.value)); out.textContent = 'Imported.'; render(); } catch (e) { out.textContent = (e as Error).message; } }, 'small'), btn('Reset everything', () => { if (confirm('Erase all progress?')) { replaceSave(defaults()); render(); } }, 'small')), out),
    h('p', { class: 'small' }, `Content: ${manifest.acts[0].title}. Review gate: ${SHOW_UNREVIEWED ? 'SHOW_UNREVIEWED is ON (play-test)' : 'approved items only'}.`),
    btn('Back', () => go(getSave().session ? 'day' : 'progress')));
}

render();
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});

window.addEventListener('hashchange', () => render());
