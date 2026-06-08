import type { Template, Settings } from '../../types';
import { parseEnhancedMarkdown, prismTokenStyleMap } from '../enhancedMarkdown';

const CODE_BLOCK_PREVIEW_STYLE = [
  'margin: 16px 0',
  'border-radius: 8px',
  'background: #282c34',
  'border: 1px solid #1f2329',
  'overflow: hidden',
].join('; ');

const CODE_ELEMENT_PREVIEW_STYLE = [
  'display: block',
  'padding: 16px',
  'overflow-x: auto',
  'white-space: pre',
  'word-break: normal',
  'font-family: Fira Code, Monaco, Menlo, monospace',
  'font-size: 14px',
  'line-height: 1.6',
  'color: #abb2bf',
  'background: transparent',
  'margin: 0',
  'border: none',
].join('; ');

const LIST_STYLE_OVERRIDES = {
  ul: 'margin: 0.8em 0; padding-left: 1.5em; list-style-type: disc; list-style-position: outside;',
  ol: 'margin: 0.8em 0; padding-left: 1.5em; list-style-type: decimal; list-style-position: outside;',
  li: 'display: list-item; margin: 0.35em 0; white-space: normal; word-break: break-word; text-align: left; position: static;',
};

const stripUnsafeListDeclarations = (style: string, tagName: 'UL' | 'OL' | 'LI') => {
  const base = style
    .replace(/list-style(?:-[a-z]+)?\s*:[^;]+;?/gi, '')
    .replace(/padding-left\s*:[^;]+;?/gi, '')
    .replace(/margin(?:-[a-z]+)?\s*:[^;]+;?/gi, '')
    .replace(/position\s*:[^;]+;?/gi, '')
    .replace(/counter-reset\s*:[^;]+;?/gi, '')
    .replace(/text-indent\s*:[^;]+;?/gi, '')
    .trim();

  const override = tagName === 'UL'
    ? LIST_STYLE_OVERRIDES.ul
    : tagName === 'OL'
      ? LIST_STYLE_OVERRIDES.ol
      : LIST_STYLE_OVERRIDES.li;

  return `${base}${base ? '; ' : ''}${override}`;
};

const mergeStyle = (existing: string | null, incoming: string) => {
  return [existing?.trim(), incoming.trim()].filter(Boolean).join('; ');
};

const htmlToPlainText = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent || '';
};

const applyPrismTokenInlineStyles = (root: ParentNode) => {
  root.querySelectorAll('span[class*="token"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const tokenClasses = Array.from(node.classList).filter(className => className !== 'token');
    const matchedStyles = tokenClasses
      .map(className => prismTokenStyleMap[className])
      .filter(Boolean);

    if (matchedStyles.length > 0) {
      node.style.cssText = mergeStyle(node.getAttribute('style'), matchedStyles.join(' '));
    }
  });
};

const normalizeListItemParagraphs = (listItem: HTMLLIElement, paragraphStyle: string) => {
  const directParagraphs = Array.from(listItem.children).filter(
    (child): child is HTMLParagraphElement => child.tagName === 'P'
  );

  directParagraphs.forEach((paragraph, index) => {
    const replacementTag = index === 0 ? 'span' : 'div';
    const replacement = document.createElement(replacementTag);
    replacement.innerHTML = paragraph.innerHTML;
    replacement.style.cssText = replacementTag === 'span'
      ? mergeStyle(paragraphStyle, 'display: inline; margin: 0; padding: 0; white-space: normal;')
      : mergeStyle(paragraphStyle, 'display: block; margin: 0.35em 0 0; padding: 0;');
    paragraph.replaceWith(replacement);
  });

  Array.from(listItem.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      node.remove();
    }
  });
};

const normalizeListsForWechat = (root: HTMLElement, getStyle: (key: string) => string) => {
  root.querySelectorAll('ul, ol').forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    const tagName = list.tagName as 'UL' | 'OL';
    const templateStyle = getStyle(tagName.toLowerCase());
    list.style.cssText = stripUnsafeListDeclarations(templateStyle, tagName);
  });

  root.querySelectorAll('li').forEach((listItem) => {
    if (!(listItem instanceof HTMLLIElement)) return;
    const templateStyle = getStyle('li');
    listItem.style.cssText = stripUnsafeListDeclarations(templateStyle, 'LI');
    normalizeListItemParagraphs(listItem, getStyle('p'));
  });
};

const normalizeCodeBlocksForWechat = (root: HTMLElement) => {
  root.querySelectorAll('pre.code-block').forEach((pre) => {
    if (!(pre instanceof HTMLElement)) return;
    pre.style.cssText = CODE_BLOCK_PREVIEW_STYLE;

    const code = pre.querySelector('code');
    if (code instanceof HTMLElement) {
      code.style.cssText = CODE_ELEMENT_PREVIEW_STYLE;
      applyPrismTokenInlineStyles(code);
    }
  });
};

