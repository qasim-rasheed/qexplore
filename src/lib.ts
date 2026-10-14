import type { Route, Surah } from './types';

const requests = new Map<string, Promise<unknown>>();
export function getData<T>(path: string): Promise<T> {
  if (!requests.has(path)) {
    const request = fetch(path).then(async (response) => {
      if (!response.ok) throw new Error('The local text could not be loaded. Please try again.');
      return response.json();
    }).catch((error) => { requests.delete(path); throw error; });
    requests.set(path, request);
  }
  return requests.get(path) as Promise<T>;
}

export function westernDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  });
}

export function normalise(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/[يى]/g, 'ی').replace(/ۃ/g, 'ة').replace(/[^a-z0-9\u0621-\u064a\u066e-\u06d3]/g, '');
}

export function parseReference(query: string, surahs: Surah[]): Route {
  const input = westernDigits(query.trim());
  const numbers = input.match(/^(\d+)\s*[:：]\s*(\d+)$/);
  if (numbers) return validateRoute({ s: Number(numbers[1]), v: Number(numbers[2]), w: 0 }, surahs);
  const named = input.match(/^(.*?)\s+(\d+)$/);
  const search = normalise(named ? named[1] : input);
  const chapter = surahs.find((surah) => [surah.name, surah.urdu, surah.name.replace(/^(Al|An|As|Ar|At|Ash|Adh|Az)-/i, '')]
    .some((name) => normalise(name) === search));
  if (!chapter) throw new Error('Enter a reference such as 7:179, or a surah name such as Al-A’raf 179.');
  return validateRoute({ s: chapter.id, v: named ? Number(named[2]) : 1, w: 0 }, surahs);
}

export function validateRoute(route: Route, surahs: Surah[]): Route {
  const surah = surahs.find((item) => item.id === route.s);
  if (!surah) throw new Error('Choose a surah from 1 to 114.');
  if (!Number.isInteger(route.v) || route.v < 1 || route.v > surah.count)
    throw new Error(`${surah.name} has ${surah.count} ayahs. Enter a number from 1 to ${surah.count}.`);
  return route;
}

export function readRoute(): Route {
  const match = westernDigits(window.location.hash.slice(1)).match(/^(\d+):(\d+)(?::(\d+))?$/);
  return match ? { s: +match[1], v: +match[2], w: +(match[3] || 0) } : { s: 7, v: 179, w: 0 };
}

export function readStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

export function writeStorage(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export const posLabels: Record<string, string> = {
  N: 'Noun', V: 'Verb', PN: 'Proper noun', ADJ: 'Adjective', PRON: 'Pronoun', P: 'Preposition',
  DET: 'Article', CONJ: 'Conjunction', NEG: 'Negation', DEM: 'Demonstrative', REL: 'Relative pronoun',
  T: 'Time adverb', LOC: 'Place adverb', INTG: 'Question particle', EMPH: 'Emphasis',
  ACC: 'Accusative particle', CERT: 'Certainty particle', RES: 'Restriction', COND: 'Conditional',
  IMPV: 'Imperative particle', VOC: 'Vocative particle', ATT: 'Attention particle',
  SUB: 'Subordinating conjunction', RSLT: 'Result particle', EXP: 'Exceptive particle',
  PREV: 'Preventive particle', ANS: 'Answer particle', INL: 'Initial letters', NV: 'Verbal noun',
  ACT_PCPL: 'Active participle', PASS_PCPL: 'Passive participle', VN: 'Verbal noun',
  DIST: 'Distance particle', ADDR: 'Address particle', REM: 'Resumption', EQ: 'Equalisation',
  CIRC: 'Circumstantial particle', PRO: 'Prohibition', SUP: 'Supplemental particle', AMD: 'Amendment',
  EXL: 'Explanation particle', CAUS: 'Cause particle', FUT: 'Future particle', PRP: 'Purpose particle',
  RET: 'Retraction', EXH: 'Exhortation', INT: 'Interpretation particle', COM: 'Accompanying particle',
  INC: 'Inception', SUR: 'Surprise particle', AVR: 'Aversion particle',
};

export function posLabel(tag: string): string { return posLabels[tag] || 'Particle'; }
