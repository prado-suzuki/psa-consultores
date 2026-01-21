import React from 'react';

/**
 * Renders markdown text to React elements
 * Supports: **bold**, *italic*, - bullet lists, 1. numbered lists
 */
export function renderMarkdown(text: string | null): React.ReactNode {
  if (!text) return null;

  // Split by lines to handle lists properly
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const renderInlineFormatting = (line: string): React.ReactNode => {
    // Handle **bold** and *italic*
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Check for bold first (must come before italic check)
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for italic (single asterisk, but not part of bold)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

      if (boldMatch && boldMatch.index !== undefined) {
        // Add text before bold
        if (boldMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, boldMatch.index)}</span>);
        }
        // Add bold text
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else if (italicMatch && italicMatch.index !== undefined) {
        // Add text before italic
        if (italicMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, italicMatch.index)}</span>);
        }
        // Add italic text
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      } else {
        // No more formatting, add remaining text
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type;
      elements.push(
        <ListTag key={elements.length} className={currentList.type === 'ul' ? 'list-disc pl-5' : 'list-decimal pl-5'}>
          {currentList.items.map((item, i) => (
            <li key={i}>{renderInlineFormatting(item)}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  lines.forEach((line, index) => {
    // Check for bullet list item (- or *)
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    // Check for numbered list item
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);

    if (bulletMatch) {
      if (currentList?.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (currentList?.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <p key={elements.length} className="mb-1">
            {renderInlineFormatting(line)}
          </p>
        );
      } else if (index > 0 && index < lines.length - 1) {
        // Empty line between content (not at start or end)
        elements.push(<br key={elements.length} />);
      }
    }
  });

  // Flush any remaining list
  flushList();

  return <div className="space-y-1">{elements}</div>;
}
