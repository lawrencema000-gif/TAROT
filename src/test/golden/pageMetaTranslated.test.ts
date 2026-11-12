import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/*
 * polish 2026-11: the browser tab of nine pages — the glossary, crystal and
 * numerology hubs, the lunar mansions, auspicious dates, the wishing sky, the
 * spread library and each spread, and the sign-up — was titled and described
 * in English whatever the app's language, after seven others had been found
 * and fixed one at a time (src/pages/__tests__/pageMetaLanguage.test.tsx).
 * setPageMeta takes whatever text it is handed, and nothing in typecheck, lint
 * or the suite could see where that text came from.
 *
 * This gate reads every setPageMeta call in src/ and fails when its title or
 * description is English that does not go through t(): a string or template
 * literal with letters in it, a field of an object no localizer made (the
 * English data: a spread, a learn entry, a post), a call other than t(), a
 * value it cannot see from the call (a parameter, an import) — or no
 * description at all, which setPageMeta fills with its own English. A name is
 * followed to its declaration in the same file. An object is the reader's
 * language when t(), a localize*() or a content-overlay read (ct, ctEntry,
 * ctList) made it, the English stand-in while its translation loads included.
 * What t() is handed to put into its sentence is t()'s business, not this
 * gate's.
 *
 * The prerendered head the crawlers read (scripts/prerender-meta.mjs) is
 * English by design and is not read here.
 */

const ROOT = process.cwd();
const TEST = /(?:^|\/)(?:test|__tests__)\/|\.test\.tsx?$/;

/** t() and its namespaced cousins: t, tApp, i18n.t. */
const T = /^t(?:[A-Z]\w*)?$/;
/** What puts text in the reader's language: t(), the localizers, the content overlay's readers. */
const LOCALIZER = /^(?:t(?:[A-Z]\w*)?|localize\w*|ct|ctEntry|ctList)$/;
const LETTER = /\p{L}/u;

/**
 * Calls that may set text t() did not make, each with the reason. A claim, not
 * a permission: an entry whose call no longer needs it fails the last test.
 * Keyed "<file> <function> <title|description>".
 */
const ALLOWED: Record<string, string> = {
  'src/utils/seo.ts setArticleMeta title':
    'A blog post’s own title, as BlogPostPage shows it: a post is written in one language and carries no translations (src/types/blog.ts).',
  'src/utils/seo.ts setArticleMeta description':
    'The post’s own excerpt, or the site’s English description for a post without one: the post itself is not translated.',
};

interface Finding {
  /** file:line, for the reader of a failure. */
  at: string;
  /** "<file> <function> <title|description>", what ALLOWED names. */
  id: string;
  /** The English found, and why it counts. */
  english: string;
}

/** The text of a node on one line, for a message. */
const quote = (node: ts.Node) => node.getText().replace(/\s+/g, ' ').slice(0, 100);

