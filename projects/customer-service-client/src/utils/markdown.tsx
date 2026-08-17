import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

/** 格式化安全 URL */
const sanitizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return '#';
};

/** 单个代码块组件（带复制功能） */
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="cs-code-block">
      <div className="cs-code-header">
        <span className="cs-code-lang">{language || 'code'}</span>
        <button
          type="button"
          className="cs-code-copy-btn"
          onClick={handleCopy}
          aria-label="复制代码"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check size={14} className="cs-icon-success" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <pre className="cs-code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * 轻量行内格式解析（粗体、斜体、行内代码、超链接）
 */
const renderInline = (text: string): React.ReactNode => {
  // 正则匹配: **bold**, *italic*, `code`, [text](url)
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index}>{renderInline(part.slice(2, -2))}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{renderInline(part.slice(1, -1))}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="cs-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={index}
          href={sanitizeUrl(href)}
          target="_blank"
          rel="noopener noreferrer"
          className="cs-link"
        >
          {label}
        </a>
      );
    }
    return part;
  });
};

/**
 * 极轻量原生 Markdown 渲染器，零重型依赖，支持流式打字与代码复制
 */
export const LightMarkdown: React.FC<MarkdownProps> = ({ content, isStreaming }) => {
  if (!content) {
    return isStreaming ? <span className="cs-typing-cursor" /> : null;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const ListTag = inList;
      elements.push(
        <ListTag key={`list-${elements.length}`} className={`cs-markdown-${inList}`}>
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      inList = null;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      elements.push(
        <div key={`table-wrapper-${elements.length}`} className="cs-table-wrapper">
          <table className="cs-markdown-table">
            <thead>
              <tr>
                {header.map((col, idx) => (
                  <th key={idx}>{renderInline(col.trim())}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块判定
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            language={codeBlockLang}
            code={codeBlockLines.join('\n')}
          />
        );
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockLines = [];
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 表格判定 (| a | b |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      const cells = line.trim().slice(1, -1).split('|');
      // 忽略分隔线 |---|---|
      const isDivider = cells.every((c) => /^[\s-:]+$/.test(c));
      if (!isDivider) {
        if (!inTable) inTable = true;
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 标题判定
    if (line.startsWith('# ')) {
      flushList();
      flushTable();
      elements.push(
        <h1 key={`h1-${elements.length}`} className="cs-markdown-h1">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushTable();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="cs-markdown-h2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      flushTable();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="cs-markdown-h3">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // 引用判定
    if (line.startsWith('> ')) {
      flushList();
      flushTable();
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="cs-markdown-quote">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 无序列表判定
    if (/^[-*+]\s+/.test(line.trim())) {
      flushTable();
      if (inList !== 'ul') flushList();
      inList = 'ul';
      listItems.push(line.trim().replace(/^[-*+]\s+/, ''));
      continue;
    }

    // 有序列表判定
    if (/^\d+\.\s+/.test(line.trim())) {
      flushTable();
      if (inList !== 'ol') flushList();
      inList = 'ol';
      listItems.push(line.trim().replace(/^\d+\.\s+/, ''));
      continue;
    }

    // 空行
    if (!line.trim()) {
      flushList();
      flushTable();
      continue;
    }

    // 普通段落
    flushList();
    flushTable();
    elements.push(
      <p key={`p-${elements.length}`} className="cs-markdown-p">
        {renderInline(line)}
      </p>
    );
  }

  // 收尾未处理的块
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <CodeBlock
        key={`code-${elements.length}`}
        language={codeBlockLang}
        code={codeBlockLines.join('\n')}
      />
    );
  }
  flushList();
  flushTable();

  return (
    <div className="cs-markdown-root">
      {elements}
      {isStreaming && <span className="cs-typing-cursor" aria-hidden="true" />}
    </div>
  );
};
