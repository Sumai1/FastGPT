import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightMarkdown } from '../../src/utils/markdown';

describe('Tier 1 & 2 Unit: Markdown Parser & Numbered Steps Extractor', () => {
  it('T1-MD-01: renders plain text and streaming cursor correctly', () => {
    const { container, rerender } = render(
      <LightMarkdown content="这是一条测试消息" isStreaming={false} />
    );
    expect(container.textContent).toContain('这是一条测试消息');
    expect(container.querySelector('.cs-typing-cursor')).toBeNull();

    rerender(<LightMarkdown content="正在输入中" isStreaming={true} />);
    expect(container.textContent).toContain('正在输入中');
    expect(container.querySelector('.cs-typing-cursor')).not.toBeNull();
  });

  it('T1-MD-02: renders markdown headers (h1, h2, h3) and blockquotes', () => {
    const markdown = `
# 标题一级
## 标题二级
### 标题三级
> 这是一条安全排查重要提示
`;
    const { container } = render(<LightMarkdown content={markdown} />);

    expect(container.querySelector('h1')?.textContent).toBe('标题一级');
    expect(container.querySelector('h2')?.textContent).toBe('标题二级');
    expect(container.querySelector('h3')?.textContent).toBe('标题三级');
    expect(container.querySelector('blockquote')?.textContent).toContain(
      '这是一条安全排查重要提示'
    );
  });

  it('T1-MD-03: renders unordered and ordered lists', () => {
    const markdown = `
- 检查电源线连接
- 检查机身指示灯
1. 第一步操作
2. 第二步操作
`;
    const { container } = render(<LightMarkdown content={markdown} />);

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(4);
    expect(listItems[0].textContent).toBe('检查电源线连接');
    expect(listItems[2].textContent).toBe('第一步操作');
  });

  it('T1-MD-04: renders code blocks and handles copy button click', () => {
    const markdown = `
\`\`\`json
{
  "errorCode": "E-01",
  "status": "active"
}
\`\`\`
`;
    const { container } = render(<LightMarkdown content={markdown} />);

    const codeEl = container.querySelector('pre code');
    expect(codeEl).not.toBeNull();
    expect(codeEl?.textContent).toContain('"errorCode": "E-01"');

    const copyBtn = container.querySelector('.cs-code-copy-btn');
    expect(copyBtn).not.toBeNull();

    fireEvent.click(copyBtn!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"errorCode": "E-01"')
    );
  });

  it('T1-MD-05: renders markdown tables properly', () => {
    const markdown = `
| 模块名称 | 状态 | 响应时间 |
| :--- | :---: | ---: |
| 打印机 | 正常 | 120ms |
| 扫码头 | 就绪 | 45ms |
`;
    const { container } = render(<LightMarkdown content={markdown} />);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(container.querySelectorAll('th').length).toBe(3);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    expect(container.textContent).toContain('打印机');
    expect(container.textContent).toContain('120ms');
  });

  it('T2-MD-01: sanitizes unsafe javascript: links to # and preserves safe https: links', () => {
    const markdown = `
[安全官网](https://fastgpt.in/docs)
[恶意脚本](javascript:alert(document.cookie))
`;
    const { container } = render(<LightMarkdown content={markdown} />);

    const links = container.querySelectorAll('a');
    expect(links.length).toBe(2);

    expect(links[0].getAttribute('href')).toBe('https://fastgpt.in/docs');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');

    expect(links[1].getAttribute('href')).toBe('#');
  });

  it('T2-MD-02: handles empty, nullish or whitespace-only markdown without crashing', () => {
    const { container: c1 } = render(<LightMarkdown content="" />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<LightMarkdown content="   \n\n   " />);
    expect(c2.querySelector('.cs-markdown-root')).not.toBeNull();
  });

  it('T2-MD-03: renders inline formatting: bold, italic, and inline code', () => {
    const markdown = '请**先切断电源**，随后使用*螺丝刀*卸下`主板防护盖`。';
    const { container } = render(<LightMarkdown content={markdown} />);

    expect(container.querySelector('strong')?.textContent).toBe('先切断电源');
    expect(container.querySelector('em')?.textContent).toBe('螺丝刀');
    expect(container.querySelector('code')?.textContent).toBe('主板防护盖');
  });
});
