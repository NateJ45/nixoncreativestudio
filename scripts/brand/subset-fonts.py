"""Split each self-hosted webfont into a "core" file and an "ext" file.

Foundation, edit with care. Run by hand after a font changes (not part of the
build): needs Python 3 with fontTools and brotli (`pip install fonttools brotli`).

    python scripts/brand/subset-fonts.py

Why (2026-10-04 performance pass): the four Fontsource latin files carry about
224 characters each, but the site's English pages use the ASCII set plus a
handful of typographic marks. The browser picks font files by `unicode-range`,
so globals.css declares each face twice: the core file (preloaded, about 40%
smaller) covers the characters English copy uses, and the ext file covers the
rest of the latin subset (accented letters, rarer marks). A page only downloads
an ext file when its text contains one of those characters (a name with an
accent in a case study, say), so nothing ever falls back to Georgia.

Sources: scripts/brand/font-sources/*.woff2 (the untouched Fontsource latin
files). Output: src/assets/fonts/<name>-core.woff2 and <name>-ext.woff2.
If you change CORE below, change the unicode-range lines in globals.css
section 2 to match (the script prints them).
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'font-sources')
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'fonts'))

# What English copy on this site uses: printable ASCII, no-break space, (c), (R),
# degree, middle dot, multiplication sign, en and em dash, curly quotes and
# apostrophes, bullet, ellipsis, euro, trade mark, minus.
CORE = (
    'U+0020-007E,U+00A0,U+00A9,U+00AE,U+00B0,U+00B7,U+00D7,'
    'U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+20AC,U+2122,U+2212'
)
FEATURES = ['kern', 'liga', 'tnum', 'pnum', 'frac', 'numr', 'dnom', 'ccmp', 'locl', 'mark', 'mkmk', 'rvrn']


def parse(spec):
    out = set()
    for part in spec.split(','):
        a, _, b = part.strip()[2:].partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


def to_ranges(cps):
    cps = sorted(cps)
    out, start, prev = [], None, None
    for c in cps + [None]:
        if start is not None and c == prev + 1:
            prev = c
            continue
        if start is not None:
            out.append(f'U+{start:04X}' if start == prev else f'U+{start:04X}-{prev:04X}')
        start = prev = c
    return ', '.join(out)


core = parse(CORE)
for file in sorted(os.listdir(SRC)):
    if not file.endswith('.woff2'):
        continue
    name = file[: -len('.woff2')]
    path = os.path.join(SRC, file)
    cmap = set(TTFont(path).getBestCmap())
    for tag, cps in (('core', cmap & core), ('ext', cmap - core)):
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = FEATURES
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        opts.hinting = True
        font = TTFont(path)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=sorted(cps))
        sub.subset(font)
        dest = os.path.join(OUT, f'{name}-{tag}.woff2')
        font.flavor = 'woff2'
        font.save(dest)
        print(f'{name}-{tag}.woff2  {os.path.getsize(dest)} bytes  unicode-range: {to_ranges(cps)}')