/** Every setPageMeta call in `files` (path → source), and the English each sets. */
function scan(files: Record<string, string>): { calls: Map<string, number>; findings: Finding[] } {
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, types: [], jsx: ts.JsxEmit.Preserve };
  const sources = new Map(Object.entries(files).map(([path, text]) => [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (path) => sources.get(path);
  host.fileExists = (path) => sources.has(path);
  // Binding only (no lib, no imports): the checker is here to say which declaration a name means.
  const checker = ts.createProgram([...sources.keys()], options, host).getTypeChecker();
  const declarationOf = (node: ts.Node) => checker.getSymbolAtLocation(node)?.declarations?.[0];

  const calleeName = (call: ts.CallExpression) =>
    ts.isIdentifier(call.expression) ? call.expression.text : ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : '';

  /** A function written in this file that `callee` names, if any. */
  function functionOf(callee: ts.Expression): ts.FunctionLikeDeclaration | undefined {
    const decl = declarationOf(callee);
    if (decl && ts.isFunctionDeclaration(decl)) return decl;
    const init = decl && ts.isVariableDeclaration(decl) ? decl.initializer : undefined;
    return init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) ? init : undefined;
  }

  function returnsOf(fn: ts.FunctionLikeDeclaration): ts.Expression[] {
    if (!fn.body) return [];
    if (!ts.isBlock(fn.body)) return [fn.body];
    const out: ts.Expression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node) && node.expression) out.push(node.expression);
      else if (!ts.isFunctionLike(node)) ts.forEachChild(node, visit);
    };
    ts.forEachChild(fn.body, visit);
    return out;
  }

  /** Where a destructured name comes from: its declaration, parameter or import. */
  function rootOf(decl: ts.Node): ts.Node {
    let node = decl;
    while (ts.isBindingElement(node) || ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) node = node.parent;
    return node;
  }

  /** The value a declaration gives its name, as far as this file says. */
  function valueOf(decl: ts.Declaration): ts.Expression | ts.Block | undefined {
    const root = rootOf(decl);
    if (ts.isVariableDeclaration(root)) return root.initializer;
    if (ts.isFunctionDeclaration(root)) return root.body;
    return undefined;
  }

  function whatIs(decl: ts.Declaration | undefined): string {
    if (!decl) return 'undeclared';
    const root = rootOf(decl);
    if (ts.isParameter(root)) return 'a parameter';
    if (ts.isImportSpecifier(root) || ts.isImportClause(root) || ts.isNamespaceImport(root)) return 'an import';
    return 'not a value this file writes';
  }

  /** Whether t(), a localizer or a content-overlay read made this value, following names through the file. */
  function localized(node: ts.Node): boolean {
    const seen = new Set<ts.Node>();
    let found = false;
    const visit = (n: ts.Node): void => {
      if (found) return;
      if (ts.isCallExpression(n) && LOCALIZER.test(calleeName(n))) {
        found = true;
        return;
      }
      if (ts.isIdentifier(n)) {
        const decl = declarationOf(n);
        const value = decl && !seen.has(decl) ? (seen.add(decl), valueOf(decl)) : undefined;
        if (value) visit(value);
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return found;
  }

  /** The English in an argument that did not go through t(), or null. */
  function english(node: ts.Expression, seen: Set<ts.Node>): string | null {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
      return english(node.expression, seen);
    }
    if (ts.isStringLiteralLike(node)) return LETTER.test(node.text) ? `${quote(node)}, a literal` : null;
    if (ts.isTemplateExpression(node)) {
      if ([node.head, ...node.templateSpans.map((s) => s.literal)].some((part) => LETTER.test(part.text))) return `${quote(node)}, a literal`;
      for (const span of node.templateSpans) {
        const found = english(span.expression, seen);
        if (found) return found;
      }
      return null;
    }
    if (ts.isNumericLiteral(node) || node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isConditionalExpression(node)) return english(node.whenTrue, seen) ?? english(node.whenFalse, seen);
    if (ts.isBinaryExpression(node)) {
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.AmpersandAmpersandToken:
          return english(node.right, seen);
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.PlusToken:
          return english(node.left, seen) ?? english(node.right, seen);
        default:
          return null;
      }
    }
    if (ts.isCallExpression(node)) {
      if (T.test(calleeName(node))) return null;
      const fn = functionOf(node.expression);
      if (!fn) return `${quote(node)}, a call that is not t()`;
      if (seen.has(fn)) return null;
      seen.add(fn);
      for (const value of returnsOf(fn)) {
        const found = english(value, seen);
        if (found) return found;
      }
      return null;
    }
    if (ts.isIdentifier(node)) {
      if (node.text === 'undefined') return null;
      const decl = declarationOf(node);
      const value = decl ? valueOf(decl) : undefined;
      if (decl && value && !ts.isBlock(value)) {
        if (seen.has(decl)) return null;
        seen.add(decl);
        return english(value, seen);
      }
      return `${node.text}, ${whatIs(decl)}: its text cannot be seen from the call`;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'length') return null; // a count
      return localized(node.expression) ? null : `${quote(node)}, a field of an object no localizer made`;
    }
    return `${quote(node)}, not through t()`;
  }

  /** The function a call is written in: what an allowlist entry names. */
  function ownerOf(node: ts.Node): string {
    for (let n = node.parent; n; n = n.parent) {
      if (ts.isFunctionDeclaration(n) && n.name) return n.name.text;
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isFunctionLike(n.initializer)) return n.name.text;
    }
    return '(top level)';
  }

  const calls = new Map<string, number>();
  const findings: Finding[] = [];
  for (const [path, source] of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'setPageMeta') {
        calls.set(path, (calls.get(path) ?? 0) + 1);
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const [title, description] = node.arguments;
        const set = (which: 'title' | 'description', found: string | null) => {
          if (found) findings.push({ at: `${path}:${line} ${which}`, id: `${path} ${ownerOf(node)} ${which}`, english: found });
        };
        set('title', english(title, new Set()));
        set('description', description ? english(description, new Set()) : 'none: setPageMeta writes its own English description');
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { calls, findings };
}

/** The source files under src/ that name setPageMeta, tests aside, by their repo path. */
function sourceFiles(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const path = `${dir}/${name}`;
      if (statSync(join(ROOT, path)).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !TEST.test(path)) {
        const text = readFileSync(join(ROOT, path), 'utf8');
        if (text.includes('setPageMeta')) out[path] = text;
      }
    }
  };
  walk('src');
  return out;
}

/** A page with `body` inside its component, for the checker to read. */
const sample = (body: string) =>
  scan({
    'src/pages/Sample.tsx': [
      "import { setPageMeta } from '../utils/seo';",
      "import { getSpreadBySlug } from '../data/tarotSpreads';",
      "import { localizeCartoLesson } from '../i18n/localizePlayingCard';",
      'export function Sample({ heading }: { heading: string }) {',
      "  const { t } = useT('app');",
      body,
      '}',
    ].join('\n'),
  }).findings.map((f) => `${f.at.replace(/^src\/pages\/Sample\.tsx:\d+ /, '')}: ${f.english}`);

