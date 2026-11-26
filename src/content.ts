// Runtime access to compiled content, passed through the build gate.
import data from 'virtual:content';
import { gate } from './gate';
import { SHOW_UNREVIEWED } from './config';
import { paramsFromItems } from './model/params';

export interface GItem { item: any; badge: string | null }
const gated = gate(data.items, data.ledger, data.hashes, SHOW_UNREVIEWED);
export const manifest = data.manifest;
export const badgeOf = new Map(gated.map((g) => [g.item.id, g.badge]));
export const items: any[] = gated.map((g) => g.item);
export const ofType = (t: string) => items.filter((i) => i.type === t);
export const cardsForDay = (d: number) => ofType('lessonCard').filter((c) => c.body.day === d);
export const questionsForDay = (d: number) => ofType('question').filter((q) => q.body.day === d);
export const byId = (id: string) => items.find((i) => i.id === id);
export const faults = () => ofType('fault');
export const params = paramsFromItems(data.items); // device parameters always come from the full content
export const dayInfo = (d: number) => manifest.days.find((x: any) => x.day === d);
