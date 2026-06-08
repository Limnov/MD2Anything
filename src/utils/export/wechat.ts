import type { Template, Settings } from '../../types';
import { parseEnhancedMarkdown } from '../enhancedMarkdown';

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
  let rawHtml = parseEnhancedMarkdown(markdown);
  const styles = template.styles;

  // ========== 第一步：清理HTML ==========
  // 清理表格相关的空标签（微信公众号对表格格式敏感）
  // 多轮清理，确保彻底
  let prevHtml = '';
  while (prevHtml !== rawHtml) {
    prevHtml = rawHtml;
    // 清理空的 thead（包括只包含空 tr/td 的）
    rawHtml = rawHtml.replace(/<thead>\s*<tr>\s*(<td>\s*<\/td>\s*)*<\/tr>\s*<\/thead>/gi, '');
    rawHtml = rawHtml.replace(/<thead>\s*<\/thead>/gi, '');
    // 清理空的 tbody
    rawHtml = rawHtml.replace(/<tbody>\s*<\/tbody>/gi, '');
    // 清理空的 tr
    rawHtml = rawHtml.replace(/<tr>\s*<\/tr>/gi, '');
    // 清理表格前的空段落
    rawHtml = rawHtml.replace(/<p>\s*<\/p>\s*(<table)/gi, '$1');
    rawHtml = rawHtml.replace(/<p\s*\/>\s*(<table)/gi, '$1');
  }

  // ========== 第二步：获取设置值 ==========
  const fontSize = settings?.fontSize || 15;
  const margin = settings?.margin ?? 24;
  const bgColor = settings?.backgroundColor || '#ffffff';
  const isTransparent = bgColor === 'transparent';

  // ========== 第三步：构建容器样式 ==========
  // 注意：font-family 中不能使用双引号，否则会与 HTML 属性冲突
  const containerStyles: string[] = [
    `font-size: ${fontSize}px`,
    `line-height: 1.75`,
    `font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif`,
    `padding: ${margin}px`,
    `color: #333`,
    `word-wrap: break-word`,
    `letter-spacing: 1px`,
  ];

  if (!isTransparent) {
    containerStyles.push(`background-color: ${bgColor}`);
  }

  // ========== 第四步：定义标签样式 ==========
  // 注意：微信公众号对样式有特殊要求
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

  // 使用模板样式覆盖默认样式
  // 所有样式完全由模板定义，不再硬编码
  const getStyle = (key: string): string => {
    return styles[key as keyof typeof styles] || defaultStyles[key] || '';
  };

  // ========== 第五步：应用样式到标签 ==========
  let styledHtml = rawHtml;

  // 处理标题
  for (let i = 1; i <= 6; i++) {
    const tag = `h${i}`;
    const style = getStyle(tag);
    styledHtml = styledHtml.replace(
      new RegExp(`<${tag}`, 'gi'),
      `<${tag} style="${style}"`
    );
  }

  // 处理段落
  styledHtml = styledHtml.replace(/<p>/gi, `<p style="${getStyle('p')}">`);
  styledHtml = styledHtml.replace(/<p /gi, `<p style="${getStyle('p')}" `);

  // 处理引用
  styledHtml = styledHtml.replace(/<blockquote>/gi, `<blockquote style="${getStyle('blockquote')}">`);
  styledHtml = styledHtml.replace(/<blockquote /gi, `<blockquote style="${getStyle('blockquote')}" `);

  // ========== 关键：处理代码块（pre）==========
  // pre 标签需要特殊的背景色处理
  const preStyle = getStyle('pre');
  styledHtml = styledHtml.replace(/<pre>/gi, `<pre style="${preStyle}">`);
  styledHtml = styledHtml.replace(/<pre /gi, `<pre style="${preStyle}" `);

  // ========== 关键：处理 pre 内的 code ==========
  // pre 内的 code 必须透明背景，继承 pre 的样式
  styledHtml = styledHtml.replace(
    /<pre([^>]*)><code([^>]*)>/gi,
    '<pre$1><code style="background: transparent; padding: 0; margin: 0; border: none; color: inherit; font-size: inherit; font-family: inherit;">'
  );

  // 处理独立的行内 code（不在 pre 内的）
  const codeStyle = getStyle('code');
  styledHtml = styledHtml.replace(/<code>/gi, `<code style="${codeStyle}">`);
  styledHtml = styledHtml.replace(/<code /gi, `<code style="${codeStyle}" `);

  // 处理列表
  styledHtml = styledHtml.replace(/<ul>/gi, `<ul style="${getStyle('ul')}">`);
  styledHtml = styledHtml.replace(/<ul /gi, `<ul style="${getStyle('ul')}" `);
  styledHtml = styledHtml.replace(/<ol>/gi, `<ol style="${getStyle('ol')}">`);
  styledHtml = styledHtml.replace(/<ol /gi, `<ol style="${getStyle('ol')}" `);
  styledHtml = styledHtml.replace(/<li>/gi, `<li style="${getStyle('li')}">`);
  styledHtml = styledHtml.replace(/<li /gi, `<li style="${getStyle('li')}" `);

  // 处理图片
  styledHtml = styledHtml.replace(/<img /gi, `<img style="${getStyle('img')}" `);

  // 处理链接
  styledHtml = styledHtml.replace(/<a /gi, `<a style="${getStyle('a')}" `);

  // ========== 关键：处理表格 ==========
  // 表格样式需要特别注意，确保没有多余的结构
  styledHtml = styledHtml.replace(/<table>/gi, `<table style="${getStyle('table')}">`);
  styledHtml = styledHtml.replace(/<table /gi, `<table style="${getStyle('table')}" `);
  styledHtml = styledHtml.replace(/<thead>/gi, '<thead style="">');
  styledHtml = styledHtml.replace(/<tbody>/gi, '<tbody style="">');
  styledHtml = styledHtml.replace(/<tr>/gi, '<tr style="">');
  styledHtml = styledHtml.replace(/<th>/gi, `<th style="${getStyle('th')}">`);
  styledHtml = styledHtml.replace(/<th /gi, `<th style="${getStyle('th')}" `);
  styledHtml = styledHtml.replace(/<td>/gi, `<td style="${getStyle('td')}">`);
  styledHtml = styledHtml.replace(/<td /gi, `<td style="${getStyle('td')}" `);

  // 处理分隔线
  styledHtml = styledHtml.replace(/<hr>/gi, `<hr style="${getStyle('hr')}">`);
  styledHtml = styledHtml.replace(/<hr /gi, `<hr style="${getStyle('hr')}" `);

  // ========== 处理透明背景下的颜色调整 ==========
  if (isTransparent) {
    // 将深色背景改为浅色
    styledHtml = styledHtml.replace(
      /style="([^"]*)background-color:\s*#282c34;([^"]*)"/gi,
      'style="$1background-color: #f5f5f5;$2"'
    );
    // 调整 th 的白色文字
    styledHtml = styledHtml.replace(
      /<th style="([^"]*?)color:\s*white;?([^"]*)" /gi,
      '<th style="$1color: #333;$2" '
    );
  }

  // ========== 构建最终HTML ==========
  // 使用 section 作为根容器（微信公众号支持较好）
  const finalHtml = `<section style="${containerStyles.join('; ')}">${styledHtml}</section>`;

  return finalHtml;
};

