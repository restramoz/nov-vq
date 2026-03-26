import React from "react";

interface FormattedContentProps {
  content: string;
  className?: string;
}

/**
 * Parses AI-generated text and renders it with proper formatting:
 * - # / ## / ### headings
 * - **bold** and *italic*
 * - - or * unordered lists
 * - 1. ordered lists
 * - --- horizontal rules
 * - Regular paragraphs with proper spacing
 */
export function FormattedContent({ content, className = "" }: FormattedContentProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!currentList) return;
    const listItems = currentList.items.map((item, i) => (
      <li key={i} className="ml-1">{renderInline(item)}</li>
    ));
    if (currentList.type === "ul") {
      elements.push(<ul key={key++} className="list-disc pl-6 space-y-1 my-3 text-foreground/90">{listItems}</ul>);
    } else {
      elements.push(<ol key={key++} className="list-decimal pl-6 space-y-1 my-3 text-foreground/90">{listItems}</ol>);
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line - flush list and add spacing
    if (!trimmed) {
      flushList();
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={key++} className="my-6 border-border/50" />);
      continue;
    }

    // Headings
    const h3Match = trimmed.match(/^###\s+(.+)/);
    if (h3Match) {
      flushList();
      elements.push(
        <h4 key={key++} className="font-display text-lg font-semibold mt-6 mb-2 text-foreground">
          {renderInline(h3Match[1])}
        </h4>
      );
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)/);
    if (h2Match) {
      flushList();
      elements.push(
        <h3 key={key++} className="font-display text-xl font-semibold mt-8 mb-3 text-primary">
          {renderInline(h2Match[1])}
        </h3>
      );
      continue;
    }

    const h1Match = trimmed.match(/^#\s+(.+)/);
    if (h1Match) {
      flushList();
      elements.push(
        <h2 key={key++} className="font-display text-2xl font-bold mt-8 mb-4 text-primary">
          {renderInline(h1Match[1])}
        </h2>
      );
      continue;
    }

    // Chapter title pattern (e.g. "Chapter 1: Title" or "Bab 1: Title")
    const chapterTitleMatch = trimmed.match(/^(?:Chapter|Bab)\s+\d+[:\s]+(.+)/i);
    if (chapterTitleMatch && i < 3) {
      flushList();
      elements.push(
        <h2 key={key++} className="font-display text-2xl font-bold text-center mt-4 mb-6 text-primary">
          {renderInline(trimmed)}
        </h2>
      );
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      if (currentList?.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList!.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (olMatch) {
      if (currentList?.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList!.items.push(olMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="my-2 leading-[1.9] text-foreground/90">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`formatted-content ${className}`}>{elements}</div>;
}

/**
 * Renders inline formatting: **bold**, *italic*, `code`
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partKey = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={partKey++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={partKey++} className="italic text-foreground/80">{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={partKey++} className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary">
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
