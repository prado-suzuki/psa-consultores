import React from 'react';

/**
 * Renders markdown text to React elements
 * Supports: **bold**, *italic*, - bullet lists (nested with indent), 1. numbered lists (nested)
 */

interface ListNode {
  type: 'ul' | 'ol';
  items: ListItemNode[];
}

interface ListItemNode {
  content: string;
  children: ListNode | null;
}

export function renderMarkdown(text: string | null): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  const renderInlineFormatting = (line: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, boldMatch.index)}</span>);
        }
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.substring(0, italicMatch.index)}</span>);
        }
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  // Parse a line to detect indent level and list marker
  const parseListLine = (line: string): { indent: number; type: 'ul' | 'ol' | null; content: string } => {
    // Match indented bullet: spaces/tabs then - or *
    const bulletMatch = line.match(/^([\t ]*)([-*])\s+(.+)$/);
    if (bulletMatch) {
      const rawIndent = bulletMatch[1];
      const indent = rawIndent.replace(/\t/g, '  ').length; // normalize tab to 2 spaces
      return { indent: Math.floor(indent / 2), type: 'ul', content: bulletMatch[3] };
    }
    // Match indented numbered list
    const numberedMatch = line.match(/^([\t ]*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      const rawIndent = numberedMatch[1];
      const indent = rawIndent.replace(/\t/g, '  ').length;
      return { indent: Math.floor(indent / 2), type: 'ol', content: numberedMatch[2] };
    }
    return { indent: 0, type: null, content: line };
  };

  // Render a list node recursively
  const renderListNode = (node: ListNode, key: number): React.ReactNode => {
    const ListTag = node.type;
    return (
      <ListTag key={key} className={node.type === 'ul' ? 'list-disc pl-5' : 'list-decimal pl-5'}>
        {node.items.map((item, i) => (
          <li key={i}>
            {renderInlineFormatting(item.content)}
            {item.children && renderListNode(item.children, i)}
          </li>
        ))}
      </ListTag>
    );
  };

  // Collect consecutive list lines and build a tree
  let i = 0;
  while (i < lines.length) {
    const parsed = parseListLine(lines[i]);

    if (parsed.type) {
      // Start collecting list lines
      const listLines: { indent: number; type: 'ul' | 'ol'; content: string }[] = [];
      while (i < lines.length) {
        const p = parseListLine(lines[i]);
        if (p.type) {
          listLines.push({ indent: p.indent, type: p.type, content: p.content });
          i++;
        } else {
          break;
        }
      }

      // Build nested list structure from flat list with indent levels
      const buildTree = (items: typeof listLines, startIdx: number, baseIndent: number): { node: ListNode; endIdx: number } => {
        const rootType = items[startIdx].type;
        const node: ListNode = { type: rootType, items: [] };
        let idx = startIdx;

        while (idx < items.length && items[idx].indent >= baseIndent) {
          if (items[idx].indent === baseIndent) {
            node.items.push({ content: items[idx].content, children: null });
            idx++;
          } else {
            // Nested: attach as children of last item
            const { node: childNode, endIdx } = buildTree(items, idx, items[idx].indent);
            const lastItem = node.items[node.items.length - 1];
            if (lastItem) {
              lastItem.children = childNode;
            } else {
              // No parent item, create a blank one
              node.items.push({ content: '', children: childNode });
            }
            idx = endIdx;
          }
        }

        return { node, endIdx: idx };
      };

      const { node } = buildTree(listLines, 0, listLines[0].indent);
      elements.push(renderListNode(node, elements.length));
    } else {
      const line = lines[i];
      if (line.trim()) {
        elements.push(
          <p key={elements.length} className="mb-1">
            {renderInlineFormatting(line)}
          </p>
        );
      } else if (i > 0 && i < lines.length - 1) {
        elements.push(<br key={elements.length} />);
      }
      i++;
    }
  }

  return <div className="space-y-1">{elements}</div>;
}