/**
 * 复制HTML到剪贴板
 * 同时设置 text/html 和 text/plain 两种格式
 */
export const copyToClipboard = async (html: string): Promise<boolean> => {
  try {
    // 使用现代 Clipboard API
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([html], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);
    return true;
  } catch {
    // 降级方案
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
      `line-height: 1.75`,
      `padding: ${margin}px`,
      `color: #333`,
      `font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, sans-serif`,
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

  // 基础样式
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

  // 背景只对特定元素保留
  if (keepBackgroundTags.has(tagName)) {
    const bg = computedStyle.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      styleProps.push(`background-color: ${bg}`);
    }
  }

  // 边框 - 处理所有边框属性
  if (computedStyle.border && computedStyle.border !== 'none') {
    styleProps.push(`border: ${computedStyle.border}`);
  } else {
    // 处理单独的边框属性
    const borderProps = ['border-top', 'border-right', 'border-bottom', 'border-left'];
    borderProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'medium none currentcolor') {
        styleProps.push(`${prop}: ${value}`);
      }
    });
  }

  // 列表
  if (tagName === 'LI') {
    styleProps.push('white-space: normal');
  }

  if (styleProps.length > 0) {
    element.style.cssText = styleProps.join('; ');
  }

  // 递归处理子元素
  Array.from(element.children).forEach(child => {
    if (child instanceof HTMLElement) {
      processElementStyles(child);
    }
  });
};
