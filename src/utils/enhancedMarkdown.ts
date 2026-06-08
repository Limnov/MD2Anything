/**
 * 增强的 Markdown 解析器
 * 支持：代码高亮、KaTeX 数学公式、Mermaid 图表
 */

import { marked } from 'marked';
import katex from 'katex';
import Prism from 'prismjs';
import sanitizeHtml from 'sanitize-html';

// 导入 Prism 语言支持
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-shell-session';

// 语言映射（别名 -> Prism 语言）
const languageMap: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  'c#': 'csharp',
  cs: 'csharp',
  dockerfile: 'docker',
};

const sanitizeConfig: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'span',
    'div',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'del',
    'input',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
    pre: ['class', 'data-language'],
    div: ['class'],
    span: ['class'],
    input: ['type', 'checked', 'disabled'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        rel: 'noopener noreferrer',
      },
    }),
  },
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeRenderedHtml(html: string): string {
  return sanitizeHtml(html, sanitizeConfig);
}

function normalizeRenderedHtml(html: string): string {
  return html
    .replace(/<tr>\s*<\/tr>/g, '')
    .replace(/<tr>\s*<td>\s*<\/td>\s*<\/tr>/g, '')
    .replace(/<tr>\s*<td\s*\/>\s*<\/tr>/g, '')
    .replace(/<thead>\s*<\/thead>/g, '')
    .replace(/<tbody>\s*<\/tbody>/g, '')
    .replace(/<p>\s*<\/p>\s*<table/g, '<table')
    .replace(/<p\s*\/>\s*<table/g, '<table');
}

// 获取 Prism 语言
function getPrismLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return languageMap[normalized] || normalized;
}

// 检查 Prism 是否支持该语言
function isLanguageSupported(lang: string): boolean {
  const prismLang = getPrismLanguage(lang);
  return Prism.languages[prismLang] !== undefined;
}

// 代码高亮函数
function highlightCode(code: string, lang: string): string {
  const prismLang = getPrismLanguage(lang);

  if (isLanguageSupported(lang)) {
    try {
      return Prism.highlight(code, Prism.languages[prismLang], prismLang);
    } catch {
      // 如果高亮失败，返回原始代码
    }
  }

  // 不支持的语言，转义 HTML 并返回
  return escapeHtml(code);
}

type MarkdownRenderMode = 'preview' | 'wechat';

interface ParseMarkdownOptions {
  mode?: MarkdownRenderMode;
}

export const prismTokenStyleMap: Record<string, string> = {
  comment: 'color: #5c6370; font-style: italic;',
  prolog: 'color: #5c6370; font-style: italic;',
  doctype: 'color: #5c6370; font-style: italic;',
  cdata: 'color: #5c6370; font-style: italic;',
  punctuation: 'color: #abb2bf;',
  property: 'color: #e06c75;',
  tag: 'color: #e06c75;',
  boolean: 'color: #e06c75;',
  number: 'color: #e06c75;',
  constant: 'color: #e06c75;',
  symbol: 'color: #e06c75;',
  deleted: 'color: #e06c75;',
  selector: 'color: #98c379;',
  'attr-name': 'color: #98c379;',
  string: 'color: #98c379;',
  char: 'color: #98c379;',
  builtin: 'color: #98c379;',
  inserted: 'color: #98c379;',
  operator: 'color: #56b6c2;',
  entity: 'color: #56b6c2;',
  url: 'color: #56b6c2;',
  atrule: 'color: #c678dd;',
  'attr-value': 'color: #c678dd;',
  keyword: 'color: #c678dd;',
  function: 'color: #61afef;',
  'class-name': 'color: #61afef;',
  regex: 'color: #e5c07b;',
  important: 'color: #e5c07b;',
  variable: 'color: #e5c07b;',
};

const previewPrismTokenCss = Object.entries(prismTokenStyleMap)
  .map(([token, style]) => `.token.${token} { ${style} }`)
  .join('\n');

// KaTeX 公式渲染
function renderKatex(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
    });
  } catch (e) {
    console.error('KaTeX error:', e);
    return `<span class="katex-error">[公式错误: ${escapeHtml(formula)}]</span>`;
  }
}

