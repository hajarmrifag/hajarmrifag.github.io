"""Check the static site's local navigation and assets without external packages."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = []
        self.refs = []
        self.h1s = 0
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'h1':
            self.h1s += 1
        for key in ('href', 'src'):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if tag == 'img' and 'alt' not in attrs:
            errors.append(f'{self.path.name}: image without alt text')


errors = []
pages = {path.resolve(): Page(path) for path in ROOT.rglob('*.html') if '.git' not in path.parts}
references = 0
for path, page in pages.items():
    if page.h1s != 1:
        errors.append(f'{path.name}: expected one h1, got {page.h1s}')
    for identifier, count in Counter(page.ids).items():
        if count > 1:
            errors.append(f'{path.name}: duplicate id {identifier}')
    for ref in page.refs:
        parts = urlsplit(ref)
        if parts.scheme or parts.netloc:
            continue
        references += 1
        if parts.path.startswith('/'):
            target = ROOT / unquote(parts.path).lstrip('/')
        elif parts.path:
            target = path.parent / unquote(parts.path)
        else:
            target = path
        target = target.resolve()
        if target.is_dir():
            target /= 'index.html'
        if not target.is_relative_to(ROOT):
            errors.append(f'{path.name}: link leaves site root: {ref}')
        elif not target.is_file():
            errors.append(f'{path.name}: missing local file: {ref}')
        elif parts.fragment and target in pages and unquote(parts.fragment) not in pages[target].ids:
            errors.append(f'{path.name}: missing anchor: {ref}')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'Checked {len(pages)} pages and {references} local references: all valid.')
