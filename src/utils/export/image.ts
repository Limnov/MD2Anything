import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import type { XiaohongshuSize, XiaohongshuSplitMode } from '../../types';

// 小红书图片尺寸配置
export const xiaohongshuSizeOptions = [
  { value: 'vertical' as XiaohongshuSize, label: '竖版 3:4', width: 360, height: 480, description: '360×480px' },
  { value: 'square' as XiaohongshuSize, label: '方形 1:1', width: 360, height: 360, description: '360×360px' },
  { value: 'long' as XiaohongshuSize, label: '长图', width: 360, height: 'auto' as const, description: '360px宽' },
];

// 小红书分割模式配置
export const xiaohongshuSplitOptions = [
  { value: 'hr' as XiaohongshuSplitMode, label: '按分割线', description: '根据 --- 分割线切分' },
  { value: 'auto' as XiaohongshuSplitMode, label: '自适应', description: '根据内容高度自动分割' },
];

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 导出为图片（单张）
export const exportAsImage = async (
  element: HTMLElement,
  filename: string = 'export',
  quality: 'low' | 'medium' | 'high' = 'high',
  backgroundColor: string = '#ffffff',
  margin: number = 24,
  fixedSize?: { width: number; height: number | 'auto' }
): Promise<void> => {
  // 根据质量设置缩放比例，高质量使用更高的 devicePixelRatio
  const baseScale = quality === 'low' ? 1 : quality === 'medium' ? 2 : Math.max(window.devicePixelRatio * 2, 3);
  const bgColor = backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;

  // 保存原始样式
  const originalPadding = element.style.padding;
  const originalOverflow = element.style.overflow;
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;

  // 临时设置样式以确保完整渲染
  element.style.padding = `${margin}px`;
  element.style.overflow = 'visible';

  // 如果有固定尺寸要求（如小红书）
  if (fixedSize) {
    element.style.width = `${fixedSize.width}px`;
    element.style.maxWidth = `${fixedSize.width}px`;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: baseScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: bgColor,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
      windowWidth: fixedSize ? fixedSize.width : element.scrollWidth,
      windowHeight: fixedSize && typeof fixedSize.height === 'number' ? fixedSize.height : element.scrollHeight,
    });

    // 恢复原始样式
    element.style.padding = originalPadding;
    element.style.overflow = originalOverflow;
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;

    // 如果指定了固定尺寸，需要裁剪或调整
    let finalCanvas = canvas;
    if (fixedSize && typeof fixedSize.height === 'number') {
      // 创建固定尺寸的画布
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = fixedSize.width * baseScale;
      targetCanvas.height = fixedSize.height * baseScale;
      const ctx = targetCanvas.getContext('2d');

      if (ctx) {
        // 填充背景色
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

        // 计算缩放比例以适应目标尺寸
        const scaleX = targetCanvas.width / canvas.width;
        const scaleY = targetCanvas.height / canvas.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        const x = (targetCanvas.width - scaledWidth) / 2;
        const y = (targetCanvas.height - scaledHeight) / 2;

        ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
        finalCanvas = targetCanvas;
      }
    }

    // 使用最高质量的 PNG 格式
    finalCanvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${filename}.png`);
      }
    }, 'image/png', 1.0);
  } catch (error) {
    // 恢复原始样式
    element.style.padding = originalPadding;
    element.style.overflow = originalOverflow;
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    console.error('Image export error:', error);
    throw error;
  }
};

// 按分割线分割内容
const splitContentByHr = (element: HTMLElement): HTMLElement[] => {
  const sections: HTMLElement[] = [];
  const hrElements = element.querySelectorAll('hr');

  if (hrElements.length === 0) {
    // 没有分割线，返回整个元素
    return [element];
  }

  // 克隆原始元素以获取样式
  const clone = element.cloneNode(true) as HTMLElement;
  const children = Array.from(clone.children);

  let currentSection = createSectionElement(element);

  for (const child of children) {
    if (child.tagName === 'HR') {
      // 遇到分割线，保存当前部分并开始新部分
      if (currentSection.children.length > 0) {
        sections.push(currentSection);
      }
      currentSection = createSectionElement(element);
    } else {
      currentSection.appendChild(child.cloneNode(true));
    }
  }

  // 添加最后一个部分
  if (currentSection.children.length > 0) {
    sections.push(currentSection);
  }

  return sections;
};

// 创建分割后的 section 元素
const createSectionElement = (originalElement: HTMLElement): HTMLElement => {
  const section = document.createElement('div');
  section.className = originalElement.className;
  section.style.cssText = originalElement.style.cssText;
  section.style.padding = originalElement.style.padding || '24px';
  section.style.width = originalElement.style.width || '100%';
  section.style.maxWidth = originalElement.style.maxWidth || '100%';
  return section;
};

// 按高度自适应分割内容
const splitContentByHeight = (
  element: HTMLElement,
  maxHeight: number
): HTMLElement[] => {
  const sections: HTMLElement[] = [];
  const children = Array.from(element.children);

  if (children.length === 0) {
    return [element];
  }

  let currentSection = createSectionElement(element);
  let currentHeight = 0;
  const padding = parseInt(element.style.padding) || 24;
  const availableHeight = maxHeight - padding * 2;

  for (const child of children) {
    const childHeight = (child as HTMLElement).offsetHeight || 50;

    if (currentHeight + childHeight > availableHeight && currentSection.children.length > 0) {
      // 当前部分已满，保存并开始新部分
      sections.push(currentSection);
      currentSection = createSectionElement(element);
      currentHeight = 0;
    }

    currentSection.appendChild(child.cloneNode(true));
    currentHeight += childHeight;
  }

  // 添加最后一个部分
  if (currentSection.children.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [element];
};

// 导出单张分割后的图片
const exportSectionAsImage = async (
  section: HTMLElement,
  filename: string,
  baseScale: number,
  bgColor: string,
  fixedSize?: { width: number; height: number }
): Promise<void> => {
  // 临时添加到 DOM 以便渲染
  section.style.position = 'absolute';
  section.style.left = '-9999px';
  section.style.top = '0';
  document.body.appendChild(section);

  try {
    const canvas = await html2canvas(section, {
      scale: baseScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: bgColor,
      scrollY: 0,
      scrollX: 0,
      windowWidth: fixedSize ? fixedSize.width : section.scrollWidth,
      windowHeight: section.scrollHeight,
    });

    let finalCanvas = canvas;

    // 如果指定了固定尺寸，创建固定尺寸画布
    if (fixedSize) {
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = fixedSize.width * baseScale;
      targetCanvas.height = fixedSize.height * baseScale;
      const ctx = targetCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

        // 计算缩放比例
        const scaleX = targetCanvas.width / canvas.width;
        const scaleY = targetCanvas.height / canvas.height;
        const scale = Math.min(scaleX, scaleY, 1); // 不放大

        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        const x = (targetCanvas.width - scaledWidth) / 2;
        const y = (targetCanvas.height - scaledHeight) / 2;

        ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
        finalCanvas = targetCanvas;
      }
    }

    // 转换为 Blob 并下载
    return new Promise((resolve, reject) => {
      finalCanvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${filename}.png`);
          resolve();
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png', 1.0);
    });
  } finally {
    // 清理临时元素
    document.body.removeChild(section);
  }
};

