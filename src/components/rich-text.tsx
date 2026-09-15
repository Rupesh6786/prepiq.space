import { Fragment, type ReactNode } from "react";
import ReactKatex from "react-katex";

const { InlineMath } = ReactKatex;

/**
 * Presentation-only formatter. Raw question text stored in the cloud is left
 * untouched — this only decides how it is *displayed* to the learner.
 *
 * Supported (all optional, plain text still works):
 *   - blank lines            -> paragraphs
 *   - "1." / "(a)" / "-" "*" -> ordered / unordered lists
 *   - ```code``` fences      -> code block
 *   - `inline code`
 *   - $ ... $ or \( ... \)   -> equation styling
 *   - x^2, a_1, sqrt(x), <=, >=, !=, *, ->  -> proper symbols
 */

const SYMBOLS: [RegExp, string][] = [
  [/\\times|(?<=[\dA-Za-z)\]])\s\*\s(?=[\dA-Za-z(\[])/g, " × "],
  [/\\div/g, " ÷ "],
  [/<=|\\leq/g, " ≤ "],
  [/>=|\\geq/g, " ≥ "],
  [/!=|\\neq/g, " ≠ "],
  [/->|\\to/g, " → "],
  [/=>|\\Rightarrow/g, " ⇒ "],
  [/\\pm|\+\/-/g, " ± "],
  [/\\infty/g, "∞"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\theta/g, "θ"],
  [/\\pi\b/g, "π"],
  [/\\lambda/g, "λ"],
  [/\\Delta/g, "Δ"],
  [/\\cdot/g, "·"],
];

function symbols(text: string): string {
  let out = text;
  for (const [re, rep] of SYMBOLS) out = out.replace(re, rep);
  out = out.replace(/\bsqrt\s*\(([^()]*)\)/g, "√($1)").replace(/\\sqrt/g, "√");
  return out.replace(/[ \t]{2,}/g, " ");
}

/** Superscripts / subscripts: x^2, a_1, x^{n+1} */
function scripts(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /([\^_])\{([^}]+)\}|([\^_])([A-Za-z0-9+\-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const kind = m[1] ?? m[3];
    const value = m[2] ?? m[4] ?? "";
    parts.push(
      kind === "^" ? (
        <sup key={`${keyBase}-s${i}`} className="text-[0.7em]">{value}</sup>
      ) : (
        <sub key={`${keyBase}-s${i}`} className="text-[0.7em]">{value}</sub>
      ),
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

/** Inline: equations, inline code, bold and italic. */
function inline(raw: string, keyBase: string): ReactNode {
  const text = raw;
  const re = /\$([^$]+)\$|\\\(([\s\S]+?)\\\)|`([^`]+)`|\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...scripts(symbols(text.slice(last, m.index)), `${keyBase}-t${i}`));
    if (m[1] !== undefined || m[2] !== undefined) {
      const math = m[1] ?? m[2] ?? "";
      out.push(
        <span
          key={`${keyBase}-e${i}`}
          className="mx-0.5 inline-block max-w-full overflow-x-auto rounded bg-muted/70 px-1.5 py-0.5 align-middle"
        >
          <InlineMath math={math} renderError={() => <span>{symbols(math)}</span>} />
        </span>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <code key={`${keyBase}-c${i}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined) {
      out.push(<strong key={`${keyBase}-b${i}`}>{m[4]}</strong>);
    } else {
      out.push(<em key={`${keyBase}-i${i}`}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(...scripts(symbols(text.slice(last)), `${keyBase}-t${i}`));
  return <>{out.map((n, k) => <Fragment key={k}>{n}</Fragment>)}</>;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "ol" | "ul"; items: string[] };

function parse(src: string): Block[] {
  // Split a single-line question into logical lines when it clearly holds a list.
  const normalised = src
    .replace(/\r/g, "")
    .replace(/\s+(?=\((?:[ivx]+|[a-d])\)\s)/g, "\n")
    .replace(/\s+(?=\d{1,2}[.)]\s[A-Z(])/g, "\n");

  const lines = normalised.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i] ?? "")) body.push(lines[i] ?? ""), i++;
      i++;
      blocks.push({ kind: "code", lines: body });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const ordered = /^\s*(?:\d{1,2}[.)]|\(?[ivx]+\)|\([a-dA-D]\))\s+/;
    const unordered = /^\s*[-*•]\s+/;
    if (ordered.test(line) || unordered.test(line)) {
      const kind = ordered.test(line) ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i] ?? "";
        const isOrdered = ordered.test(l);
        const isUnordered = unordered.test(l);
        if (!isOrdered && !isUnordered) break;
        if ((kind === "ol") !== isOrdered) break;
        items.push(l.replace(ordered, "").replace(unordered, "").trim());
        i++;
      }
      blocks.push({ kind, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (!l.trim() || /^\s*```/.test(l) || ordered.test(l) || unordered.test(l)) break;
      para.push(l.trim());
      i++;
    }
    blocks.push({ kind: "p", lines: para });
  }
  return blocks;
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  const blocks = parse(text);
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === "code")
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-[0.85em] leading-relaxed"
            >
              <code>{b.lines.join("\n")}</code>
            </pre>
          );
        if (b.kind === "p")
          return (
            <p key={i} className="leading-relaxed">
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, `p${i}-${j}`)}
                </Fragment>
              ))}
            </p>
          );
        const List = b.kind === "ol" ? "ol" : "ul";
        return (
          <List
            key={i}
            className={`ml-5 space-y-1 ${b.kind === "ol" ? "list-decimal" : "list-disc"} marker:text-muted-foreground`}
          >
            {b.items.map((it, j) => (
              <li key={j} className="leading-relaxed">
                {inline(it, `l${i}-${j}`)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

/** Compact single-flow variant for options and short strings. */
export function RichInline({ text, className = "" }: { text: string; className?: string }) {
  return <span className={className}>{inline(text ?? "", "i")}</span>;
}
