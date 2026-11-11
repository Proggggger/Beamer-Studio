import katex from 'katex';
import type { ElementType, ReactNode } from 'react';

const FORMAT_MACROS: Record<string, ElementType> = {
  textbf: 'strong',
  emph: 'em',
  textit: 'em',
  underline: 'u',
};

function readGroup(source: string, start: number): { value: string; end: number } | null {
  let i = start;
  while (source[i] === ' ' || source[i] === '\t') i += 1;
  if (source[i] !== '{') return null;
  let depth = 1;
  let value = '';
  i += 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      value += ch + (source[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      value += ch;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { value, end: i + 1 };
      value += ch;
    } else {
      value += ch;
    }
    i += 1;
  }
  return null;
}

function findClosingDollar(source: string, start: number): number {
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '\\') {
      i += 1;
    } else if (source[i] === '$') {
      return i;
    }
  }
  return -1;
}

function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:|#|\/|\.)/i.test(url)) return url;
  return null;
}

export function MathView({ tex, displayMode = false }: { tex: string; displayMode?: boolean }): ReactNode {
  let html = '';
  try {
    html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    html = '';
  }
  if (!html) {
    return <code className="bx-math-raw">{displayMode ? `\\[${tex}\\]` : `$${tex}$`}</code>;
  }
  return (
    <span
      className={displayMode ? 'bx-math bx-math-display' : 'bx-math'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderSource(source: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buffer = '';
  let key = 0;

  const flush = () => {
    if (buffer) {
      out.push(buffer);
      buffer = '';
    }
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i];

    if (ch === '\\') {
      const next = source[i + 1];
      if (next === undefined) {
        buffer += ch;
        i += 1;
        continue;
      }
      if (next === '\\') {
        flush();
        out.push(<br key={`${keyPrefix}-br-${key}`} />);
        key += 1;
        i += 2;
        continue;
      }
      if ('%&$#_{}'.includes(next)) {
        buffer += next;
        i += 2;
        continue;
      }
      if (next === ' ' || next === ',' || next === ';' || next === ':') {
        buffer += next === ' ' ? ' ' : '\u2009';
        i += 2;
        continue;
      }

      const match = /^[a-zA-Z]+/.exec(source.slice(i + 1));
      if (!match) {
        buffer += ch;
        i += 1;
        continue;
      }
      const name = match[0];
      const cursor = i + 1 + name.length;

      if (name === 'LaTeX' || name === 'TeX') {
        flush();
        out.push(
          <span key={`${keyPrefix}-logo-${key}`} className="bx-logo">
            {name}
          </span>,
        );
        key += 1;
        i = cursor;
        continue;
      }
      if (name === 'ldots' || name === 'dots') {
        buffer += '\u2026';
        i = cursor;
        continue;
      }
      if (name === 'quad') {
        buffer += '\u2003';
        i = cursor;
        continue;
      }
      if (name === 'hfill') {
        flush();
        out.push(<span key={`${keyPrefix}-fill-${key}`} className="bx-hfill" />);
        key += 1;
        i = cursor;
        continue;
      }
      if (name === 'alert' || name === 'texttt') {
        const arg = readGroup(source, cursor);
        if (arg) {
          flush();
          const children = renderSource(arg.value, `${keyPrefix}-${name}-${key}`);
          out.push(
            name === 'alert' ? (
              <span key={`${keyPrefix}-alert-${key}`} className="bx-alert">
                {children}
              </span>
            ) : (
              <code key={`${keyPrefix}-tt-${key}`} className="bx-tt">
                {children}
              </code>
            ),
          );
          key += 1;
          i = arg.end;
          continue;
        }
      }
      if (name === 'href' || name === 'url') {
        const first = readGroup(source, cursor);
        if (first) {
          if (name === 'url') {
            flush();
            const href = safeHref(first.value);
            out.push(
              href ? (
                <a
                  key={`${keyPrefix}-url-${key}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="bx-link"
                >
                  {first.value}
                </a>
              ) : (
                <span key={`${keyPrefix}-url-${key}`}>{first.value}</span>
              ),
            );
            key += 1;
            i = first.end;
            continue;
          }
          const second = readGroup(source, first.end);
          if (second) {
            flush();
            const href = safeHref(first.value);
            const children = renderSource(second.value, `${keyPrefix}-href-${key}`);
            out.push(
              href ? (
                <a
                  key={`${keyPrefix}-href-${key}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="bx-link"
                >
                  {children}
                </a>
              ) : (
                <span key={`${keyPrefix}-href-${key}`}>{children}</span>
              ),
            );
            key += 1;
            i = second.end;
            continue;
          }
        }
      }
      const tag = FORMAT_MACROS[name];
      if (tag) {
        const arg = readGroup(source, cursor);
        if (arg) {
          flush();
          const Tag = tag;
          out.push(
            <Tag key={`${keyPrefix}-fmt-${key}`}>
              {renderSource(arg.value, `${keyPrefix}-fmt-${key}`)}
            </Tag>,
          );
          key += 1;
          i = arg.end;
          continue;
        }
      }

      buffer += source.slice(i, cursor);
      i = cursor;
      continue;
    }

    if (ch === '$') {
      const close = findClosingDollar(source, i + 1);
      if (close > i + 1) {
        flush();
        out.push(<MathView key={`${keyPrefix}-math-${key}`} tex={source.slice(i + 1, close)} />);
        key += 1;
        i = close + 1;
        continue;
      }
      buffer += '$';
      i += 1;
      continue;
    }

    if (ch === '~') {
      buffer += '\u00a0';
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  flush();
  return out;
}

export function Inline({ text }: { text: string }): ReactNode {
  return <>{renderSource(text, 'inline')}</>;
}
