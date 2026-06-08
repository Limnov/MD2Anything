// 样式工具函数 - 服务端使用
import type { Template } from '../templates';
import { parseEnhancedMarkdown } from '../../src/utils/enhancedMarkdown';

interface Settings {
  fontSize?: number;
  margin?: number;
  backgroundColor?: string;
}

/**
 * 为 HTML 元素应用样式（生成带 style 标签的 HTML）
 */
export const applyStyles = (
  html: string,
  template: Template,
  settings?: Settings
): string => {
  const styles = template.styles;
  const fontSize = settings?.fontSize || 16;
  const margin = settings?.margin || 24;
  const bgColor = settings?.backgroundColor || '#ffffff';

  const cssStyles = generateCSSFromTemplate(styles, fontSize);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${margin}px;
      background-color: ${bgColor};
      font-size: ${fontSize}px;
    }
    ${cssStyles}
  </style>
</head>
<body>
  <div class="md-container">
    ${html}
  </div>
</body>
</html>`;
};

export const renderStyledMarkdown = (
  markdown: string,
  template: Template,
  settings?: Settings
): string => {
  const html = parseEnhancedMarkdown(markdown);
  return applyStyles(html, template, settings);
};

/**
 * 从模板样式生成 CSS
 */
const generateCSSFromTemplate = (
  styles: Record<string, string>,
  fontSize: number
): string => {
  const cssRules: string[] = [];

  // 容器样式
  if (styles.container) {
    cssRules.push(`.md-container { ${styles.container} font-size: ${fontSize}px; }`);
  }

  // 各元素样式
  const elementMap: Record<string, string> = {
    h1: styles.h1 || '',
    h2: styles.h2 || '',
    h3: styles.h3 || '',
    h4: 'font-size: 1.1em; font-weight: bold; margin: 16px 0 8px 0;',
    h5: 'font-size: 1em; font-weight: bold; margin: 14px 0 6px 0;',
    h6: 'font-size: 0.9em; font-weight: bold; margin: 12px 0 4px 0; color: #6b7280;',
    p: styles.p || '',
    blockquote: styles.blockquote || '',
    code: styles.code || '',
    pre: styles.pre || '',
    ul: styles.ul || '',
    ol: styles.ol || '',
    li: styles.li || '',
    a: styles.a || '',
    table: styles.table || '',
    th: styles.th || '',
    td: styles.td || '',
    hr: styles.hr || '',
    img: 'max-width: 100%; height: auto;',
  };

  for (const [selector, style] of Object.entries(elementMap)) {
    if (style) {
      cssRules.push(`${selector} { ${style} }`);
    }
  }

  // pre 内的 code 不需要额外背景
  cssRules.push('pre code { background: none; padding: 0; }');

  return cssRules.join('\n    ');
};

/**
 * 生成内联样式的 HTML（用于微信公众号等需要内联样式的场景）
 */
export const generateInlineStyles = (
  html: string,
  template: Template,
  settings?: Settings
): string => {
  const styles = template.styles;
  const fontSize = settings?.fontSize || 15;

  // 样式映射
  const styleMap: Record<string, string> = {
    h1: styles.h1 || '',
    h2: styles.h2 || '',
    h3: styles.h3 || '',
    h4: 'font-size: 1.1em; font-weight: bold; margin: 16px 0 8px 0; color: #374151;',
    h5: 'font-size: 1em; font-weight: bold; margin: 14px 0 6px 0; color: #374151;',
    h6: 'font-size: 0.9em; font-weight: bold; margin: 12px 0 4px 0; color: #6b7280;',
    p: styles.p || `margin: 0.8em 0; font-size: ${fontSize}px;`,
    blockquote: styles.blockquote || '',
    code: styles.code || '',
    pre: styles.pre || '',
    ul: styles.ul || '',
    ol: styles.ol || '',
    li: styles.li || '',
    a: styles.a || '',
    table: styles.table || '',
    th: styles.th || '',
    td: styles.td || '',
    hr: styles.hr || '',
    img: 'max-width: 100%; height: auto;',
  };

  let result = html;

  // 为每个标签添加内联样式
  for (const [tag, style] of Object.entries(styleMap)) {
    if (style) {
      const regex = new RegExp(`<${tag}([^>]*)>`, 'gi');
      result = result.replace(regex, (match, attrs) => {
        if (attrs.includes('style=')) {
          return match; // 已有样式，跳过
        }
        return `<${tag}${attrs} style="${style}">`;
      });
    }
  }

  // 包装在容器中
  const containerStyle = styles.container || '';
  return `<div style="${containerStyle} font-size: ${fontSize}px;">${result}</div>`;
};

export const renderInlineStyledMarkdown = (
  markdown: string,
  template: Template,
  settings?: Settings
): string => {
  const html = parseEnhancedMarkdown(markdown);
  return generateInlineStyles(html, template, settings);
};
