"""Check the complete corpus and every root occurrence, rather than just sample verses."""
import collections
import hashlib
import importlib.util
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'


def load(path):
    return json.loads(path.read_text())


surahs = load(DATA / 'surahs.json')
index = load(DATA / 'root-index.json')
metadata = load(DATA / 'metadata.json')
assert len(surahs) == 114
assert sum(s['count'] for s in surahs) == 6236
assert [s['id'] for s in surahs] == list(range(1, 115))
chapters = {}
occurrences = collections.Counter()
words_count = 0
for surah in surahs:
    chapter = load(DATA / 'chapters' / f"{surah['id']}.json")
    chapters[surah['id']] = chapter
    assert len(chapter) == surah['count']
    for verse in chapter:
        assert verse
        for word in verse:
            assert word['a'] and word['u'] and word['s']
            assert set(word) == {'a', 'u', 'r', 'l', 'p', 's'}
            assert word['r'] == list(dict.fromkeys(seg['r'] for seg in word['s'] if seg['r']))
            for root in word['r']:
                assert root in index
                occurrences[root] += 1
            words_count += 1
assert words_count == 77429 == metadata['words']
assert len(index) == 1651 == metadata['roots']
for root, spec in index.items():
    detail = load(DATA / 'roots' / f"{spec['id']}.json")
    assert detail['root'] == root
    assert len(detail['uses']) == spec['count'] == occurrences[root]
    assert detail['forms']
    for use in detail['uses']:
        word = chapters[use['s']][use['v'] - 1][use['w'] - 1]
        assert root in word['r'] and word['a'] == use['a'] and word['u'] == use['u']
    for form in detail['forms']:
        s, v = map(int, form['ref'].split(':'))
        word = chapters[s][v - 1][form['w'] - 1]
        assert root in word['r'], f"Incorrect root citation: {root} {form['ref']} {form['a']}"
        assert form['a'] and form['u']
        assert form['kind'] in ('lexical', 'occurrence')
        if form['kind'] == 'occurrence':
            assert form['u'] == word['u'] and form['reviewed'] is False
assert len(chapters[7][178]) == 30
assert chapters[7][178][8]['r'] == ['قلب']
assert chapters[7][178][8]['u'] == 'دل ہیں'
assert chapters[7][178][8]['p'] == 'N'
assert chapters[7][178][10]['p'] == 'V'
assert chapters[7][178][9]['r'] == []
# Root definitions are a separate editorial dataset, never verse-word glosses.
dictionary = load(DATA / 'root-definitions.json')
definitions = dictionary['roots']
assert definitions.keys() == index.keys()
citations = load(ROOT / 'data' / 'root-dictionary-citations.json')
urdu = dict(line.split('\t') for line in (ROOT / 'data' / 'root-meanings-ur.tsv').read_text().splitlines()
            if line and not line.startswith('#'))
assert urdu.keys() == definitions.keys() == citations.keys()
for root, definition in definitions.items():
    assert definition['status'] in ('rendered', 'uncertain')
    assert definition['source'] == citations[root]['source']
    assert definition['source'] in dictionary['sources']
    assert [entry['id'] for entry in definition['entries']] == citations[root]['entries']
    assert all(entry['headword'] and entry['dictionaryRoot'] and entry['excerpt']
               for entry in definition['entries'])
    if definition['status'] == 'rendered':
        assert definition['u'] == urdu[root]
    else:
        assert definition['u'] is None and definition['note']
assert {r for r, d in definitions.items() if d['status'] == 'uncertain'} == {'كين', 'همن'}
assert 'پلٹنا' in definitions['قلب']['u'] and 'دل' in definitions['قلب']['u']
assert 'لکھنا' in definitions['كتب']['u']
assert 'بھولنا' not in definitions['نسو']['u'] and 'عورتیں' in definitions['نسو']['u']
assert definitions['زلزل']['entries'][0]['id'] == 'n17946'
assert definitions['نون']['entries'][0]['id'] == '4798'
assert definitions['هدهد']['entries'][1]['id'] == 'n40970'
dictionary_cache = ROOT / '.cache' / 'dictionaries'
dictionary_lock = load(ROOT / 'scripts' / 'dictionary-sources-lock.json')
if all((dictionary_cache / name.replace('.zip', '.sqlite')).exists() and
       (dictionary_cache / name).exists() for name in dictionary_lock):
    for name, spec in dictionary_lock.items():
        assert hashlib.sha256((dictionary_cache / name).read_bytes()).hexdigest() == spec['sha256']
    module_spec = importlib.util.spec_from_file_location('dictionary_builder', ROOT / 'scripts' / 'build-dictionary.py')
    builder = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(builder)
    databases = {}
    for name in dictionary_lock:
        db = sqlite3.connect(f'file:{dictionary_cache / name.replace(".zip", ".sqlite")}?mode=ro', uri=True)
        db.row_factory = sqlite3.Row
        databases[name] = db
    assert builder.compile_records(databases) == dictionary, 'Dictionary excerpts or citations differ from pinned entries.'
    print('Verified every root dictionary excerpt and entry ID against the pinned classical databases.')
# When the raw corpus cache exists, verify source checksums and every displayed token.
lock = load(ROOT / 'scripts' / 'sources-lock.json')
cache = ROOT / '.cache' / 'sources'
if all((cache / name).exists() for name in lock):
    for name, spec in lock.items():
        assert hashlib.sha256((cache / name).read_bytes()).hexdigest() == spec['sha256']
    source = load(cache / 'urdu.json')['data']
    for s, chapter in chapters.items():
        for v, words in enumerate(chapter, 1):
            assert [(word['a'], word['u']) for word in words] == [
                (word['arabic'], word['translation']) for word in source[str(s)][str(v)]
            ]
    print('Verified pinned checksums and all Arabic/Urdu tokens against the raw source.')
print(f'PASS: 114 surahs, 6,236 verses, {words_count:,} words, {len(index):,} roots; all citations and limits checked.')