// 导出小红书图片（支持多图和分割模式）
export const exportAsXiaohongshuImage = async (
  element: HTMLElement,
  filename: string = 'xiaohongshu',
  backgroundColor: string = '#ffffff',
  margin: number = 24,
  size: XiaohongshuSize = 'vertical',
  splitMode: XiaohongshuSplitMode = 'hr'
): Promise<{ count: number; message: string }> => {
  const sizeConfig = xiaohongshuSizeOptions.find(opt => opt.value === size);
  if (!sizeConfig) throw new Error('无效的小红书图片尺寸');

  const bgColor = backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;
  const baseScale = Math.max(window.devicePixelRatio * 2, 3);

  // 设置元素宽度
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalPadding = element.style.padding;

  element.style.width = `${sizeConfig.width}px`;
  element.style.maxWidth = `${sizeConfig.width}px`;
  element.style.padding = `${margin}px`;

  try {
    let sections: HTMLElement[];

    // 根据分割模式选择分割方式
    switch (splitMode) {
      case 'hr': {
        // 按分割线分割
        const hrElements = element.querySelectorAll('hr');
        if (hrElements.length > 0) {
          sections = splitContentByHr(element);
        } else if (typeof sizeConfig.height === 'number') {
          // 没有分割线时，按高度自适应分割
          sections = splitContentByHeight(element, sizeConfig.height);
        } else {
          sections = [element];
        }
        break;
      }

      case 'auto':
      default:
        // 自适应分割（按高度）
        if (typeof sizeConfig.height === 'number') {
          sections = splitContentByHeight(element, sizeConfig.height);
        } else {
          sections = [element];
        }
        break;
    }

    // 限制最多9张图（小红书限制）
    const maxImages = 9;
    if (sections.length > maxImages) {
      sections = sections.slice(0, maxImages);
    }

    // 导出每张图片
    for (let i = 0; i < sections.length; i++) {
      const sectionFilename = sections.length === 1 ? filename : `${filename}_${i + 1}`;

      if (sections[i] === element) {
        // 如果是原始元素，使用普通导出
        await exportAsImage(
          element,
          sectionFilename,
          'high',
          backgroundColor,
          margin,
          { width: sizeConfig.width, height: sizeConfig.height }
        );
      } else {
        // 分割后的部分
        await exportSectionAsImage(
          sections[i],
          sectionFilename,
          baseScale,
          bgColor,
          typeof sizeConfig.height === 'number'
            ? { width: sizeConfig.width, height: sizeConfig.height }
            : undefined
        );
      }

      // 添加小延迟确保文件下载完成
      if (i < sections.length - 1) {
        await delay(300);
      }
    }

    const message = sections.length === 1
      ? '小红书图片已导出'
      : `已导出 ${sections.length} 张小红书图片`;

    return { count: sections.length, message };
  } finally {
    // 恢复原始样式
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.padding = originalPadding;
  }
};