// 预处理：提取并替换数学公式和 Mermaid 图表
function preprocessMarkdown(markdown: string): {
  processed: string;
  mathBlocks: Map<string, { formula: string; display: boolean }>;
  mermaidBlocks: Map<string, string>;
} {
  const mathBlocks = new Map<string, { formula: string; display: boolean }>();
  const mermaidBlocks = new Map<string, string>();

  let processed = markdown;
  let counter = 0;

  // 提取块级公式 $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    const placeholder = `%%MATH_BLOCK_${counter++}%%`;
    mathBlocks.set(placeholder, { formula: formula.trim(), display: true });
    return placeholder;
  });

  // 提取行内公式 $...$（但不匹配 $$ 或货币符号）
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, formula) => {
    const placeholder = `%%MATH_INLINE_${counter++}%%`;
    mathBlocks.set(placeholder, { formula: formula.trim(), display: false });
    return placeholder;
  });

  // 提取 Mermaid 代码块
  processed = processed.replace(/```mermaid\n([\s\S]*?)```/gi, (_, code) => {
    const placeholder = `%%MERMAID_${counter++}%%`;
    mermaidBlocks.set(placeholder, code.trim());
    return placeholder;
  });

  return { processed, mathBlocks, mermaidBlocks };
}

// 后处理：恢复数学公式和 Mermaid 图表
function postprocessMarkdown(
  html: string,
  mathBlocks: Map<string, { formula: string; display: boolean }>,
  mermaidBlocks: Map<string, string>
): string {
  let result = html;

  // 恢复块级数学公式
  mathBlocks.forEach((value, placeholder) => {
    const rendered = renderKatex(value.formula, value.display);
    const wrapper = value.display
      ? `<div class="katex-block">${rendered}</div>`
      : `<span class="katex-inline">${rendered}</span>`;
    result = result.replace(placeholder, wrapper);
  });

  // 恢复 Mermaid 图表
  mermaidBlocks.forEach((code, placeholder) => {
    const escapedCode = escapeHtml(code);
    const mermaidDiv = `<div class="mermaid-diagram" data-mermaid="${encodeURIComponent(code)}"><pre class="mermaid">${escapedCode}</pre></div>`;
    result = result.replace(placeholder, mermaidDiv);
  });

  return result;
}

// 自定义代码块处理（在 marked 解析后处理）
function processCodeBlocks(html: string): string {
  // 匹配 <pre><code class="language-xxx">...</code></pre> 格式
  return html.replace(
    /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang, code) => {
      // 解码 HTML 实体
      const decodedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const language = lang || 'plaintext';

      // 如果是 mermaid，保持原样（由预处理处理）
      if (language === 'mermaid') {
        return `<div class="mermaid-diagram"><pre class="mermaid">${escapeHtml(decodedCode)}</pre></div>`;
      }

      const highlighted = highlightCode(decodedCode, language);
      return `<pre class="code-block" data-language="${language}"><code class="language-${language}">${highlighted}</code></pre>`;
    }
  );
}

// 主解析函数
export function parseEnhancedMarkdown(markdown: string, options: ParseMarkdownOptions = {}): string {
  const { mode = 'preview' } = options;

  // 1. 预处理：提取特殊块
  const { processed, mathBlocks, mermaidBlocks } = preprocessMarkdown(markdown);

  // 2. 解析 Markdown（使用默认配置）
  const html = marked(processed, {
    breaks: mode === 'preview',
    gfm: true,
  }) as string;

  // 3. 处理代码块高亮
  const withCodeHighlight = processCodeBlocks(html);

  // 4. 清洗用户输入产生的 HTML
  const sanitizedHtml = sanitizeRenderedHtml(withCodeHighlight);

  // 5. 后处理：恢复特殊块
  const result = postprocessMarkdown(sanitizedHtml, mathBlocks, mermaidBlocks);

  return normalizeRenderedHtml(result);
}

// 生成增强样式的 CSS
export function getEnhancedStyles(): string {
  return `
    /* Prism.js 代码高亮主题 - One Dark */
    .code-block {
      position: relative;
      margin: 16px 0;
      border-radius: 8px;
      background: #282c34;
      overflow: hidden;
    }
    .code-block code {
      display: block;
      padding: 16px;
      overflow-x: auto;
      font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
      font-size: 14px;
      line-height: 1.6;
      color: #abb2bf;
    }
    /* Prism 语法高亮颜色 */
    ${previewPrismTokenCss}

    /* KaTeX 公式样式 */
    .katex-block {
      display: block;
      text-align: center;
      padding: 16px 0;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .katex-inline {
      display: inline;
    }
    .katex {
      font-size: 1.1em;
    }
    .katex-error {
      color: #cf1322;
      font-weight: 500;
    }

    /* Mermaid 图表样式 */
    .mermaid-diagram {
      margin: 16px 0;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: center;
      overflow-x: auto;
    }
    .mermaid-diagram pre.mermaid {
      margin: 0;
      background: transparent;
      font-family: 'trebuchet ms', verdana, arial, sans-serif;
    }
    .mermaid-diagram svg {
      max-width: 100%;
      height: auto;
    }
  `;
}
