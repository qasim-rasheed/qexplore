import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Copy, GitBranch, Info, Leaf, LoaderCircle, Moon, Search, SlidersHorizontal,
  Sun, X } from 'lucide-react';
import { getData, normalise, parseReference, posLabel, readRoute, readStorage, validateRoute, westernDigits, writeStorage } from './lib';
import type { Metadata, RootData, RootIndex, Route, SavedWord, Surah, Word } from './types';

type Dialog = 'sources' | 'saved' | 'settings' | null;
type Boot = { surahs: Surah[]; roots: RootIndex; metadata: Metadata };
const format = new Intl.NumberFormat('en');

function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, [tabindex="0"]') || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [close]);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
      <div className="modal-heading"><div><span className="eyebrow">YOUR EXPLORER</span><h2 id="modal-title">{title}</h2></div>
        <button className="icon-button" aria-label="Close dialog" onClick={close}><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}

function SurahPicker({ surahs, selected, change }: { surahs: Surah[]; selected: number; change: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = surahs.find((item) => item.id === selected)!;
  const results = surahs.filter((surah) => normalise(`${surah.id} ${surah.name} ${surah.urdu}`).includes(normalise(westernDigits(query))));
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function click(event: MouseEvent) { if (!ref.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);
  function choose(id: number) { change(id); setOpen(false); setQuery(''); trigger.current?.focus(); }
  return <div className="surah-picker" ref={ref} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button type="button" className="select-trigger" ref={trigger} aria-label="Choose surah" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(!open)}><span><span className="select-number">{String(current.id).padStart(2, '0')}</span>{current.name}</span><ChevronDown size={16} /></button>
    {open && <div className="surah-menu" role="dialog" aria-label="Search surahs">
      <div className="surah-filter"><Search size={16} /><input ref={input} aria-label="Search surahs" placeholder="Name or number…" value={query}
        onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); choose(results[0].id); } }} /></div>
      <div className="surah-options">{results.map((surah) => <button type="button" key={surah.id} className={surah.id === selected ? 'chosen' : ''}
        onClick={() => choose(surah.id)}><span className="surah-option-id">{String(surah.id).padStart(2, '0')}</span>
        <span><strong>{surah.name}</strong><small>{surah.count} ayahs</small></span><span className="urdu" lang="ur" dir="rtl">{surah.urdu}</span></button>)}
        {!results.length && <p className="small muted">No surahs found. Try a name or number.</p>}</div>
    </div>}
  </div>;
}

