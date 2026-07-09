import { Fragment, type ReactNode } from 'react';

// Kevyt Markdown-renderöijä AI-vastauksille — tukee otsikoita, listoja ja lihavointia
// ilman ulkoista kirjastoa.

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Item = { main: string; details: string[] };

export default function AiText({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let items: Item[] = [];

  const flush = () => {
    if (!items.length) return;
    const current = items;
    items = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-2.5 my-2">
        {current.map((it, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span className="flex-1">
              {renderInline(it.main)}
              {it.details.map((d, j) => (
                <span key={j} className="block text-slate-400 mt-0.5">{renderInline(d)}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  content.split('\n').forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push(
        <p key={i} className="text-slate-100 font-semibold text-sm mt-4 first:mt-0 mb-1">
          {renderInline(heading[2].replace(/\*\*/g, ''))}
        </p>
      );
      return;
    }

    const listItem = trimmed.match(/^(?:\d+\.|[-*•])\s+(.*)$/);
    if (listItem) {
      items.push({ main: listItem[1], details: [] });
      return;
    }

    // Jatkorivi (esim. "→ ...") kiinnittyy edelliseen listakohtaan
    const cont = trimmed.match(/^[→>]\s*(.*)$/);
    if (cont && items.length) {
      items[items.length - 1].details.push(cont[1]);
      return;
    }

    flush();
    blocks.push(
      <p key={i} className="text-slate-300 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flush();

  return <div className="text-sm space-y-1">{blocks}</div>;
}
