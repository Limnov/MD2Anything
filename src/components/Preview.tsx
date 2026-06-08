import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import mermaid from 'mermaid';
import type { Template, XiaohongshuSplitMode } from '../types';
import { parseEnhancedMarkdown, getEnhancedStyles, escapeHtml } from '../utils/enhancedMarkdown';

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'trebuchet ms, verdana, arial, sans-serif',
});

const mermaidSvgAllowedTags = new Set([
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
]);

const mermaidSvgAllowedAttributes: Record<string, string[]> = {
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
};

const sanitizeMermaidSvg = (svg: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;

  if (!root || root.tagName.toLowerCase() !== 'svg') {
    return '';
  }

  const sanitizeNode = (node: Element) => {
    const tagName = node.tagName.toLowerCase();
    if (!mermaidSvgAllowedTags.has(tagName)) {
      node.remove();
      return;
    }

    const allowedAttributes = new Set(mermaidSvgAllowedAttributes[tagName] || []);
    for (const attr of Array.from(node.attributes)) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();
      const isEventHandler = attrName.startsWith('on');
      const isDangerousUrl = /javascript:/i.test(attrValue);

      if (!allowedAttributes.has(attr.name) || isEventHandler || isDangerousUrl) {
        node.removeAttribute(attr.name);
      }
    }

    Array.from(node.children).forEach(child => sanitizeNode(child));
  };

  sanitizeNode(root);
  return new XMLSerializer().serializeToString(root);
};

