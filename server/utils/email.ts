// 邮件 HTML 生成工具 - 服务端使用
import type { Template } from '../templates';
import { escapeHtml, parseEnhancedMarkdown } from '../../src/utils/enhancedMarkdown';

interface Settings {
  fontSize?: number;
  backgroundColor?: string;
}

const getEmailPreviewText = (markdown: string): string => {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#>*_~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const excerpt = plainText.slice(0, 100);
  return escapeHtml(excerpt ? `${excerpt}...` : '');
};

/**
 * 生成邮件兼容的 HTML
 * 特点：
 * - 使用内联样式（邮件客户端不支持外部 CSS）
 * - 使用 table 布局（更好的兼容性）
 * - 不使用 CSS 变量和现代特性
 */
export const generateEmailHtml = (
  markdown: string,
  template: Template,
  settings?: Settings
): string => {
  const htmlContent = parseEnhancedMarkdown(markdown);
  const styles = template.styles;
  const fontSize = settings?.fontSize || 16;
  const bgColor = settings?.backgroundColor || '#ffffff';
  const previewText = getEmailPreviewText(markdown);

  const emailHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>邮件内容</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* 重置样式 */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: ${bgColor};
    }
    /* 预览文本 */
    .preview-text {
      display: none;
      max-height: 0;
      overflow: hidden;
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: ${bgColor}; width: 100% !important;">
  <!-- 预览文本 -->
  <div class="preview-text" style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>

  <!-- 主容器 -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!-- 内容容器 -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="${styles.container}">
          <tr>
            <td style="padding: 20px; font-size: ${fontSize}px; line-height: 1.6; color: #374151;">
              <!-- 邮件内容 -->
              <div style="${styles.container}">
                ${applyInlineStyles(htmlContent, styles)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return emailHTML;
};

/**
 * 为 HTML 元素应用内联样式
 */
const applyInlineStyles = (html: string, styles: Record<string, string>): string => {
  // 样式映射
  const styleMap: Record<string, string> = {
    h1: styles.h1 || '',
    h2: styles.h2 || '',
    h3: styles.h3 || '',
    h4: 'font-size: 1.1em; font-weight: bold; margin: 16px 0 8px 0; color: #374151;',
    h5: 'font-size: 1em; font-weight: bold; margin: 14px 0 6px 0; color: #374151;',
    h6: 'font-size: 0.9em; font-weight: bold; margin: 12px 0 4px 0; color: #6b7280;',
    p: styles.p || '',
    blockquote: styles.blockquote || '',
    code: styles.code || '',
    pre: styles.pre || '',
    ul: styles.ul || '',
    ol: styles.ol || '',
    li: styles.li || '',
    img: styles.img || '',
    a: styles.a || '',
    table: styles.table || '',
    th: styles.th || '',
    td: styles.td || '',
    hr: styles.hr || '',
  };

  let result = html;

  // 为每个标签添加内联样式
  for (const [tag, style] of Object.entries(styleMap)) {
    if (style) {
      const regex = new RegExp(`<${tag}([^>]*)>`, 'gi');

      if (tag === 'table') {
        // 表格需要特殊处理，添加 role 和属性
        result = result.replace(regex, (match, attrs) => {
          if (attrs.includes('style=')) {
            return match; // 已有样式，跳过
          }
          return `<table role="presentation" cellspacing="0" cellpadding="0" border="0"${attrs} style="${style}">`;
        });
      } else if (tag === 'a') {
        // 链接需要特殊处理
        result = result.replace(regex, (match, attrs) => {
          if (attrs.includes('style=')) {
            return match;
          }
          return `<a${attrs} style="${style}">`;
        });
      } else {
        result = result.replace(regex, (match, attrs) => {
          if (attrs.includes('style=')) {
            return match;
          }
          return `<${tag}${attrs} style="${style}">`;
        });
      }
    }
  }

  return result;
};
