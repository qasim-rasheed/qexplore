"""Compile editorial Urdu root senses with independently cited dictionary excerpts.

No verse gloss is used to create a definition. Only the named classical tables
are accessed from the Arabic archive; other dictionaries are never exported.
"""
import hashlib
import json
import sqlite3
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'dictionaries'
DATA = ROOT / 'public' / 'data'
LOCK = json.loads((ROOT / 'scripts' / 'dictionary-sources-lock.json').read_text())
SOURCES = {
    'lane': {'title': "Lane’s Arabic-English Lexicon", 'language': 'en',
             'url': LOCK['lane.zip']['url'], 'archive': 'lane.zip'},
    'maqayis': {'title': 'Maqayis al-Lugha · Ibn Faris', 'language': 'ar',
                'url': LOCK['classical.zip']['url'], 'archive': 'classical.zip'},
    'lisan': {'title': 'Lisan al-Arab · Ibn Manzur', 'language': 'ar',
              'url': LOCK['classical.zip']['url'], 'archive': 'classical.zip'},
}


def load_databases():
    CACHE.mkdir(parents=True, exist_ok=True)
    databases = {}
    for name, spec in LOCK.items():
        archive = CACHE / name
        if not archive.exists():
            with urllib.request.urlopen(spec['url'], timeout=180) as response:
                archive.write_bytes(response.read())
        if hashlib.sha256(archive.read_bytes()).hexdigest() != spec['sha256']:
            raise ValueError(f'Dictionary source checksum mismatch: {name}')
        target = CACHE / name.replace('.zip', '.sqlite')
        # Extract the one database explicitly, never trust archive paths.
        with zipfile.ZipFile(archive) as bundle:
            members = [n for n in bundle.namelist() if n.endswith('.sqlite')]
            assert len(members) == 1, members
            with bundle.open(members[0]) as source, target.open('wb') as output:
                import shutil
                shutil.copyfileobj(source, output)
        db = sqlite3.connect(f'file:{target}?mode=ro', uri=True)
        db.row_factory = sqlite3.Row
        databases[name] = db
    return databases


def source_entry(databases, source, entry_id):
    if source == 'lane':
        row = databases['lane.zip'].execute(
            'select root, headword, word, nodeid, page, xml from entry where nodeid=?',
            (entry_id,)).fetchone()
        assert row is not None, entry_id
        node = ET.fromstring(row['xml'])
        text = ' '.join(' '.join(node.itertext()).split())
        glosses = [' '.join(' '.join(part.itertext()).split()) for part in node.iter('hi')
                   if part.get('rend') == 'ital']
        return {'id': entry_id, 'headword': row['headword'] or row['word'],
                'dictionaryRoot': row['root'], 'page': row['page'], 'text': text,
                'glosses': list(dict.fromkeys(glosses))[:24]}
    table = {'maqayis': 'maqayeesul_luga', 'lisan': 'lisanularab'}[source]
    row = databases['classical.zip'].execute(
        f'select id, word, meanings from {table} where id=?', (int(entry_id),)).fetchone()
    assert row is not None, (source, entry_id)
    return {'id': entry_id, 'headword': row['word'],
            'dictionaryRoot': row['word'], 'page': None, 'text': row['meanings'], 'glosses': []}


def compile_records(databases):
    index = json.loads((DATA / 'root-index.json').read_text())
    citations = json.loads((ROOT / 'data' / 'root-dictionary-citations.json').read_text())
    meanings = {}
    for line in (ROOT / 'data' / 'root-meanings-ur.tsv').read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        root, meaning = line.split('\t')
        assert root not in meanings and meaning.strip()
        meanings[root] = meaning
    assert index.keys() == meanings.keys() == citations.keys()
    records = {}
    for root, spec in citations.items():
        entries = [source_entry(databases, spec['source'], entry) for entry in spec['entries']]
        # A verbatim opening excerpt, not a fabricated translation/back-translation.
        # Citation IDs identify complete entries in the pinned database.
        for entry in entries:
            text = entry.pop('text')
            entry['excerpt'] = text[:1000]
            entry['truncated'] = len(text) > 1000
        status = spec.get('status', 'rendered')
        records[root] = {'u': meanings[root] if status == 'rendered' else None,
                         'status': status, 'source': spec['source'], 'entries': entries}
        if spec.get('note'):
            records[root]['note'] = spec['note']
    return {'sources': SOURCES, 'roots': records}


if __name__ == '__main__':
    output = compile_records(load_databases())
    (DATA / 'root-definitions.json').write_text(
        json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
    counts = {status: sum(r['status'] == status for r in output['roots'].values())
              for status in ('rendered', 'uncertain')}
    print(f'Compiled {len(output["roots"]):,} independent dictionary records: {counts}.')
