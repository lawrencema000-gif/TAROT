"""Static scan for hardcoded English UI strings missing t() wrapping.
Run from repo root: python .audit/scan-hardcoded-strings.py
"""
import re, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

string_lit = re.compile(r"""(['"])((?:[A-Z][a-z]+)(?:\s+[A-Za-z]+){1,6})\1""")
t_call = re.compile(r"""\bt\s*\(\s*['\"][\w\.]+['\"]""")

skip_strings = {
    'Card Back', 'Google Play', 'Open Graph', 'Terms of Service', 'Privacy Policy',
    'Remember Me', 'Forgot Password', 'Sign In', 'Sign Up', 'Sign Out',
    'Dark Mode', 'Light Mode', 'System Default',
}
skip_line_patterns = [
    re.compile(r"(console\.|throw |Sentry\.|captureException|logger\.)"),
    re.compile(r"""(aria-label|alt=|placeholder|role=|className=|data-|key=)\s*[:=]?\s*['\"]"""),
    re.compile(r"import |require\("),
    re.compile(r"// eslint|/\* eslint"),
    re.compile(r"\[`|JSON\.stringify|new Error\("),
    re.compile(r"classList\.(add|remove)|setAttribute\("),
]

roots = ['src/components', 'src/pages', 'src/context', 'src/services', 'src/hooks']
findings = []
SEP = os.sep
for root in roots:
    for dp, _, files in os.walk(root):
        for fn in files:
            if not fn.endswith(('.tsx', '.ts')):
                continue
            path = os.path.join(dp, fn).replace(SEP, '/')
            with open(path, 'r', encoding='utf-8') as f:
                src = f.read()
            for m in string_lit.finditer(src):
                s = m.group(2)
                if s in skip_strings:
                    continue
                if len(s) < 6 or len(s) > 80:
                    continue
                lstart = src.rfind('\n', 0, m.start()) + 1
                lend = src.find('\n', m.end())
                line = src[lstart:lend]
                if t_call.search(line):
                    continue
                if any(p.search(line) for p in skip_line_patterns):
                    continue
                if re.search(r"\b(type|interface|enum)\s+\w+", line[:60]):
                    continue
                if ' ' not in s:
                    continue
                ln = src.count('\n', 0, m.start()) + 1
                findings.append((path, ln, s))

from collections import defaultdict
by_file = defaultdict(list)
for p, ln, s in findings:
    by_file[p].append((ln, s))

sort_order = sorted(by_file.keys(), key=lambda p: -len(by_file[p]))
total = 0
for path in sort_order[:25]:
    rows = by_file[path]
    seen = set(); uniq = []
    for ln, s in rows:
        if s in seen:
            continue
        seen.add(s); uniq.append((ln, s))
    total += len(uniq)
    print(f'\n=== {path} ({len(uniq)} unique) ===')
    for ln, s in uniq[:15]:
        print(f'  L{ln}: {s!r}')
print(f'\nTOTAL suspicious strings across top {len(sort_order[:25])} files: {total}')
print(f'FILES with findings: {len(by_file)}')