const applyInlineStylesToWechatHtml = (
  rawHtml: string,
  getStyle: (key: string) => string,
  isTransparent: boolean
) => {
  const container = document.createElement('div');
  container.innerHTML = rawHtml;

  for (let i = 1; i <= 6; i++) {
    container.querySelectorAll(`h${i}`).forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.cssText = getStyle(`h${i}`);
      }
    });
  }

  container.querySelectorAll('p').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('p');
    }
  });

  container.querySelectorAll('blockquote').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('blockquote');
    }
  });

  container.querySelectorAll('pre:not(.code-block)').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('pre');
    }
  });

  container.querySelectorAll('pre:not(.code-block) > code').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = 'background: transparent; padding: 0; margin: 0; border: none; color: inherit; font-size: inherit; font-family: inherit;';
    }
  });

  container.querySelectorAll('code:not(pre code)').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('code');
    }
  });

  container.querySelectorAll('img').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('img');
    }
  });

  container.querySelectorAll('a').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = mergeStyle(node.getAttribute('style'), getStyle('a'));
    }
  });

  container.querySelectorAll('table').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('table');
    }
  });

  container.querySelectorAll('thead, tbody, tr').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = '';
    }
  });

  container.querySelectorAll('th').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('th');
    }
  });

  container.querySelectorAll('td').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('td');
    }
  });

  container.querySelectorAll('hr').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.cssText = getStyle('hr');
    }
  });

  normalizeListsForWechat(container, getStyle);
  normalizeCodeBlocksForWechat(container);

  if (isTransparent) {
    container.querySelectorAll('pre.code-block').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.backgroundColor = '#f5f5f5';
        node.style.borderColor = '#d9d9d9';
      }
    });

    container.querySelectorAll('pre.code-block > code').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.color = '#333333';
      }
    });
  }

  return container.innerHTML;
};

/**
 * 将Markdown转换为带有完整内联样式的HTML
 * 专门针对微信公众号编辑器优化
 *
 * 微信公众号限制：
 * 1. 只支持内联样式（inline style）
 * 2. 不支持 <style> 标签和 class 选择器
 * 3. 不支持 JavaScript、iframe
 * 4. 复杂嵌套容易出问题
 */
export const getInlineStyledHTML = (
  markdown: string,
  template: Template,
  settings?: Partial<Settings>
): string => {
  let rawHtml = parseEnhancedMarkdown(markdown, { mode: 'wechat' });
  const styles = template.styles;

  // ========== 第一步：清理HTML ==========
  let prevHtml = '';
  while (prevHtml !== rawHtml) {
    prevHtml = rawHtml;
    rawHtml = rawHtml.replace(/<thead>\s*<tr>\s*(<td>\s*<\/td>\s*)*<\/tr>\s*<\/thead>/gi, '');
    rawHtml = rawHtml.replace(/<thead>\s*<\/thead>/gi, '');
    rawHtml = rawHtml.replace(/<tbody>\s*<\/tbody>/gi, '');
    rawHtml = rawHtml.replace(/<tr>\s*<\/tr>/gi, '');
    rawHtml = rawHtml.replace(/<p>\s*<\/p>\s*(<table)/gi, '$1');
    rawHtml = rawHtml.replace(/<p\s*\/>\s*(<table)/gi, '$1');
  }

  const fontSize = settings?.fontSize || 15;
  const margin = settings?.margin ?? 24;
  const bgColor = settings?.backgroundColor || '#ffffff';
  const isTransparent = bgColor === 'transparent';

  const containerStyles: string[] = [
    `font-size: ${fontSize}px`,
    'line-height: 1.75',
    'font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif',
    `padding: ${margin}px`,
    'color: #333',
    'word-wrap: break-word',
    'letter-spacing: 1px',
  ];

  if (!isTransparent) {
    containerStyles.push(`background-color: ${bgColor}`);
  }

  const defaultStyles: Record<string, string> = {
    h1: 'margin-top: 1.2em; margin-bottom: 0.8em; font-weight: bold; font-size: 1.6em; color: #333;',
    h2: 'margin-top: 1em; margin-bottom: 0.6em; font-weight: bold; font-size: 1.4em; color: #333;',
    h3: 'margin-top: 0.8em; margin-bottom: 0.5em; font-weight: bold; font-size: 1.2em; color: #333;',
    h4: 'margin-top: 0.6em; margin-bottom: 0.4em; font-weight: bold; font-size: 1em; color: #333;',
    h5: 'margin-top: 0.5em; margin-bottom: 0.3em; font-weight: bold; font-size: 0.9em; color: #333;',
    h6: 'margin-top: 0.4em; margin-bottom: 0.2em; font-weight: bold; font-size: 0.85em; color: #333;',
    p: 'margin: 0.8em 0; color: #333; text-align: justify;',
    blockquote: 'margin: 1em 0; padding: 10px 15px; border-left: 4px solid #ddd; background-color: #f8f8f8; color: #666;',
    pre: 'margin: 1em 0; padding: 15px; background-color: #282c34; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;',
    code: 'background-color: rgba(0,0,0,0.05); padding: 2px 5px; border-radius: 3px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 0.9em; color: #c7254e;',
    ul: 'margin: 0.8em 0; padding-left: 1.5em; list-style-type: disc;',
    ol: 'margin: 0.8em 0; padding-left: 1.5em; list-style-type: decimal;',
    li: 'margin: 0.3em 0; color: #333;',
    img: 'max-width: 100%; height: auto; display: block; margin: 0.8em auto;',
    a: 'color: #576b95; text-decoration: none;',
    table: 'width: 100%; border-collapse: collapse; margin: 1em 0; background-color: #fff;',
    th: 'padding: 10px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold; text-align: left; color: #333;',
    td: 'padding: 10px; border: 1px solid #ddd; color: #333;',
    hr: 'border: none; height: 1px; background-color: #eee; margin: 1.5em 0;',
  };

  const getStyle = (key: string): string => {
    return styles[key as keyof typeof styles] || defaultStyles[key] || '';
  };

  const styledHtml = applyInlineStylesToWechatHtml(rawHtml, getStyle, isTransparent);
  return `<section style="${containerStyles.join('; ')}">${styledHtml}</section>`;
};

