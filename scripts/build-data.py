"""Build the local corpus from immutable, checksum-verified upstream sources.

No verse translations, commentary, or generated interpretations are imported.
Run python3 scripts/build-data.py to refresh the committed JSON artifacts.
"""
import collections
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'sources'
OUT = ROOT / 'public' / 'data'


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')


def load_sources():
    CACHE.mkdir(parents=True, exist_ok=True)
    lock = json.loads((ROOT / 'scripts' / 'sources-lock.json').read_text())
    sources = {}
    for name, spec in lock.items():
        path = CACHE / name
        if not path.exists():
            print('Fetching', name)
            with urllib.request.urlopen(spec['url'], timeout=120) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != spec['sha256']:
                raise RuntimeError('Source checksum mismatch: ' + name)
            path.write_bytes(data)
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != spec['sha256']:
            raise RuntimeError('Cached source checksum mismatch: ' + name)
        sources[name] = data
    return sources


def norm(text):
    return re.sub(r'[\u064b-\u065f\u0670\u06d6-\u06edـ]', '', text).replace('ٱ', 'ا')


def main():
    sources = load_sources()
    ur = json.loads(sources['urdu.json'])['data']
    vocabulary = json.loads(sources['vocabulary.json'])
    names = json.loads(sources['surahs.js'].decode().split('export const SURAH_NAMES =', 1)[1].strip().rstrip(';'))
    morphology = collections.defaultdict(lambda: collections.defaultdict(list))
    for line in sources['morphology.txt'].decode().splitlines():
        loc, text, coarse, features = line.split('\t')
        s, v, w, _ = map(int, loc.split(':'))
        tags = features.split('|')
        values = dict(t.split(':', 1) for t in tags if ':' in t)
        # N/V are the coarse classes. For nouns the first feature may be ROOT,
        # and for verbs IMPF/PERF are tense features, not parts of speech.
        pos = 'V' if coarse == 'V' else (tags[0] if ':' not in tags[0] else coarse)
        if coarse == 'N' and 'ADJ' in tags:
            pos = 'ADJ'
        morphology[s, v][w].append({
            'a': text, 'l': values.get('LEM', ''), 'r': values.get('ROOT', ''),
            'p': pos, 'affix': 'PREF' in tags or 'SUFF' in tags,
        })
    surahs = []
    occurrences = collections.defaultdict(list)
    fallback = collections.defaultdict(dict)
    token_count = 0
    for s in range(1, 115):
        verses = ur[str(s)]
        assert sorted(map(int, verses)) == list(range(1, len(verses) + 1))
        surahs.append({'id': s, 'name': names['en'][s - 1], 'urdu': names['ur'][s - 1], 'count': len(verses)})
        chapter = []
        for v in range(1, len(verses) + 1):
            raw = verses[str(v)]
            morph = morphology[s, v]
            assert len(raw) == len(morph), f'Word count mismatch {s}:{v}'
            words = []
            for w, token in enumerate(raw, 1):
                segments = morph[w]
                stem = next((part for part in segments if part['r']), None)
                stem = stem or next((part for part in segments if not part['affix']), segments[0])
                roots = list(dict.fromkeys(part['r'] for part in segments if part['r']))
                record = {
                    'a': token['arabic'], 'u': token['translation'],
                    'r': roots, 'l': stem['l'], 'p': stem['p'],
                    's': [{k: seg[k] for k in ('a', 'l', 'r', 'p')} for seg in segments],
                }
                assert record['a'] and record['u'], f'Empty token {s}:{v}:{w}'
                words.append(record)
                token_count += 1
                for root in roots:
                    occurrences[root].append({'s': s, 'v': v, 'w': w, 'a': record['a'], 'u': record['u']})
                    lemma = stem['l'] or record['a']
                    # This is explicitly an occurrence gloss, not a dictionary definition.
                    candidate = {'a': lemma, 'u': record['u'], 'reviewed': False,
                                 'kind': 'occurrence', 'ref': f'{s}:{v}', 'w': w}
                    key = norm(lemma)
                    score = (sum(seg['affix'] for seg in segments), len(record['u']))
                    old = fallback[root].get(key)
                    if old is None or score < old[0]:
                        fallback[root][key] = (score, candidate)
            chapter.append(words)
        write(OUT / 'chapters' / f'{s}.json', chapter)
    lexicon = collections.defaultdict(list)
    rejected = []
    for entry in vocabulary:
        if not entry['root']:
            continue
        root = entry['root'].replace('-', '')
        sense = entry['senses']['ur'][0]
        s, v = map(int, sense['verse'].split(':'))
        cited_roots = {seg['r'] for seg in morphology[s, v][sense['word_index']] if seg['r']}
        if root not in cited_roots:
            rejected.append({'root': root, 'form': entry['arabic'], 'citation': sense['verse'],
                             'reason': 'Lexical citation disagrees with pinned morphology'})
            continue
        lexicon[root].append({
            'a': entry['arabic'], 'u': entry['meaning']['ur'],
            'reviewed': entry['meaning_reviewed']['ur'], 'kind': 'lexical',
            'ref': entry['senses']['ur'][0]['verse'], 'w': entry['senses']['ur'][0]['word_index'],
        })
    index = {}
    for i, root in enumerate(sorted(occurrences), 1):
        forms = lexicon[root]
        included = {norm(form['a']) for form in forms}
        forms.extend(value[1] for key, value in fallback[root].items() if key not in included)
        forms.sort(key=lambda form: (not form['reviewed'], form['kind'] != 'lexical'))
        index[root] = {'id': i, 'count': len(occurrences[root])}
        write(OUT / 'roots' / f'{i}.json', {'root': root, 'forms': forms, 'uses': occurrences[root]})
    write(OUT / 'surahs.json', surahs)
    write(OUT / 'root-index.json', index)
    write(OUT / 'metadata.json', {
        'surahs': len(surahs), 'verses': sum(s['count'] for s in surahs),
        'words': token_count, 'roots': len(index),
        'sources': json.loads((ROOT / 'scripts' / 'sources-lock.json').read_text()),
        'glossSource': 'Greentech Apps Foundation, via QuranicWords reference corpus',
        'morphologySource': 'Quranic Arabic Corpus v0.4, corrected mustafa0x fork',
        'lexiconSource': 'QuranicWords 1.0.0, source-derived Urdu lemma glosses',
        'excludedLexicalEntries': rejected,
    })
    assert len(surahs) == 114 and sum(s['count'] for s in surahs) == 6236
    print(f'Built {token_count:,} words, 6,236 verses, 114 surahs, {len(index):,} roots.')


if __name__ == '__main__':
    main()
