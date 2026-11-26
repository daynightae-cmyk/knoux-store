import type { ReactNode } from 'react';
import styles from './docs-reader.module.css';

type Block =
  | { kind: 'heading'; title: string; level: number }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; text: string; language: string }
  | { kind: 'list'; items: string[] };

function parseMarkdown(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = /^\s*(`{3,}|~{3,})([\w+-]*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      while (++index < lines.length && !lines[index].trimStart().startsWith(fence[1])) body.push(lines[index]);
      blocks.push({ kind: 'code', language: fence[2], text: body.join('\n') });
      continue;
    }
    if (/^\s*<\/?[a-z][\s\S]*>\s*$/i.test(line)) continue;
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', title: heading[2].replace(/\s+#+\s*$/, ''), level: heading[1].length });
      continue;
    }
    const list = /^\s*[-*+]\s+(.+)$/.exec(line);
    const previous = blocks.at(-1);
    if (list) {
      if (previous?.kind === 'list' && lines[index - 1]?.trim()) previous.items.push(list[1]);
      else blocks.push({ kind: 'list', items: [list[1]] });
    } else if (line.trim()) {
      if (previous?.kind === 'paragraph' && lines[index - 1]?.trim()) previous.text += `\n${line}`;
      else blocks.push({ kind: 'paragraph', text: line });
    }
  }
  return blocks;
}

type MarkdownContext = {
  path: string;
  documentPaths: ReadonlySet<string>;
  onDocument: (path: string) => void;
};

function renderInline(text: string, context: MarkdownContext): ReactNode[] {
  const output: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(/`([^`]+)`|\[([^\]]+)\]\(([^()\s]+)\)|\*\*([^*]+)\*\*/g)) {
    const index = match.index ?? end;
    output.push(text.slice(end, index));
    end = index + match[0].length;
    if (match[1]) {
      output.push(<code key={index}>{match[1]}</code>);
      continue;
    }
    if (match[4]) {
      output.push(<strong key={index}>{match[4]}</strong>);
      continue;
    }
    let url: URL;
    try {
      url = new URL(match[3], `https://docs.invalid/${context.path}`);
    } catch {
      output.push(match[2]);
      continue;
    }
    if (url.origin === 'https://docs.invalid' && context.documentPaths.has(url.pathname.slice(1)) && !match[3].startsWith('#')) {
      output.push(<button key={index} type="button" className={styles.inlineLink} onClick={() => context.onDocument(url.pathname.slice(1))}>{match[2]}</button>);
    } else if (url.origin !== 'https://docs.invalid' && url.protocol === 'https:' && !url.username && !url.password) {
      output.push(<a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{match[2]}</a>);
    } else {
      output.push(match[2]);
    }
  }
  output.push(text.slice(end));
  return output;
}

export function DocsMarkdown({ content, ...context }: MarkdownContext & { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <div className={styles.document}>
      <article className={styles.markdown}>
        {blocks.map((block, index) => {
          if (block.kind === 'heading') {
            const Heading = block.level <= 2 ? 'h3' : 'h4';
            return <Heading key={index} id={`doc-section-${index}`}>{renderInline(block.title, context)}</Heading>;
          }
          if (block.kind === 'code') return <pre key={index} data-language={block.language || undefined}><code>{block.text}</code></pre>;
          if (block.kind === 'list') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, context)}</li>)}</ul>;
          return <p key={index}>{renderInline(block.text, context)}</p>;
        })}
      </article>
      {blocks.some((block) => block.kind === 'heading') && (
        <nav className={styles.outline} aria-label="Document outline">
          {blocks.map((block, index) => block.kind === 'heading' && <a key={index} href={`#doc-section-${index}`}>{block.title}</a>)}
        </nav>
      )}
    </div>
  );
}
