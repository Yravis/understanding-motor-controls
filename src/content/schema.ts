// Content schema (zod). Every item shares the §5 envelope; `body` is validated per type.
import { z } from 'zod';

export const ID_RE = /^ch01\.u[1-3]\.s\d+-\d+\.(card|symbol|question|device|scenario|fault|value|formula|activity)\.[a-z0-9-]+$/;

const book = z.object({
  chapter: z.number().int(), unit: z.number().int(), section: z.string(), page: z.number().int(),
  pageStatus: z.literal('toc-unverified').or(z.literal('verified')), figure: z.string().nullable(),
});
const necRef = z.object({ edition: z.literal(2026), ref: z.string(), kind: z.enum(['rule', 'table', 'definition']), editionCheck: z.string() });
const stdRef = z.object({ std: z.string(), clause: z.string().nullable(), note: z.string().optional() });
// An excerpt points at source text the reviewer can actually open: a URL, a photo in review/source-photos/, or typed text.
// `covers` lists the source keys (see sourceKeys in scripts/lib/ledger.ts) this excerpt satisfies.
const excerpt = z.object({ ref: z.string(), covers: z.array(z.string()).min(1), text: z.string().nullable().optional(), url: z.string().nullable().optional(), photo: z.string().nullable().optional(), summary: z.string().optional() })
  .refine((e) => !!(e.url || e.photo || e.text), 'excerpt needs url, photo or text');

const answer = z.object({ text: z.string().min(1), correct: z.boolean().optional(), distractorWhy: z.string().optional() });
export const questionBody = z.object({
  format: z.enum(['mcq', 'multi-select', 'identify-symbol', 'tap-schematic', 'order-steps', 'predict-state']),
  day: z.number().int().min(1).max(10),
  stem: z.string().min(8),
  answers: z.array(answer).optional(),
  steps: z.array(z.string()).optional(),            // order-steps: correct order
  tapTargets: z.array(z.string()).optional(),       // tap-schematic: correct element ids (reference bucket)
  tapWhy: z.string().optional(),
  symbol: z.string().optional(),                    // identify-symbol: symbol key shown
  scene: z.object({                                 // predict-state: machine-verified against the model
    actions: z.array(z.object({ do: z.enum(['press', 'release', 'toggle', 'advance', 'supply', 'mode']), dev: z.string().optional(), arg: z.union([z.number(), z.string(), z.boolean()]).optional() })),
    expect: z.object({ lit: z.record(z.string(), z.boolean()).optional(), coil: z.record(z.string(), z.boolean()).optional() }),
  }).optional(),
  explanation: z.string().min(10),
  dependsOn: z.array(z.string()).default([]),       // device params the answer relies on (must not be typical/illustrative)
}).superRefine((b, ctx) => {
  const bad = (m: string) => ctx.addIssue({ code: 'custom', message: m });
  if (['mcq', 'identify-symbol', 'predict-state'].includes(b.format)) {
    if (!b.answers || b.answers.length < 3 || b.answers.length > 5) bad('mcq needs 3-5 answers');
    else {
      if (!b.answers[0].correct) bad('correct answer must be first with correct: true');
      if (b.answers.filter((a) => a.correct).length !== 1) bad('exactly one correct answer');
      b.answers.forEach((a, i) => { if (i > 0 && !a.distractorWhy) bad(`answer ${i} needs distractorWhy`); });
    }
  }
  if (b.format === 'multi-select') {
    if (!b.answers || b.answers.length < 4) bad('multi-select needs >=4 answers');
    else {
      const k = b.answers.filter((a) => a.correct).length;
      if (k < 2 || k >= b.answers.length) bad('multi-select needs 2+ correct and at least one wrong');
      b.answers.slice(0, k).forEach((a) => { if (!a.correct) bad('correct answers must come first'); });
      b.answers.forEach((a) => { if (!a.correct && !a.distractorWhy) bad('wrong answers need distractorWhy'); });
    }
  }
  if (b.format === 'order-steps' && (!b.steps || b.steps.length < 3)) bad('order-steps needs >=3 steps');
  if (b.format === 'tap-schematic' && (!b.tapTargets || !b.tapTargets.length)) bad('tap-schematic needs tapTargets');
  if (b.format === 'identify-symbol' && !b.symbol) bad('identify-symbol needs symbol');
  if (b.format === 'predict-state' && !b.scene) bad('predict-state needs a scene');
});

const cardBody = z.object({
  title: z.string().min(3),
  text: z.string().min(40),
  fieldNote: z.string().min(10),                    // "why it matters in the field"
  terms: z.array(z.string()).default([]),
  day: z.number().int().min(1).max(10),
  loto: z.boolean().optional(),
  symbol: z.object({ key: z.string(), designation: z.string(), nemaNote: z.string(), iecNote: z.string() }).optional(),
});

const envelope = z.object({
  id: z.string().regex(ID_RE, 'id must look like ch01.u{n}.s{x-y}.{type}.{slug}'),
  type: z.enum(['lessonCard', 'question', 'deviceSpec', 'value', 'formula', 'scenario', 'fault']),
  version: z.number().int().min(1),
  book,
  nec: z.array(necRef), nema: z.array(stdRef), ieee: z.array(stdRef), excerpts: z.array(excerpt),
  basis: z.enum(['datasheet', 'standard', 'book', 'typical', 'illustrative', 'general-knowledge']),
  enforcedNote: z.null(),
  other: z.array(z.object({ src: z.string(), page: z.number().optional() })),
  bookAlignment: z.literal('provisional').or(z.literal('aligned')),
  claim: z.string().min(15),
  reviewerNotes: z.string().optional(),
  userSignoff: z.literal('approved').optional(),       // LOTO approach approved by the user 2026-11-26
  userSignoffDate: z.string().optional(),
  body: z.any(),
});

export const itemSchema = envelope.superRefine((it, ctx) => {
  const bad = (m: string) => ctx.addIssue({ code: 'custom', message: m });
  const parse = (s: z.ZodTypeAny) => { const r = s.safeParse(it.body); if (!r.success) r.error.issues.forEach((i) => bad(`body.${i.path.join('.')}: ${i.message}`)); };
  if (it.type === 'question') parse(questionBody);
  if (it.type === 'lessonCard') parse(cardBody);
  if (it.type === 'deviceSpec') parse(z.object({ tag: z.string(), kind: z.string(), title: z.string(), params: z.record(z.string(), z.object({ qty: z.number(), unit: z.string(), tol: z.string() })).optional() }).passthrough());
  if (it.type === 'scenario') parse(z.object({ title: z.string(), day: z.number().int(), steps: z.array(z.string()).min(1), bucket: z.string().optional() }).passthrough());
  if (it.type === 'fault') parse(z.object({ engineId: z.string(), title: z.string(), cause: z.string(), symptom: z.string(), fixActions: z.array(z.object({ kind: z.string(), target: z.string(), note: z.string() })), day: z.number().int() }).passthrough());
  if (it.nec.length && it.excerpts.length === 0 && !it.reviewerNotes?.includes('needs user photo of NEC 2026 page')) bad('NEC refs without an excerpt need the note "needs user photo of NEC 2026 page" in reviewerNotes');
});
export type ItemInput = z.infer<typeof envelope>;