interface PreviewProps {
  markdown: string;
  template: Template;
  fontSize?: number;
  backgroundColor?: string;
  margin?: number;
  fixedSize?: { width: number; height: number | 'auto' };
  splitMode?: XiaohongshuSplitMode;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(
  ({ markdown, template, fontSize = 15, backgroundColor = '#ffffff', margin = 24, fixedSize, splitMode = 'auto' }, ref) => {
    const mermaidRenderedRef = useRef(false);
    const measureRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [activePreviewPage, setActivePreviewPage] = useState(0);
    const [previewPages, setPreviewPages] = useState<string[]>([]);

    const htmlContent = useMemo(() => parseEnhancedMarkdown(markdown), [markdown]);
    const cardBgColor = backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;
    const isPagedPreview = Boolean(fixedSize && fixedSize.height !== 'auto');
    const pageHeight = isPagedPreview && typeof fixedSize?.height === 'number'
      ? Math.max(fixedSize.height, 120)
      : 0;

    useLayoutEffect(() => {
      if (!isPagedPreview || !measureRef.current || !fixedSize || typeof fixedSize.height !== 'number') {
        setPreviewPages([]);
        setActivePreviewPage(0);
        return;
      }

      const sourceChildren = Array.from(measureRef.current.children) as HTMLElement[];
      if (sourceChildren.length === 0) {
        setPreviewPages([htmlContent]);
        setActivePreviewPage(0);
        return;
      }

      const pages: string[] = [];
      const probe = document.createElement('div');
      probe.className = 'preview-measure-content';
      probe.style.position = 'absolute';
      probe.style.left = '-99999px';
      probe.style.top = '0';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.width = `${fixedSize.width}px`;
      probe.style.maxWidth = '100%';
      probe.style.margin = '0';
      probe.style.padding = `${margin}px`;
      probe.style.boxSizing = 'border-box';
      probe.style.minHeight = '0';
      probe.style.background = 'transparent';
      probe.style.borderRadius = '0';
      probe.style.boxShadow = 'none';
      document.body.appendChild(probe);

      const flush = () => {
        if (probe.childNodes.length > 0) {
          pages.push(probe.innerHTML);
          probe.innerHTML = '';
        }
      };

      for (const child of sourceChildren) {
        if (splitMode === 'hr' && child.tagName === 'HR') {
          flush();
          continue;
        }

        const node = child.cloneNode(true) as HTMLElement;
        probe.appendChild(node);

        if (probe.scrollHeight > pageHeight) {
          probe.removeChild(node);

          if (probe.childNodes.length > 0) {
            flush();
          }

          probe.appendChild(node);
        }
      }

      flush();
      probe.remove();

      const nextPages = (pages.length > 0 ? pages : [htmlContent]).slice(0, 9);
      setPreviewPages(nextPages);
      setActivePreviewPage(0);
    }, [htmlContent, isPagedPreview, fixedSize, margin, pageHeight, splitMode]);

    useEffect(() => {
      mermaidRenderedRef.current = false;
    }, [htmlContent, activePreviewPage]);

    useEffect(() => {
      if (activePreviewPage >= previewPages.length) {
        setActivePreviewPage(0);
      }
    }, [activePreviewPage, previewPages.length]);

    useEffect(() => {
      if (mermaidRenderedRef.current || !contentRef.current) return;

      const mermaidElements = contentRef.current.querySelectorAll('.mermaid-diagram pre.mermaid');
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
            wrapper.innerHTML = sanitizeMermaidSvg(svg);
          }
        } catch (e) {
          console.error('Mermaid render error:', e);
          const wrapper = el.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `<pre style="color: red; text-align: left;">Mermaid 语法错误:\n${escapeHtml(code)}</pre>`;
          }
        }
      });
    }, [htmlContent, activePreviewPage, previewPages.length]);

    const styles = template.styles;
    const contentBaseStyle = (styles.container || '')
      .replace(/background-color:\s*[^;]+;?/gi, '')
      .replace(/background:\s*[^;]+;?/gi, '')
      .replace(/padding(?:-[a-z]+)?\s*:\s*[^;]+;?/gi, '');
    const previewCardStyle: CSSProperties = {
      width: fixedSize?.width ?? '100%',
      maxWidth: fixedSize ? '100%' : 720,
      minHeight: fixedSize && fixedSize.height !== 'auto' ? fixedSize.height : undefined,
      boxSizing: 'border-box',
      overflow: 'hidden',
      flexShrink: 0,
    };
    const contentHtml = isPagedPreview ? (previewPages[activePreviewPage] || '') : htmlContent;

    return (
      <div
        ref={ref}
        className="preview-container"
        style={{
          minHeight: '100%',
          overflow: 'auto',
          transition: 'background-color 0.3s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: isPagedPreview ? '20px 0 24px' : 0,
        }}
      >
        {isPagedPreview && previewPages.length > 1 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
            {previewPages.map((_, index) => (
              <button
                key={`page-${index}`}
                type="button"
                onClick={() => setActivePreviewPage(index)}
                style={{
                  border: activePreviewPage === index ? '1px solid #1677ff' : '1px solid #d9d9d9',
                  background: activePreviewPage === index ? '#e6f4ff' : '#fff',
                  color: activePreviewPage === index ? '#1677ff' : '#595959',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {`第 ${index + 1} 张`}
              </button>
            ))}
          </div>
        ) : null}

        <div style={previewCardStyle}>
          <style>
            {`
              /* 引入 KaTeX 样式 */
              @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');

              /* 增强功能样式 */
              ${getEnhancedStyles()}

              .preview-content,
              .preview-measure-content {
                font-size: ${fontSize}px !important;
                max-width: 100%;
                margin: 0;
                box-sizing: border-box;
                ${contentBaseStyle}
              }
              .preview-content {
                padding: ${margin}px;
                min-height: ${isPagedPreview && typeof fixedSize?.height === 'number' ? `${fixedSize.height}px` : 'auto'};
                background-color: ${cardBgColor} !important;
                background-image: none !important;
                border: 1px solid rgba(15, 23, 42, 0.08);
                border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
              }
              .preview-measure-content {
                padding: ${margin}px;
                min-height: 0;
                background: transparent !important;
                border-radius: 0;
                box-shadow: none;
              }
              .preview-content h1, .preview-measure-content h1 { background: transparent !important; ${styles.h1 || ''} }
              .preview-content h2, .preview-measure-content h2 { background: transparent !important; ${styles.h2 || ''} }
              .preview-content h3, .preview-measure-content h3 { background: transparent !important; ${styles.h3 || ''} }
              .preview-content h4, .preview-measure-content h4 { background: transparent !important; font-size: 1em; font-weight: bold; margin: 12px 0 8px; }
              .preview-content h5, .preview-measure-content h5 { background: transparent !important; font-size: 0.9em; font-weight: bold; margin: 10px 0 6px; }
              .preview-content h6, .preview-measure-content h6 { background: transparent !important; font-size: 0.85em; font-weight: bold; margin: 8px 0 4px; }
              .preview-content p, .preview-measure-content p { background: transparent !important; ${styles.p || ''} }
              .preview-content blockquote, .preview-measure-content blockquote { ${styles.blockquote || ''} }
              .preview-content code:not([class*="language-"]), .preview-measure-content code:not([class*="language-"]) { ${styles.code || ''} }
              .preview-content pre:not(.code-block):not(.mermaid), .preview-measure-content pre:not(.code-block):not(.mermaid) { ${styles.pre || ''} }
              .preview-content pre code:not([class*="language-"]), .preview-measure-content pre code:not([class*="language-"]) {
                background: transparent !important;
                padding: 0;
                color: inherit;
              }
              .preview-content ul, .preview-measure-content ul { background: transparent !important; ${styles.ul || ''} }
              .preview-content ol, .preview-measure-content ol { background: transparent !important; ${styles.ol || ''} }
              .preview-content li, .preview-measure-content li { background: transparent !important; ${styles.li || ''} }
              .preview-content img, .preview-measure-content img { ${styles.img || ''} }
              .preview-content a, .preview-measure-content a { background: transparent !important; ${styles.a || ''} }
              .preview-content table, .preview-measure-content table { ${styles.table || ''} }
              .preview-content th, .preview-measure-content th { ${styles.th || ''} }
              .preview-content td, .preview-measure-content td { ${styles.td || ''} }
              .preview-content hr, .preview-measure-content hr { ${styles.hr || 'border: none; height: 1px; background: #e8e8e8; margin: 16px 0;'} }
            `}
          </style>
          <div
            ref={contentRef}
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          <div
            ref={measureRef}
            className="preview-measure-content"
            style={{ position: 'absolute', left: '-99999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    );
  }
);

Preview.displayName = 'Preview';

export default Preview;
