# Qexplore

A responsive web app for examining Quranic Arabic word by word in Urdu. It includes all **114 surahs, 6,236 ayahs, 77,429 written words, and 1,651 root families**. No API keys, database, account, or external runtime data service is required.

## Use the app

Node.js 22.12+ or 24 is required. From the repository directory:

```bash
npm ci
npm run build
npm start
```

The web server listens on port **3000** on all interfaces. Set `PORT` to choose a different port. For development, use `npm run dev` (also port 3000).

The app opens at **Al-A'raf 7:179**. Search a reference (`7:179`, including Arabic or Urdu digits), or a surah name and ayah (`Al-A'raf 179`, `الاعراف 179`). The searchable surah selector accepts English and Urdu names and shows each surah's ayah limit. Invalid references leave the current ayah in place.

Select any word to open its Urdu gloss, root letters, general root meanings in Urdu, dictionary form, grammatical class, related word meanings, and other occurrences. The green **Root meaning in Urdu / لغوی معنی** card appears directly beneath the root letters and dictionary form. Expand **Dictionary source & original text** to examine citations and original excerpts. The next/previous word controls preserve your place. Root occurrences and lexical citations open the cited word directly; browser Back returns to your previous ayah and selection. On mobile the word explorer is a dismissible sheet. Long Arabic words automatically fit on one line. The full Arabic paragraph starts collapsed on phones, to put the word explorer closer to the search controls.

Bookmark ayahs or individual words in **Saved**. Adjust the Arabic/Urdu sizes and paper/night appearance in reading settings. These preferences and bookmarks are stored in your browser, with no analytics or cloud account.

## Approach and sources

The app adds **no tafsir, religious affiliation, doctrinal instruction, ideological commentary, or generated interpretation**. It is a language reference tool. Translation choices still belong to the sources; no translation or root gloss can honestly be described as entirely interpretation-free.

- Arabic and Urdu word glosses are preserved verbatim from the Greentech Apps Foundation word-by-word corpus, through the pinned QuranicWords reference dataset.
- Roots, lemmas, segment structure, and parts of speech use the Quranic Arabic Corpus v0.4, via the corrected mustafa0x fork.
- General root senses are an independent dictionary dataset, based on Lane’s Arabic-English Lexicon, with Maqayis al-Lugha and Lisan al-Arab filling gaps. Qexplore supplies concise, AI-assisted Urdu renderings of selected lexical senses, with verbatim source excerpts and entry IDs. These renderings are **not a published Urdu dictionary edition and have not received specialist review**. Of 1,651 roots, 1,649 have Urdu summaries; `كين` and `همن` explicitly show unresolved or differing analyses. Dictionary spelling/grouping differences are noted. No verse gloss is used as a substitute for a root definition.
- Root-family meanings are Urdu lemma glosses from QuranicWords 1.0.0. Cited occurrence glosses supply additional forms or gaps. Extracted entries awaiting review are marked. These show meanings of related words rather than claiming a single, exhaustive dictionary definition of a root.
- Every lexical citation is checked against the morphology. Two imported entries with mismatched root citations are excluded, recorded in `public/data/metadata.json`; original word glosses remain unchanged.
- Urdu is rendered in **Jameel Noori Nastaleeq**, bundled locally. Arabic uses Scheherazade New. See `NOTICE.md` for attribution and font terms.

For example, `قلب` has general senses including **پلٹنا، الٹنا؛ حالت بدلنا؛ دل، اندرونی جوہر**, separately from the selected word’s verse gloss **دل ہیں** in 7:179. Roots can have several dictionary senses; individual root letters do not have a fixed lexical meaning that determines every word.

The in-app **About the data** dialog provides sources and these distinctions. Historical dictionary excerpts retain their original wording and may mention historical usage or religious vocabulary. The app adds no conclusions about how an ayah should be interpreted. No upstream full-verse translations or tafsir datasets are imported.

## Verification

```bash
npm run test:data
npm test
npm run build
```

The data check covers every verse, word, root occurrence, citation, dictionary record, and chapter limit. With the raw source caches present, it also verifies source checksums, every displayed Arabic/Urdu verse token, and every dictionary excerpt against the pinned upstream databases. These checks verify provenance and data integrity; they are not a linguistic review of the editorial Urdu. Browser tests cover desktop and mobile Chromium, separate root/word meanings, dictionary citations and request recovery, unresolved root analyses, search, limits, all words in 7:179, root navigation, persistent bookmarks/settings, interrupted requests, boundary verses, local font loading, and long-word fitting.

Browser tests use `/usr/bin/chromium`. Set `CHROMIUM_PATH` if Chromium is elsewhere; install it using your OS package manager if needed. Tests are not required to run the application.

## Refresh the corpus

Generated data is committed under `public/data`; normal installation does not download or regenerate it. To reproduce it, run:

```bash
python3 scripts/build-data.py
npm run test:data
```

The generator uses only Python's standard library, immutable GitHub URLs, and required SHA-256 verification from `scripts/sources-lock.json`. The source cache is ignored. It aligns each word with morphology by position and checks all 6,236 verse lengths before writing data.

Reproduce the independent dictionary dataset separately:

```bash
python3 scripts/build-dictionary.py
npm run test:data
```

`data/root-meanings-ur.tsv` holds the editorial Urdu summaries; `data/root-dictionary-citations.json` identifies independent primary entries. `scripts/dictionary-sources-lock.json` pins both dictionary archives and checksums. The compiler exports only Lane entries and the classical Maqayis/Lisan tables, never the other dictionaries in the Arabic archive. It does not generate translations or interpret verses. Both generators require network access only when their ignored raw-source caches are absent; normal installation and Vercel builds use the committed output.

## Deploy

For Vercel, import `qasim-rasheed/qexplore` as a new project named **qexplore**. The included `vercel.json` selects Vite, installs from the frozen lockfile, validates the complete bundled corpus, and builds `dist/`. No environment variables or backend services are required. Set the project's production branch to `main` and disable Vercel Authentication for production so anybody can access it. The standard project address is `qexplore.vercel.app` if available; Vercel owns this domain and assigns it through the project settings. `qexplore.vercel.com` is not the standard project domain.

Deploy the generated `dist/` directory to any static web host, or run the included Node static server with `npm start`. Include the **entire directory**, including `data/` and `fonts/`. The app has no backend services or secrets. It uses URL fragments for verse/word links, so server rewrite rules are unnecessary. The Node server provides MIME types, gzip for JSON/text, conditional requests, and caching for hashed assets.

An active browser connection is required to reach your host; there is no service-worker offline cache. All reading data is bundled with the app and does not use third-party APIs at runtime.