describe('every setPageMeta title and description goes through t() (polish 2026-11)', () => {
  it('reads the English where it is written, and only there', () => {
    // A literal, as the nine pages had it.
    expect(sample(`setPageMeta('The Wishing Sky', t('wishingSky.metaDescription'));`)).toEqual(["title: 'The Wishing Sky', a literal"]);
    expect(sample('setPageMeta(t(\'a\'), `${glossaryEntries.length} terms with definitions.`);')).toEqual([
      'description: `${glossaryEntries.length} terms with definitions.`, a literal',
    ]);
    // The English data, directly or through a name.
    expect(
      sample(`const spread = getSpreadBySlug(slug);
  setPageMeta(\`\${spread.name} — \${t('a')}\`, spread.shortDescription);`),
    ).toEqual(['title: spread.name, a field of an object no localizer made', 'description: spread.shortDescription, a field of an object no localizer made']);
    expect(sample(`const TITLE = 'Lunar Mansions — 二十八宿';\n  setPageMeta(TITLE, t('b'));`)).toEqual(["title: 'Lunar Mansions — 二十八宿', a literal"]);
    // What the call cannot see, a call that is not t(), and no description at all.
    expect(sample(`setPageMeta(heading, [t('a'), 'Arcana'].join(' '));`)).toEqual([
      'title: heading, a parameter: its text cannot be seen from the call',
      "description: [t('a'), 'Arcana'].join(' '), a call that is not t()",
    ]);
    expect(sample(`setPageMeta(t('a'));`)).toEqual(['description: none: setPageMeta writes its own English description']);

    // t(), however it is reached; the reader's objects; text with no letters.
    expect(sample(`setPageMeta(t('a') as string, t('b', { n: 3 }));`)).toEqual([]);
    expect(sample(`const title = ok ? t('a', { count: 2 }) : t('b');\n  setPageMeta(title, i18n.t('c'));`)).toEqual([]);
    expect(sample(`const label = (n: string) => t('c', { n });\n  setPageMeta(label('7'), '');`)).toEqual([]);
    expect(
      sample(`const lesson = useMemo(() => (source ? localizeCartoLesson(source, locale) : null), [source, locale]);
  setPageMeta(t('a', { title: lesson.title }), lesson.lede);`),
    ).toEqual([]);
    // English until the translation is in, then the reader's (the learn entries).
    expect(
      sample(`const head = source && ready ? localizeAstroEntry(source, overlay) : source;
  setPageMeta(head ? t('a', { name: head.name }) : '', head?.shortDescription);`),
    ).toEqual([]);
  });

  it('finds English planted in pages that pass', () => {
    /** The page with argument `index` of its setPageMeta call swapped for `code`. */
    const plant = (path: string, index: number, code: string) => {
      const text = readFileSync(join(ROOT, path), 'utf8');
      expect(scan({ [path]: text }).findings, path).toEqual([]);
      let arg: ts.Node | undefined;
      const find = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && node.expression.getText() === 'setPageMeta') arg = node.arguments[index];
        else if (!arg) ts.forEachChild(node, find);
      };
      find(ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true));
      return scan({ [path]: text.slice(0, arg!.getStart()) + code + text.slice(arg!.getEnd()) }).findings.map((f) => [f.id, f.english]);
    };
    // Mirror's title as it was, and a spread described by the English data again.
    expect(plant('src/pages/MirrorPage.tsx', 0, "'Mirror — your reading patterns'")).toEqual([
      ['src/pages/MirrorPage.tsx MirrorPage title', "'Mirror — your reading patterns', a literal"],
    ]);
    expect(plant('src/pages/SpreadDetailPage.tsx', 1, 'spread.shortDescription')).toEqual([
      ['src/pages/SpreadDetailPage.tsx SpreadDetailPage description', 'spread.shortDescription, a field of an object no localizer made'],
    ]);
  });

  const files = sourceFiles();
  const { calls, findings } = scan(files);

  it('finds every call', () => {
    // As many in each file as its code (comments taken out) names, and no file without one.
    const printer = ts.createPrinter({ removeComments: true });
    for (const [path, text] of Object.entries(files)) {
      const code = printer.printFile(ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true));
      const written = (code.match(/\bsetPageMeta\(/g) ?? []).length - (code.match(/\bfunction setPageMeta\(/g) ?? []).length;
      if (written > 0 || calls.has(path)) expect(calls.get(path) ?? 0, path).toBe(written);
    }
    expect([...calls.values()].reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(30);
    expect(calls.get('src/pages/SpreadDetailPage.tsx')).toBe(1);
    expect(calls.get('src/utils/seo.ts')).toBe(1);
  });

  it('no call sets English that does not go through t(), but those allowed', () => {
    expect(findings.filter((f) => !(f.id in ALLOWED)).map((f) => `${f.at}: ${f.english}`)).toEqual([]);
  });

  it('every allowed call still needs it', () => {
    const ids = new Set(findings.map((f) => f.id));
    expect(Object.keys(ALLOWED).filter((id) => !ids.has(id))).toEqual([]);
  });
});