function RootPanel({ word, position, count, rootIndex, navigateWord, navigate, saved, saveWord, close }: {
  word: Word; position: number; count: number; rootIndex: RootIndex; navigateWord: (w: number) => void;
  navigate: (s: number, v: number, w?: number) => void; saved: boolean; saveWord: () => void; close: () => void;
}) {
  const [root, setRoot] = useState(word.r[0] || '');
  const [data, setData] = useState<RootData | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'meanings' | 'uses'>('meanings');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1050px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1050px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [mobile]);
  useEffect(() => { setRoot(word.r[0] || ''); setTab('meanings'); setPage(0); }, [word]);
  useEffect(() => {
    let active = true;
    setData(null); setError(''); setPage(0);
    if (root && rootIndex[root]) getData<RootData>(`/data/roots/${rootIndex[root].id}.json`)
      .then((value) => { if (active) setData(value); }).catch(() => { if (active) setError('Root details could not be loaded.'); });
    return () => { active = false; };
  }, [root, rootIndex, retry]);
  function keyboard(event: React.KeyboardEvent) {
    if (mobile && event.key === 'Tab') {
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary') || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === 'ArrowLeft' && position < count) { event.preventDefault(); navigateWord(position + 1); }
    if (event.key === 'ArrowRight' && position > 1) { event.preventDefault(); navigateWord(position - 1); }
  }
  return <aside className="root-panel" ref={panel} role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile || undefined} aria-label="Word details" onKeyDown={keyboard}>
    <div className="detail-top"><span className="eyebrow"><GitBranch size={14} /> WORD EXPLORER</span>
      <button className="icon-button small-icon" aria-label="Close word details" onClick={close}><X size={17} /></button></div>
    <div className="selected-word"><span className="tiny muted">WORD {position} OF {count}</span>
      <div className="arabic" lang="ar" dir="rtl">{word.a}</div><p className="urdu" lang="ur" dir="rtl">{word.u}</p>
      <span className="pos-badge">{posLabel(word.p)}</span></div>
    <div className="word-stepper"><button disabled={position === 1} onClick={() => navigateWord(position - 1)}><ChevronLeft size={15} /> Previous word</button>
      <button disabled={position === count} onClick={() => navigateWord(position + 1)}>Next word <ChevronRight size={15} /></button></div>
    <div className="root-section"><div className="section-label"><span>ROOT LETTERS</span><span className="urdu" lang="ur">مادہ</span></div>
      {root ? <><div className="root-letters" dir="rtl" lang="ar">{Array.from(root).map((letter, i) => <span key={i}>{letter}</span>)}</div>
        {word.r.length > 1 && <div className="root-choices">{word.r.map((value) => <button className={root === value ? 'active' : ''} onClick={() => setRoot(value)} key={value}>{value}</button>)}</div>}
      </> : <div className="no-root"><span className="urdu" lang="ur" dir="rtl">اس لفظ کا مادہ درج نہیں ہے</span><p>This is a {posLabel(word.p).toLowerCase()}. The morphology source does not assign it a root.</p></div>}
      {word.l && <div className="lemma-row"><span>Dictionary form</span><span className="arabic" lang="ar" dir="rtl">{word.l}</span></div>}
    </div>
    {root && <div className="root-content"><div className="detail-tabs" role="tablist" aria-label="Root information">
      <button role="tab" aria-selected={tab === 'meanings'} onClick={() => setTab('meanings')}>Root family meanings</button>
      <button role="tab" aria-selected={tab === 'uses'} onClick={() => setTab('uses')}>Uses <span>{format.format(rootIndex[root]?.count || 0)}</span></button></div>
      {error ? <div className="inline-error"><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Try again</button></div>
        : !data ? <div className="detail-loading"><LoaderCircle className="spin" size={20} /><span>Loading root…</span></div>
        : tab === 'meanings' ? <><p className="detail-caption">Urdu meanings of words sharing this root.</p>
          <div className="root-forms">{data.forms.map((form, i) => <div className="root-form" key={i}>
            <div><span className="arabic" dir="rtl" lang="ar">{form.a}</span><button className="reference-link" title="Open the cited word" onClick={() => {
              const [s, v] = form.ref.split(':').map(Number); navigate(s, v, form.w);
            }}>{form.ref}<ArrowRight size={11} /></button></div>
            <p className="urdu" dir="rtl" lang="ur">{form.u}</p>
            {!form.reviewed && <span className="extraction-note">{form.kind === 'occurrence' ? 'Cited word gloss' : 'Extracted gloss · needs review'}</span>}
          </div>)}</div><p className="detail-footnote"><Info size={13} /> Root families can carry several meanings. These are source glosses, not a single definition of the root.</p></>
        : <><p className="detail-caption">{format.format(data.uses.length)} words with this root. Open any occurrence.</p>
          <div className="root-uses">{data.uses.slice(page * 6, page * 6 + 6).map((use) => <button key={`${use.s}:${use.v}:${use.w}`} onClick={() => navigate(use.s, use.v, use.w)}>
            <span className="use-ref">{use.s}:{use.v}<ArrowRight size={12} /></span><span><span className="arabic" lang="ar" dir="rtl">{use.a}</span><span className="urdu" lang="ur" dir="rtl">{use.u}</span></span></button>)}</div>
          <div className="use-pagination"><button className="icon-button" aria-label="Previous root uses" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            <span>{page * 6 + 1}–{Math.min(page * 6 + 6, data.uses.length)} of {format.format(data.uses.length)}</span>
            <button className="icon-button" aria-label="Next root uses" disabled={(page + 1) * 6 >= data.uses.length} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></>}
    </div>}
    {word.s.length > 1 && <details className="segments"><summary>Word structure <ChevronDown size={14} /></summary><div>{word.s.map((segment, i) => <p key={i}><span className="arabic" lang="ar" dir="rtl">{segment.a}</span><span>{posLabel(segment.p)}</span></p>)}</div></details>}
    <button className={`save-word ${saved ? 'is-saved' : ''}`} onClick={saveWord}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Word saved' : 'Save this word'}</button>
  </aside>;
}

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [bootError, setBootError] = useState('');
  const [bootRetry, setBootRetry] = useState(0);
  const [route, setRoute] = useState<Route>(readRoute);
  const [chapter, setChapter] = useState<Word[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [formSurah, setFormSurah] = useState(7);
  const [formAyah, setFormAyah] = useState('179');
  const [formError, setFormError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [savedTab, setSavedTab] = useState<'ayahs' | 'words'>('ayahs');
  const [savedVerses, setSavedVerses] = useState<string[]>(() => readStorage('qexplore-verses', []));
  const [savedWords, setSavedWords] = useState<SavedWord[]>(() => readStorage('qexplore-words', []));
  const [recent, setRecent] = useState<string[]>(() => readStorage('qexplore-recent', []));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readStorage('qexplore-theme', 'light'));
  const [fontSize, setFontSize] = useState<number>(() => readStorage('qexplore-font-size', 32));
  const [urduSize, setUrduSize] = useState<number>(() => readStorage('qexplore-urdu-size', 22));
  const [toast, setToast] = useState('');
  const [showVerse, setShowVerse] = useState(() => !window.matchMedia('(max-width: 680px)').matches);
  const referenceInput = useRef<HTMLInputElement>(null);
  const wordArea = useRef<HTMLDivElement>(null);
  const verseKey = `${route.s}:${route.v}`;

  useEffect(() => {
    let active = true;
    setBootError('');
    Promise.all([getData<Surah[]>('/data/surahs.json'), getData<RootIndex>('/data/root-index.json'), getData<Metadata>('/data/metadata.json')])
      .then(([surahs, roots, metadata]) => {
        if (!active) return;
        setBoot({ surahs, roots, metadata });
        try { validateRoute(readRoute(), surahs); } catch (error) {
          setRoute({ s: 7, v: 179, w: 0 }); setFormError((error as Error).message);
          history.replaceState(null, '', '#7:179');
        }
      }).catch(() => { if (active) setBootError('The local Quran data could not be loaded.'); });
    return () => { active = false; };
  }, [bootRetry]);
  useEffect(() => {
    function pop() {
      const next = readRoute();
      if (boot) { try { validateRoute(next, boot.surahs); } catch (error) { setFormError((error as Error).message); return; } }
      setRoute(next); setFormError('');
    }
    window.addEventListener('popstate', pop); window.addEventListener('hashchange', pop);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('hashchange', pop); };
  }, [boot]);
  useEffect(() => {
    if (!boot) return;
    let active = true;
    setLoading(true); setLoadError(''); setChapter(null);
    getData<Word[][]>(`/data/chapters/${route.s}.json`).then((value) => {
      if (active) { setChapter(value); setLoading(false); }
    }).catch(() => { if (active) { setLoadError('This surah could not be loaded. Please try again.'); setLoading(false); } });
    return () => { active = false; };
  }, [route.s, boot, retry]);
  useEffect(() => { setFormSurah(route.s); setFormAyah(String(route.v)); }, [route.s, route.v]);
  useEffect(() => {
    if (!chapter || !chapter[route.v - 1]) return;
    setRecent((previous) => {
      const next = [verseKey, ...previous.filter((item) => item !== verseKey)].slice(0, 5);
      writeStorage('qexplore-recent', next); return next;
    });
  }, [chapter, verseKey, route.v]);
  useEffect(() => { document.documentElement.dataset.theme = theme; writeStorage('qexplore-theme', theme); }, [theme]);
  useEffect(() => { writeStorage('qexplore-font-size', fontSize); writeStorage('qexplore-urdu-size', urduSize); }, [fontSize, urduSize]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if (dialog || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;
      if (event.key === '/') { event.preventDefault(); referenceInput.current?.focus(); }
      if (event.key === 'Escape' && route.w) selectWord(0);
    }
    document.addEventListener('keydown', shortcuts);
    return () => document.removeEventListener('keydown', shortcuts);
  });

  function navigate(s: number, v: number, w = 0) {
    if (!boot) return;
    try {
      const next = validateRoute({ s, v, w }, boot.surahs);
      const hash = `#${s}:${v}${w ? ':' + w : ''}`;
      if (window.location.hash !== hash) history.pushState(null, '', hash);
      setRoute(next); setFormError(''); setDialog(null);
    } catch (error) { setFormError((error as Error).message); }
  }
  function selectWord(w: number) {
    const next = { ...route, w };
    history.replaceState(null, '', `#${route.s}:${route.v}${w ? ':' + w : ''}`); setRoute(next);
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault(); if (!boot) return;
    try { const next = parseReference(search, boot.surahs); navigate(next.s, next.v); }
    catch (error) { setFormError((error as Error).message); }
  }
  function submitForm(event: FormEvent) {
    event.preventDefault();
    const input = westernDigits(formAyah.trim());
    if (!/^\d+$/.test(input)) { setFormError('Enter a whole ayah number.'); return; }
    navigate(formSurah, Number(input));
  }
  function stepAyah(direction: number) {
    if (!boot) return;
    const next = route.v + direction;
    const maximum = boot.surahs[route.s - 1].count;
    if (next < 1 && route.s > 1) navigate(route.s - 1, boot.surahs[route.s - 2].count);
    else if (next > maximum && route.s < 114) navigate(route.s + 1, 1);
    else navigate(route.s, next);
  }
  function saveVerse() {
    const next = savedVerses.includes(verseKey) ? savedVerses.filter((key) => key !== verseKey) : [...savedVerses, verseKey];
    setSavedVerses(next); const persisted = writeStorage('qexplore-verses', next);
    setToast(persisted ? next.includes(verseKey) ? 'Ayah saved to your collection' : 'Ayah removed from your collection' : 'Saved for this session. Browser storage is unavailable.');
  }
  function saveWord() {
    if (!word) return;
    const present = savedWords.some((item) => item.s === route.s && item.v === route.v && item.w === route.w);
    const next = present ? savedWords.filter((item) => !(item.s === route.s && item.v === route.v && item.w === route.w))
      : [...savedWords, { ...route, a: word.a, u: word.u, r: word.r }];
    setSavedWords(next); const persisted = writeStorage('qexplore-words', next);
    setToast(persisted ? present ? 'Word removed from your collection' : 'Word saved to your collection' : 'Saved for this session. Browser storage is unavailable.');
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setToast('Link copied — opens this ayah and selected word'); }
    catch { setToast('Copy the address from your browser to share this ayah.'); }
  }

  const surah = boot?.surahs.find((item) => item.id === route.s);
  const words = chapter?.[route.v - 1] || [];
  const word = words[route.w - 1];
  const selectedSurah = boot?.surahs.find((item) => item.id === formSurah);
  const isVerseSaved = savedVerses.includes(verseKey);
  const isWordSaved = savedWords.some((item) => item.s === route.s && item.v === route.v && item.w === route.w);
  const style = { '--arabic-size': `${fontSize}px`, '--urdu-size': `${urduSize}px` } as CSSProperties;
  const closeDialog = useCallback(() => setDialog(null), []);
  useEffect(() => {
    let active = true;
    function fitWords() {
      if (!active) return;
      wordArea.current?.querySelectorAll<HTMLElement>('.word-arabic').forEach((element) => {
        element.style.fontSize = '';
        const size = parseFloat(getComputedStyle(element).fontSize);
        if (element.scrollWidth > element.clientWidth && element.clientWidth > 0) {
          element.style.fontSize = `${size * element.clientWidth / element.scrollWidth * .97}px`;
        }
      });
    }
    fitWords(); document.fonts.ready.then(fitWords);
    const observer = new ResizeObserver(fitWords);
    if (wordArea.current) observer.observe(wordArea.current);
    window.addEventListener('resize', fitWords);
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', fitWords); };
  }, [chapter, route.v, fontSize]);

  if (!boot) return <div className="boot-screen"><div className="brand-mark"><BookOpen size={27} /></div><h1>Qexplore<span>.</span></h1>
    {bootError ? <><p role="alert">{bootError}</p><button className="primary-button" onClick={() => setBootRetry(bootRetry + 1)}>Try again</button></>
      : <><LoaderCircle className="spin" size={22} /><p>Preparing your reading space…</p></>}</div>;

  return <div className="app" style={style}>
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => navigate(7, 179)} aria-label="Qexplore home"><span className="brand-mark"><BookOpen size={22} strokeWidth={1.7} /></span><span>Qexplore<span className="brand-dot">.</span></span></button>
      <nav className="header-nav" aria-label="Main navigation"><button className={!dialog ? 'active' : ''} onClick={() => setDialog(null)}><BookOpen size={16} />Explore</button>
        <button className={dialog === 'saved' ? 'active' : ''} onClick={() => setDialog('saved')}><Bookmark size={16} />Saved{savedVerses.length + savedWords.length > 0 && <span className="count-pill">{savedVerses.length + savedWords.length}</span>}</button></nav>
      <div className="header-actions"><button className="source-button" onClick={() => setDialog('sources')}><CircleHelp size={17} /><span>About the data</span></button>
        <span className="header-divider" /><button className="icon-button" title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button></div>
    </div></header>

    <main className="page">
      <section className="intro"><div><div className="eyebrow intro-eyebrow"><span className="tiny-line" />A QUIET SPACE FOR UNDERSTANDING</div>
        <h1>Every word, <em>closer.</em></h1><p>Explore the Arabic. Discover the roots. Understand in your own way.</p></div>
        <div className="intro-note"><span className="note-symbol"><Leaf size={23} strokeWidth={1.3} /></span><p>Read at your own pace.<br /><strong>Let the words speak.</strong></p></div>
      </section>

      <div className="workspace">
        <aside className="finder"><div className="finder-heading"><Search size={18} /><h2>Find an ayah</h2></div>
          <form className="reference-form" onSubmit={submitSearch}><label htmlFor="reference">Jump to a reference</label><div className="reference-input"><input id="reference" ref={referenceInput} value={search}
            onChange={(event) => setSearch(event.target.value)} placeholder="7:179 or Al-A’raf 179" autoComplete="off" /><button type="submit" aria-label="Find reference"><ArrowRight size={18} /></button></div>
            <p className="field-hint">Surah:ayah, or a surah name <kbd>/</kbd></p></form>
          <div className="form-divider"><span>OR SELECT</span></div>
          <form onSubmit={submitForm} noValidate><label id="surah-label">Surah</label><SurahPicker surahs={boot.surahs} selected={formSurah} change={(id) => { setFormSurah(id); setFormAyah('1'); setFormError(''); }} />
            <div className="ayah-label"><label htmlFor="ayah">Ayah number</label><span>1–{selectedSurah?.count}</span></div>
            <input className="ayah-input" id="ayah" type="number" min="1" max={selectedSurah?.count} step="1" value={formAyah} onChange={(event) => setFormAyah(event.target.value)} />
            <p className="field-hint">{selectedSurah?.name} has {selectedSurah?.count} ayahs</p>
            <button className="primary-button explore-button" type="submit">Explore ayah <ArrowRight size={16} /></button></form>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="finder-bottom"><div className="section-label"><span>RECENTLY EXPLORED</span><span className="small muted">{recent.length}</span></div>
            {recent.length ? recent.map((key) => { const [s, v] = key.split(':').map(Number); const item = boot.surahs[s - 1];
              return item && <button key={key} className={`recent-item ${verseKey === key ? 'current' : ''}`} onClick={() => navigate(s, v)}>
                <span><BookOpen size={14} /><span>{item.name}<small>Ayah {v}</small></span></span><span className="recent-ref">{key}<ChevronRight size={13} /></span></button>;
            }) : <p className="small muted">Your recent ayahs will appear here.</p>}
          </div>
          <div className="language-note"><span className="urdu" lang="ur" dir="rtl">اردو</span><div><strong>Urdu word meanings</strong><span>Jameel Noori Nastaleeq</span></div><Check size={14} /></div>
        </aside>

        <section className="reading-space" aria-label="Ayah explorer">
          <div className="reading-header"><div className="surah-identity"><span className="surah-medallion">{String(route.s).padStart(2, '0')}</span><div><div className="eyebrow">SURAH {route.s} <span className="middle-dot">·</span> {surah?.count} AYAHS</div><h2>{surah?.name}<span className="urdu" lang="ur" dir="rtl">{surah?.urdu}</span></h2></div></div>
            <div className="reading-actions"><button className={`icon-button ${isVerseSaved ? 'saved-icon' : ''}`} title={isVerseSaved ? 'Unsave ayah' : 'Save ayah'} aria-label={isVerseSaved ? 'Unsave ayah' : 'Save ayah'} onClick={saveVerse}><Bookmark size={18} fill={isVerseSaved ? 'currentColor' : 'none'} /></button>
              <button className="icon-button" title="Copy link" aria-label="Copy link" onClick={copyLink}><Copy size={17} /></button>
              <button className="icon-button" title="Reading settings" aria-label="Reading settings" onClick={() => setDialog('settings')}><SlidersHorizontal size={18} /></button></div></div>

          <div className="ayah-navigation"><button className="icon-button" aria-label="Previous ayah" disabled={route.s === 1 && route.v === 1} onClick={() => stepAyah(-1)}><ChevronLeft size={19} /></button>
            <div className="ayah-tabs" aria-label="Nearby ayahs">{Array.from({ length: Math.min(5, surah?.count || 0) }, (_, i) => Math.max(1, Math.min(route.v - 2, (surah?.count || 1) - 4)) + i).map((v) =>
              <button key={v} aria-current={route.v === v ? 'page' : undefined} className={route.v === v ? 'active' : ''} onClick={() => navigate(route.s, v)}><span>AYAH</span> {v}</button>)}</div>
            <button className="icon-button" aria-label="Next ayah" disabled={route.s === 114 && route.v === 6} onClick={() => stepAyah(1)}><ChevronRight size={19} /></button></div>

          {loading ? <div className="verse-loading" role="status"><LoaderCircle className="spin" size={25} /><p>Loading {surah?.name}…</p></div>
            : loadError ? <div className="verse-loading"><p role="alert">{loadError}</p><button className="primary-button" onClick={() => setRetry(retry + 1)}>Try again</button></div>
            : <><div className="verse-card"><div className="verse-label"><span><span className="green-dot" />ARABIC TEXT</span><button aria-expanded={showVerse} onClick={() => setShowVerse(!showVerse)}>{showVerse ? 'Collapse' : 'Show text'}<ChevronDown size={13} className={!showVerse ? 'rotated' : ''} /></button></div>
              {showVerse && <p className="full-verse arabic" lang="ar" dir="rtl">{words.map((item, i) => <span key={i}>{item.a}{' '}</span>)}<span className="verse-end">۝{route.v.toLocaleString('ar')}</span></p>}
              <div className="verse-card-footer"><span>{verseKey}</span><span>{words.length} words <span className="middle-dot">·</span> Read right to left <ArrowLeft size={12} /></span></div></div>

              <div className="words-heading"><div><h3>Word by word</h3><p>Choose a word to explore its root and meanings.</p></div><span className="language-badge"><span className="urdu" lang="ur">اردو</span>URDU</span></div>
              <div className={`word-layout ${word ? 'with-details' : ''}`} ref={wordArea}>
                <div className="word-grid" dir="rtl" aria-label="Word by word Urdu meanings">{words.map((item, i) => <button key={`${verseKey}:${i}`} className={`word-card ${route.w === i + 1 ? 'selected' : ''}`}
                  onClick={() => selectWord(i + 1)} aria-label={`Word ${i + 1}: ${item.a} — ${item.u}`} aria-pressed={route.w === i + 1}>
                  <span className="word-number">{String(i + 1).padStart(2, '0')}</span><span className="word-arabic arabic" lang="ar">{item.a}</span><span className="word-urdu urdu" lang="ur">{item.u}</span>
                  <span className="word-root">{item.r.length ? <><GitBranch size={11} /><span className="arabic" lang="ar">{Array.from(item.r[0]).join(' · ')}</span></> : <span>{posLabel(item.p)}</span>}</span>
                </button>)}</div>
                {word && <button className="mobile-root-scrim" aria-label="Dismiss word details" onClick={() => selectWord(0)} />}
                {word ? <RootPanel word={word} position={route.w} count={words.length} rootIndex={boot.roots} navigateWord={selectWord} navigate={navigate}
                  saved={isWordSaved} saveWord={saveWord} close={() => selectWord(0)} />
                  : <aside className="discover-panel"><div className="discovery-illustration"><div className="discovery-letter arabic" lang="ar">ق</div><span /><div className="discovery-branches"><i /><i /><i /></div></div>
                    <span className="eyebrow">A CLOSER LOOK</span><h3>Start with a word.</h3><p>Trace its root, explore related meanings, and follow its uses across the text.</p><div className="discovery-divider" /><p className="urdu" lang="ur" dir="rtl">ہر لفظ کو خود سمجھیں</p><span className="discovery-caption">Your reading. Your understanding.</span>
                    <button className="subtle-button" onClick={() => selectWord(Math.max(1, words.findIndex((item) => item.r.length > 0) + 1))}>Explore a word <ArrowRight size={14} /></button></aside>}
              </div>
              <div className="reading-bottom"><button className="subtle-button" disabled={route.s === 1 && route.v === 1} onClick={() => stepAyah(-1)}><ArrowLeft size={15} />Previous ayah</button>
                <span>AYAH {route.v} OF {surah?.count}</span><button className="subtle-button" disabled={route.s === 114 && route.v === 6} onClick={() => stepAyah(1)}>Next ayah<ArrowRight size={15} /></button></div>
            </>}
        </section>
      </div>
      <footer className="page-footer"><span><span className="footer-mark"><BookOpen size={15} /></span>Made for thoughtful, independent reading.</span><div><span>114 surahs</span><span className="middle-dot">·</span><span>{format.format(boot.metadata.verses)} ayahs</span><button onClick={() => setDialog('sources')}>Sources & approach <ArrowRight size={12} /></button></div></footer>
    </main>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}

    {dialog === 'sources' && <Modal title="The words, and where they come from." close={closeDialog}>
      <p className="modal-intro">Qexplore is an independent language tool. It presents Arabic text, Urdu word glosses, and morphology so you can read and examine the language yourself.</p>
      <div className="approach-card"><Leaf size={23} /><div><h3>A space for your own understanding</h3><p>No tafsir, doctrinal commentary, generated interpretation, religious affiliation, or ideological conclusions are added.</p></div></div>
      <div className="source-list"><article><span>01</span><div><h3>Arabic text & Urdu word glosses</h3><p>Greentech Apps Foundation word-by-word corpus, preserved as provided, via the QuranicWords reference dataset. All {format.format(boot.metadata.words)} written words across 6,236 ayahs are available locally.</p><a href="https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/reference/word-by-word" target="_blank" rel="noreferrer">View the pinned word corpus <ArrowRight size={13} /></a></div></article>
        <article><span>02</span><div><h3>Roots, dictionary forms & grammar</h3><p>Quranic Arabic Corpus v0.4 (University of Leeds), through the corrected mustafa0x morphology fork. Particles, pronouns, proper names, and other words may have no assigned root.</p><a href="https://corpus.quran.com/" target="_blank" rel="noreferrer">Quranic Arabic Corpus <ArrowRight size={13} /></a></div></article>
        <article><span>03</span><div><h3>Root family meanings</h3><p>QuranicWords 1.0.0 Urdu lemma glosses, plus cited occurrence glosses where a lexical entry is unavailable. Extracted entries awaiting review are marked. These are attested meanings of related words, rather than an exhaustive dictionary definition of the root.</p><a href="https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/dataset" target="_blank" rel="noreferrer">View the lexical dataset <ArrowRight size={13} /></a></div></article>
        <article><span>04</span><div><h3>Typography & privacy</h3><p>Urdu uses locally bundled Jameel Noori Nastaleeq; Arabic uses Scheherazade New. Saved ayahs, words, and settings stay in this browser. No account, analytics, or AI service is used.</p></div></article></div>
      <p className="source-note"><Info size={16} /><span>Word glosses reflect their source’s translation choices. Arabic roots can have multiple senses, and a root’s meaning alone does not establish a word’s meaning in a sentence. Source attribution does not imply affiliation.</span></p>
    </Modal>}

    {dialog === 'saved' && <Modal title="Your collection." close={closeDialog}>
      <p className="modal-intro">A little space for the ayahs and words you want to return to. Saved in this browser.</p>
      <div className="collection-tabs"><button className={savedTab === 'ayahs' ? 'active' : ''} onClick={() => setSavedTab('ayahs')}>Ayahs <span>{savedVerses.length}</span></button><button className={savedTab === 'words' ? 'active' : ''} onClick={() => setSavedTab('words')}>Words <span>{savedWords.length}</span></button></div>
      {savedTab === 'ayahs' ? savedVerses.length ? <div className="collection-list">{savedVerses.map((key) => {
        const [s, v] = key.split(':').map(Number); return <div className="saved-item" key={key}><button onClick={() => navigate(s, v)}><span className="saved-ref">{key}</span><span><strong>{boot.surahs[s - 1]?.name}</strong><small>Ayah {v}</small></span><ArrowRight size={17} /></button>
          <button className="icon-button" aria-label={`Remove saved ayah ${key}`} onClick={() => { const next = savedVerses.filter((item) => item !== key); setSavedVerses(next); writeStorage('qexplore-verses', next); }}><X size={16} /></button></div>;
      })}</div> : <div className="empty-collection"><Bookmark size={30} strokeWidth={1.2} /><h3>A place to return to.</h3><p>Use the bookmark beside an ayah’s title to save it here.</p></div>
        : savedWords.length ? <div className="collection-list">{savedWords.map((item) => <div className="saved-item" key={`${item.s}:${item.v}:${item.w}`}>
          <button onClick={() => navigate(item.s, item.v, item.w)}><span className="saved-ref">{item.s}:{item.v}</span><span className="saved-word-text"><strong className="arabic" dir="rtl" lang="ar">{item.a}</strong><small className="urdu" dir="rtl" lang="ur">{item.u}</small></span><ArrowRight size={17} /></button>
          <button className="icon-button" aria-label={`Remove saved word ${item.s}:${item.v}:${item.w}`} onClick={() => { const next = savedWords.filter((value) => value !== item); setSavedWords(next); writeStorage('qexplore-words', next); }}><X size={16} /></button>
        </div>)}</div> : <div className="empty-collection"><GitBranch size={30} strokeWidth={1.2} /><h3>Keep a word close.</h3><p>Open any word, then select “Save this word.”</p></div>}
    </Modal>}

    {dialog === 'settings' && <Modal title="Make yourself comfortable." close={closeDialog}>
      <p className="modal-intro">Adjust the text to your reading pace. Your preferences are remembered on this device.</p>
      <div className="setting-row"><div><h3>Arabic text size</h3><span>{fontSize}px</span></div><input aria-label="Arabic text size" type="range" min="26" max="46" value={fontSize} onChange={(event) => setFontSize(+event.target.value)} /></div>
      <div className="setting-row"><div><h3>Urdu text size</h3><span>{urduSize}px</span></div><input aria-label="Urdu text size" type="range" min="20" max="30" value={urduSize} onChange={(event) => setUrduSize(+event.target.value)} /></div>
      <div className="font-preview"><span className="arabic" lang="ar" dir="rtl">قُلُوبٞ</span><span className="urdu" lang="ur" dir="rtl">دل ہیں</span><small>Scheherazade New · Jameel Noori Nastaleeq</small></div>
      <div className="theme-setting"><h3>Appearance</h3><div><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={16} />Paper</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={16} />Night</button></div></div>
      <button className="subtle-button reset-settings" onClick={() => { setFontSize(32); setUrduSize(22); setTheme('light'); }}>Reset reading preferences</button>
    </Modal>}
  </div>;
}
