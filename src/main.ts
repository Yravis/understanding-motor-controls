import './style.css';
import { h, btn } from './ui/dom';
import { getSave, commit, exportJson, exportCode, importText, replaceSave, defaults } from './game/save';
import { dayKey, nextDay, rank, RANK_TITLE, streak, unitDays } from './game/progress';
import { runSession } from './ui/session';
import { mountBucket } from './ui/bucketpanel';
import { manifest, cardsForDay, dayInfo, badgeOf, faults } from './content';
import { SHOW_UNREVIEWED } from './config';

type Tab = 'home' | 'lesson' | 'practice' | 'bucket' | 'progress' | 'settings';
let tab: Tab = 'home';
const app = document.getElementById('app')!;

function theme() {
  const t = getSave().settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}
function go(t: Tab) { tab = t; render(); window.scrollTo(0, 0); }

function bar(): HTMLElement {
  const items: [Tab, string][] = [['home', 'Work order'], ['lesson', 'Lessons'], ['practice', 'Practice'], ['bucket', 'Bucket'], ['progress', 'Progress']];
  return h('nav', { class: 'bar', 'aria-label': 'Main' }, ...items.map(([t, l]) => h('button', { class: 'tab' + (tab === t ? ' on' : ''), type: 'button', onclick: () => go(t) }, l)));
}

function render() {
  theme();
  app.replaceChildren();
  const main = h('main', { class: 'main' });
  if (SHOW_UNREVIEWED) main.append(h('div', { class: 'testbanner' }, 'PLAY-TEST BUILD: content shows with UNREVIEWED badges until the reviewer approves it.'));
  main.append(h('div', { class: 'banner', id: 'loto-banner' }, 'LOTO steps pending your sign-off and PSC’s procedure.'));
  app.append(main, bar());
  const save = getSave();
  const today = dayKey();
  if (tab === 'home') {
    const d = nextDay(save), info = dayInfo(d);
    const done = Object.keys(save.completedDays).length;
    main.append(h('h1', {}, 'Understanding Motor Controls'), h('p', { class: 'small' }, `Act 1 · Chapter 1 · Bucket 1A · ${RANK_TITLE[rank(save)]} · streak ${streak(save.activity, save.settings.days, today)}`),
      h('div', { class: 'card' }, h('div', { class: 'small' }, 'Work order from the foreman'), h('h2', {}, `Day ${d}${save.completedDays[String(d)] ? ' (repeat)' : ''}`), h('p', {}, info?.focus ?? ''),
        h('p', { class: 'small' }, `${done}/10 days complete`), btn(`Start Day ${d}`, () => runSession(main, d, () => go('home')), 'primary')),
      h('div', { class: 'card' }, h('strong', {}, 'Replay a day'), h('div', { class: 'row' }, ...Array.from({ length: 10 }, (_, i) => i + 1).filter((n) => save.completedDays[String(n)] || n <= d).map((n) => btn(String(n), () => runSession(main, n, () => go('home')), 'small day')))),
      h('div', { class: 'card small' }, h('strong', {}, 'Exam / locally enforced edition notes'), h('p', {}, 'Exam / locally enforced edition notes — coming once confirmed.')));
  } else if (tab === 'lesson') {
    main.append(h('h1', {}, 'Lessons'));
    for (let d = 1; d <= 9; d++) if (save.completedDays[String(d)] || d <= nextDay(save)) main.append(h('details', { class: 'card' }, h('summary', {}, `Day ${d}: ${dayInfo(d)?.focus}`), ...cardsForDay(d).map((c) => h('div', { class: 'lib' }, badgeOf.get(c.id) ? h('span', { class: 'badge unrev' }, badgeOf.get(c.id)!) : null, h('h3', {}, c.body.title), h('p', {}, c.body.text), h('p', { class: 'field' }, c.body.fieldNote)))));
  } else if (tab === 'practice') {
    main.append(h('h1', {}, 'Practice'), h('p', {}, 'An optional extra rep: six mixed questions from the days you have reached.'), btn('Start extra rep', () => runSession(main, Math.max(1, nextDay(save)), () => go('practice'), true), 'primary'));
  } else if (tab === 'bucket') {
    mountBucket(main, { title: 'Bucket 1A: free bench', showLoto: true, troubleshoot: false });
  } else if (tab === 'progress') {
    main.append(h('h1', {}, 'Progress'), h('div', { class: 'card' }, h('p', {}, `Rank: ${RANK_TITLE[rank(save)]}`), h('p', {}, `XP: ${save.xp}`), h('p', {}, `Safety violations logged: ${save.safetyViolations}`),
      h('p', { class: 'small' }, 'Rank follows completed book units (and the Day 10 commissioning check), not XP alone.'), ...Object.entries(unitDays).map(([u, ds]) => h('p', {}, `Unit ${u}: ${ds.filter((d) => save.completedDays[String(d)]).length}/${ds.length} days`))),
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
        btn('Show copy code', () => { area.value = exportCode(); out.textContent = 'Copy this code to another phone.'; }, 'small')),
      area, h('div', { class: 'row' }, btn('Import pasted save', () => { try { replaceSave(importText(area.value)); out.textContent = 'Imported.'; render(); } catch (e) { out.textContent = (e as Error).message; } }, 'small'), btn('Reset everything', () => { if (confirm('Erase all progress?')) { replaceSave(defaults()); render(); } }, 'small')), out),
    h('p', { class: 'small' }, `Content: ${manifest.acts[0].title}. Review gate: ${SHOW_UNREVIEWED ? 'SHOW_UNREVIEWED is ON (play-test)' : 'approved items only'}.`),
    btn('Back', () => go('progress')));
}

render();
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
