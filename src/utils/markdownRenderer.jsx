import React from 'react';
import { stripEmojis } from './scheduleHelpers';
import { CheckSquare, Square } from 'lucide-react';

export { stripEmojis };

function renderInline(text) {
  if (!text) return null;
  const clean = stripEmojis(text);

  // Split text by inline code, bold, and italic tokens
  // Matches: `code`, **bold**, *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = clean.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code key={index} className="inline-code font-mono text-xs">
          {code}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-semibold text-primary-content">{boldText}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      const italicText = part.slice(1, -1);
      return <em key={index}>{italicText}</em>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function FormattedMarkdown({ content, onToggleTask, className = '' }) {
  if (!content) return null;
  const cleanContent = stripEmojis(content);
  const rawLines = cleanContent.split('\n');

  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol' | 'task', items: [] }

  function flushList() {
    if (currentList) {
      if (currentList.type === 'task') {
        blocks.push(
          <ul key={`task-${blocks.length}`} className="markdown-task-list">
            {currentList.items.map((item, i) => (
              <li key={i} className={`markdown-task-item ${item.checked ? 'is-checked' : ''}`}>
                <button
                  type="button"
                  className={`markdown-task-checkbox ${item.checked ? 'is-checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleTask) {
                      onToggleTask(item.lineIndex, !item.checked);
                    }
                  }}
                  aria-label={item.checked ? 'Tandai belum selesai' : 'Tandai selesai'}
                >
                  {item.checked ? (
                    <CheckSquare size={13} className="text-success" />
                  ) : (
                    <Square size={13} className="text-muted" />
                  )}
                </button>
                <span className="markdown-task-text">{renderInline(item.text)}</span>
              </li>
            ))}
          </ul>
        );
      } else if (currentList.type === 'ul') {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="markdown-ul">
            {currentList.items.map((item, i) => (
              <li key={i} className="markdown-li">
                <span className="markdown-bullet">•</span>
                <span className="markdown-li-content">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="markdown-ol">
            {currentList.items.map((item, i) => (
              <li key={i} className="markdown-oli">
                <span className="markdown-num font-mono">{i + 1}.</span>
                <span className="markdown-li-content">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Header check: # or ## or ###
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const Tag = level === 1 ? 'h4' : level === 2 ? 'h5' : 'h6';
      blocks.push(
        <Tag key={`h-${blocks.length}`} className="markdown-header font-semibold">
          {renderInline(headerText)}
        </Tag>
      );
      continue;
    }

    // Checklist task check: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = trimmed.match(/^[-*•]\s+\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      if (!currentList || currentList.type !== 'task') {
        flushList();
        currentList = { type: 'task', items: [] };
      }
      currentList.items.push({
        checked: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2] || '',
        lineIndex: i
      });
      continue;
    }

    // Bullet item check: - or * or •
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered item check: 1. or 2.
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    // Regular paragraph line
    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="markdown-paragraph">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`markdown-body ${className}`}>{blocks}</div>;
}

export default FormattedMarkdown;