/**
 * 复制HTML到剪贴板
 * 同时设置 text/html 和 text/plain 两种格式
 */
export const copyToClipboard = async (html: string): Promise<boolean> => {
  try {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([htmlToPlainText(html)], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);
    return true;
  } catch {
    return copyWithExecCommand(html);
  }
};

/**
 * 使用 execCommand 复制HTML（降级方案）
 */
const copyWithExecCommand = (html: string): boolean => {
  try {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    container.innerHTML = html;
    container.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const result = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      return result;
    }

    document.body.removeChild(container);
    return false;
  } catch {
    return false;
  }
};

/**
 * 从Markdown内容复制到剪贴板（推荐使用）
 */
export const copyMarkdownToClipboard = async (
  markdown: string,
  template: Template,
  settings?: Partial<Settings>
): Promise<boolean> => {
  const html = getInlineStyledHTML(markdown, template, settings);
  return copyToClipboard(html);
};

/**
 * 复制预览元素到剪贴板（备用方案）
 */
export const copyPreviewToClipboard = async (
  previewElement: HTMLElement,
  _template: Template,
  settings?: Partial<Settings>
): Promise<boolean> => {
  try {
    const fontSize = settings?.fontSize || 15;
    const margin = settings?.margin ?? 24;
    const bgColor = settings?.backgroundColor || '#ffffff';
    const isTransparent = bgColor === 'transparent';

    const wrapper = document.createElement('section');
    wrapper.style.cssText = [
      `font-size: ${fontSize}px`,
      'line-height: 1.75',
      `padding: ${margin}px`,
      'color: #333',
      'font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, sans-serif',
      isTransparent ? '' : `background-color: ${bgColor}`,
    ].filter(Boolean).join('; ');

    const clone = previewElement.cloneNode(true) as HTMLElement;
    processElementStyles(clone);
    wrapper.appendChild(clone);

    const tempContainer = document.createElement('div');
    tempContainer.contentEditable = 'true';
    tempContainer.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
    tempContainer.appendChild(wrapper);
    document.body.appendChild(tempContainer);

    const range = document.createRange();
    range.selectNodeContents(wrapper);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const result = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(tempContainer);
      return result;
    }

    document.body.removeChild(tempContainer);
    return false;
  } catch {
    return false;
  }
};

/**
 * 递归处理元素样式
 */
const processElementStyles = (element: HTMLElement): void => {
  const keepBackgroundTags = new Set(['CODE', 'PRE', 'BLOCKQUOTE', 'TABLE', 'TH', 'TD']);
  const computedStyle = window.getComputedStyle(element);
  const tagName = element.tagName;
  const styleProps: string[] = [];

  const propMap: Record<string, string> = {
    fontSize: computedStyle.fontSize,
    fontWeight: computedStyle.fontWeight,
    fontStyle: computedStyle.fontStyle,
    textDecoration: computedStyle.textDecoration,
    color: computedStyle.color,
    textAlign: computedStyle.textAlign,
    lineHeight: computedStyle.lineHeight,
    margin: computedStyle.margin,
    padding: computedStyle.padding,
  };
  Object.entries(propMap).forEach(([prop, value]) => {
    if (value) {
      styleProps.push(`${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`);
    }
  });

  if (keepBackgroundTags.has(tagName)) {
    const bg = computedStyle.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      styleProps.push(`background-color: ${bg}`);
    }
  }

  if (computedStyle.border && computedStyle.border !== 'none') {
    styleProps.push(`border: ${computedStyle.border}`);
  } else {
    const borderProps = ['border-top', 'border-right', 'border-bottom', 'border-left'];
    borderProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'medium none currentcolor') {
        styleProps.push(`${prop}: ${value}`);
      }
    });
  }

  if (tagName === 'LI') {
    styleProps.push('white-space: normal');
    styleProps.push('word-break: break-word');
  }

  if (styleProps.length > 0) {
    element.style.cssText = styleProps.join('; ');
  }

  Array.from(element.children).forEach(child => {
    if (child instanceof HTMLElement) {
      processElementStyles(child);
    }
  });
};
