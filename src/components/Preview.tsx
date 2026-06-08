import { forwardRef, useMemo, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import sanitizeHtml from 'sanitize-html';
import type { Template } from '../types';
import { parseEnhancedMarkdown, getEnhancedStyles, escapeHtml } from '../utils/enhancedMarkdown';

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'trebuchet ms, verdana, arial, sans-serif',
});

const mermaidSvgSanitizeConfig: sanitizeHtml.IOptions = {
  allowedTags: [
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'marker',
    'pattern',
    'mask',
    'clipPath',
    'foreignObject',
    'title',
    'desc',
  ],
  allowedAttributes: {
    svg: ['viewBox', 'width', 'height', 'role', 'aria-roledescription', 'xmlns'],
    g: ['transform', 'class', 'fill', 'stroke', 'stroke-width'],
    path: ['d', 'fill', 'stroke', 'stroke-width', 'marker-start', 'marker-mid', 'marker-end', 'class', 'transform'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'class', 'transform'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'class', 'transform'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'class', 'transform'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'class', 'transform'],
    polyline: ['points', 'fill', 'stroke', 'stroke-width', 'class', 'transform'],
    polygon: ['points', 'fill', 'stroke', 'stroke-width', 'class', 'transform'],
    text: ['x', 'y', 'dx', 'dy', 'text-anchor', 'class', 'style', 'fill', 'font-size', 'font-family', 'transform'],
    tspan: ['x', 'y', 'dx', 'dy', 'class', 'style', 'fill', 'font-size', 'font-family'],
    defs: [],
    marker: ['id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'viewBox', 'markerUnits'],
    pattern: ['id', 'width', 'height', 'patternUnits', 'patternTransform'],
    mask: ['id', 'x', 'y', 'width', 'height', 'maskUnits'],
    clipPath: ['id'],
    foreignObject: ['x', 'y', 'width', 'height'],
    title: [],
    desc: [],
  },
};

interface PreviewProps {
  markdown: string;
  template: Template;
  fontSize?: number;
  backgroundColor?: string;
  margin?: number;
  fixedWidth?: number; // 固定宽度（用于小红书预览）
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(
  ({ markdown, template, fontSize = 15, backgroundColor = '#ffffff', margin = 24, fixedWidth }, ref) => {
    const mermaidRenderedRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 使用增强的 Markdown 解析器
    const htmlContent = useMemo(() => parseEnhancedMarkdown(markdown), [markdown]);

    useEffect(() => {
      mermaidRenderedRef.current = false;
    }, [htmlContent]);

    // 渲染 Mermaid 图表
    useEffect(() => {
      if (mermaidRenderedRef.current || !containerRef.current) return;

      const mermaidElements = containerRef.current.querySelectorAll('.mermaid-diagram pre.mermaid');
      if (mermaidElements.length === 0) {
        mermaidRenderedRef.current = true;
        return;
      }

      mermaidRenderedRef.current = true;

      mermaidElements.forEach(async (el, index) => {
        const code = el.textContent || '';
        try {
          const id = `mermaid-${Date.now()}-${index}`;
          const { svg } = await mermaid.render(id, code);
          const wrapper = el.parentElement;
          if (wrapper) {
            wrapper.innerHTML = sanitizeHtml(svg, mermaidSvgSanitizeConfig);
          }
        } catch (e) {
          console.error('Mermaid render error:', e);
          const wrapper = el.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `<pre style="color: red; text-align: left;">Mermaid 语法错误:\n${escapeHtml(code)}</pre>`;
          }
        }
      });
    }, [htmlContent]);

    const styles = template.styles;

    // 背景颜色处理
    const bgColor = backgroundColor === 'transparent' ? 'transparent' : backgroundColor;

    // 从 container 样式中提取非背景色的样式
    const containerStyleWithoutBg = (styles.container || '').replace(/background-color:\s*[^;]+;?/gi, '').replace(/background:\s*[^;]+;?/gi, '');

    return (
      <div
        ref={ref}
        className="preview-container"
        style={{
          padding: `${margin}px`,
          minHeight: '100%',
          backgroundColor: bgColor,
          overflow: 'auto',
          transition: 'background-color 0.3s',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={fixedWidth ? { width: fixedWidth, maxWidth: '100%' } : undefined}>
        <style>
          {`
            /* 引入 KaTeX 样式 */
            @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');

            /* 增强功能样式 */
            ${getEnhancedStyles()}

            .preview-content {
              font-size: ${fontSize}px !important;
              ${containerStyleWithoutBg}
            }
            /* 确保这些元素没有背景色 - 使用 !important 覆盖任何继承的背景 */
            .preview-content h1 { background: transparent !important; ${styles.h1 || ''} }
            .preview-content h2 { background: transparent !important; ${styles.h2 || ''} }
            .preview-content h3 { background: transparent !important; ${styles.h3 || ''} }
            .preview-content h4 { background: transparent !important; font-size: 1em; font-weight: bold; margin: 12px 0 8px; }
            .preview-content h5 { background: transparent !important; font-size: 0.9em; font-weight: bold; margin: 10px 0 6px; }
            .preview-content h6 { background: transparent !important; font-size: 0.85em; font-weight: bold; margin: 8px 0 4px; }
            .preview-content p { background: transparent !important; ${styles.p || ''} }
            .preview-content blockquote { ${styles.blockquote || ''} }
            .preview-content code:not([class*="language-"]) { ${styles.code || ''} }
            .preview-content pre:not(.code-block):not(.mermaid) { ${styles.pre || ''} }
            .preview-content pre code:not([class*="language-"]) {
              background: transparent !important;
              padding: 0;
              color: inherit;
            }
            .preview-content ul { background: transparent !important; ${styles.ul || ''} }
            .preview-content ol { background: transparent !important; ${styles.ol || ''} }
            .preview-content li { background: transparent !important; ${styles.li || ''} }
            .preview-content img { ${styles.img || ''} }
            .preview-content a { background: transparent !important; ${styles.a || ''} }
            .preview-content table { ${styles.table || ''} }
            .preview-content th { ${styles.th || ''} }
            .preview-content td { ${styles.td || ''} }
            .preview-content hr { ${styles.hr || 'border: none; height: 1px; background: #e8e8e8; margin: 16px 0;'} }
          `}
        </style>
        <div
          ref={containerRef}
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        </div>
      </div>
    );
  }
);

Preview.displayName = 'Preview';

export default Preview;
