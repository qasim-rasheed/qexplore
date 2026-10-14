export type Surah = { id: number; name: string; urdu: string; count: number };
export type Segment = { a: string; l: string; r: string; p: string };
export type Word = { a: string; u: string; r: string[]; l: string; p: string; s: Segment[] };
export type RootIndex = Record<string, { id: number; count: number }>;
export type RootForm = { a: string; u: string; reviewed: boolean; kind: 'lexical' | 'occurrence'; ref: string; w: number };
export type RootUse = { s: number; v: number; w: number; a: string; u: string };
export type RootData = { root: string; forms: RootForm[]; uses: RootUse[] };
export type DictionaryEntry = { id: string; headword: string; dictionaryRoot: string; page: number | null; excerpt: string; truncated: boolean; glosses: string[] };
export type RootDefinition = { u: string | null; status: 'rendered' | 'uncertain'; source: string; entries: DictionaryEntry[]; note?: string };
export type RootDictionary = {
  sources: Record<string, { title: string; language: 'en' | 'ar'; url: string }>;
  roots: Record<string, RootDefinition>;
};
export type Route = { s: number; v: number; w: number };
export type SavedWord = Route & { a: string; u: string; r: string[] };
export type Metadata = { surahs: number; verses: number; words: number; roots: number };
