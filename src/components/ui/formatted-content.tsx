'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormattedContentProps {
  content?: string | null;
  className?: string;
  linkClassName?: string;
  isOutgoing?: boolean;
  compact?: boolean;
}

// Bullet symbols including unicode characters commonly pasted by users
const BULLET_REGEX = /^(\s*)([•\-\*\+▪▫–—\u2022\u2219\u25CF\u25AA\u25B8\u27A4\u2013\u2014])\s+(.*)$/;

// Numbered lists: 1. or 1) or (1) or a. or A.
const NUMBER_REGEX = /^(\s*)(?:(\d+)[.)]|(?:\((\d+)\))|([a-zA-Z])[.)])\s+(.*)$/;

// Tokens: Markdown link [label](url), Raw URL, Email, Bold **text**, Code `code`, Italic *text*
const TOKEN_REGEX = /(\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\))|((?:https?:\/\/|www\.)[^\s<]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\*\*[^*]+?\*\*|__[^_]+?__)|(`[^`]+?`)|(\*[^*]+?\*|_[^_]+?_)/gi;

function cleanUrl(raw: string): { url: string; trailing: string } {
  let url = raw;
  let trailing = '';
  while (url.length > 0) {
    const lastChar = url[url.length - 1];
    if (['.', ',', ':', ';', '!', '?', '"', "'", '>'].includes(lastChar)) {
      trailing = lastChar + trailing;
      url = url.slice(0, -1);
    } else if (lastChar === ')' && !url.includes('(')) {
      trailing = lastChar + trailing;
      url = url.slice(0, -1);
    } else if (lastChar === ']' && !url.includes('[')) {
      trailing = lastChar + trailing;
      url = url.slice(0, -1);
    } else {
      break;
    }
  }
  return { url, trailing };
}

function parseInline(
  text: string,
  linkClass: string,
  keyPrefix: string
): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(TOKEN_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    // 1. Markdown link [label](url)
    if (match[1]) {
      const label = match[2];
      const url = match[3];
      nodes.push(
        <a
          key={`${keyPrefix}-mdlink-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
        >
          <span>{label}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0 inline ml-0.5" />
        </a>
      );
    }
    // 2. Raw URL (https://... or www....)
    else if (match[4]) {
      const { url, trailing } = cleanUrl(match[4]);
      const href = url.startsWith('www.') ? `https://${url}` : url;
      nodes.push(
        <a
          key={`${keyPrefix}-rawurl-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
        >
          <span>{url}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0 inline ml-0.5" />
        </a>
      );
      if (trailing) {
        nodes.push(trailing);
      }
    }
    // 3. Email address
    else if (match[5]) {
      const email = match[5];
      nodes.push(
        <a
          key={`${keyPrefix}-email-${match.index}`}
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
        >
          <span>{email}</span>
        </a>
      );
    }
    // 4. Bold **text**
    else if (match[6]) {
      const inner = match[6].slice(2, -2);
      nodes.push(
        <strong key={`${keyPrefix}-b-${match.index}`} className="font-semibold">
          {inner}
        </strong>
      );
    }
    // 5. Code `code`
    else if (match[7]) {
      const inner = match[7].slice(1, -1);
      nodes.push(
        <code
          key={`${keyPrefix}-c-${match.index}`}
          className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/15 text-[0.88em] font-mono select-all"
        >
          {inner}
        </code>
      );
    }
    // 6. Italic *text*
    else if (match[8]) {
      const inner = match[8].slice(1, -1);
      nodes.push(
        <em key={`${keyPrefix}-i-${match.index}`} className="italic">
          {inner}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'number-list'; items: { num?: string; text: string }[] };

export function FormattedContent({
  content,
  className,
  linkClassName,
  isOutgoing = false,
  compact = false,
}: FormattedContentProps) {
  if (!content || !content.trim()) return null;

  const defaultLinkClass = isOutgoing
    ? 'text-sky-300 hover:text-sky-100 underline decoration-sky-400/50 hover:decoration-sky-300 font-medium break-all transition-colors inline-flex items-center gap-0.5'
    : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-600 font-medium break-all transition-colors inline-flex items-center gap-0.5';

  const linkClass = linkClassName || defaultLinkClass;

  // Split lines and group into structured blocks
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: Block[] = [];
  let currentBlock: Block | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line terminates current block
    if (!trimmed) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    const bulletMatch = rawLine.match(BULLET_REGEX);
    const numberMatch = rawLine.match(NUMBER_REGEX);

    if (bulletMatch) {
      const itemText = bulletMatch[3];
      if (currentBlock && currentBlock.type === 'bullet-list') {
        currentBlock.items.push(itemText);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'bullet-list', items: [itemText] };
      }
    } else if (numberMatch) {
      const num = numberMatch[2] || numberMatch[3] || numberMatch[4];
      const itemText = numberMatch[5];
      if (currentBlock && currentBlock.type === 'number-list') {
        currentBlock.items.push({ num, text: itemText });
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'number-list', items: [{ num, text: itemText }] };
      }
    } else {
      // Regular paragraph line
      if (currentBlock && currentBlock.type === 'paragraph') {
        currentBlock.lines.push(rawLine);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', lines: [rawLine] };
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'bullet-list') {
          return (
            <ul
              key={`b-${bIdx}`}
              className={cn('space-y-1 pl-0.5 list-none', compact ? 'my-0.5' : 'my-1')}
            >
              {block.items.map((item, iIdx) => (
                <li key={`bi-${iIdx}`} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5',
                      isOutgoing ? 'bg-white/80' : 'bg-neutral-600 dark:bg-neutral-300'
                    )}
                  />
                  <span className="flex-1 leading-relaxed">
                    {parseInline(item, linkClass, `bl-${bIdx}-${iIdx}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'number-list') {
          return (
            <ol
              key={`n-${bIdx}`}
              className={cn('space-y-1 pl-0.5 list-none', compact ? 'my-0.5' : 'my-1')}
            >
              {block.items.map((item, iIdx) => (
                <li key={`ni-${iIdx}`} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'font-semibold font-mono text-[0.9em] shrink-0 min-w-[1.2rem]',
                      isOutgoing ? 'text-white/85' : 'text-neutral-700 dark:text-neutral-300'
                    )}
                  >
                    {item.num ? `${item.num}.` : `${iIdx + 1}.`}
                  </span>
                  <span className="flex-1 leading-relaxed">
                    {parseInline(item.text, linkClass, `nl-${bIdx}-${iIdx}`)}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${bIdx}`} className="leading-relaxed">
            {block.lines.map((line, lIdx) => (
              <React.Fragment key={`pl-${lIdx}`}>
                {lIdx > 0 && <br />}
                {parseInline(line, linkClass, `p-${bIdx}-${lIdx}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
