import type { Template, Settings } from '../../types';
import { getTemplateById } from '../../templates';
import { parseEnhancedMarkdown } from '../enhancedMarkdown';

export const renderStyledHtmlFragment = (
  html: string,
  template: Template,
  settings?: Partial<Settings>
): string => {
  const styles = template.styles;
  const fontSize = settings?.fontSize || 15;
  const margin = settings?.margin ?? 24;
  const bgColor = settings?.backgroundColor || '#ffffff';
  const bgStyle = bgColor === 'transparent' ? '' : `background-color: ${bgColor};`;

  return `
    <div style="font-size: ${fontSize}px; padding: ${margin}px; ${bgStyle} ${styles.container || ''}" class="md-content">
      ${html}
    </div>
  `;
};

// 将Markdown转换为带样式的HTML
export const markdownToStyledHTML = (
  markdown: string,
  template: Template,
  settings?: Partial<Settings>
): string => {
  const renderedHtml = parseEnhancedMarkdown(markdown, { mode: 'preview' });
  return renderStyledHtmlFragment(renderedHtml, template, settings);
};

// 导出为HTML文件
export const exportAsHTML = (
  markdown: string,
  templateId: string,
  filename: string = 'export',
  settings?: Partial<Settings>
): void => {
  const template = getTemplateById(templateId);
  if (!template) return;

  const styledContent = markdownToStyledHTML(markdown, template, settings);
  const bgColor = settings?.backgroundColor || '#ffffff';
  const bgStyle = bgColor === 'transparent' ? '#f5f5f5' : bgColor;

  const fullHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: ${bgStyle};
    }
    .md-content img {
      max-width: 100%;
      height: auto;
    }
    .md-content pre {
      overflow-x: auto;
    }
  </style>
</head>
<body>
  ${styledContent}
</body>
</html>
  `.trim();

  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
};
