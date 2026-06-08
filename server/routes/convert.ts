import { Router } from 'express';
import { templates, getTemplateById } from '../templates';
import { renderStyledMarkdown, renderInlineStyledMarkdown } from '../utils/styling';
import { generateEmailHtml } from '../utils/email';

const router = Router();

/**
 * @route POST /api/convert/html
 * @desc Convert Markdown to styled HTML
 */
router.post('/html', (req, res) => {
  try {
    const { markdown, templateId, fontSize, margin, backgroundColor } = req.body;

    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'markdown is required',
      });
    }

    const template = getTemplateById(templateId || 'general-modern');
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Template not found',
      });
    }

    const settings = {
      fontSize: fontSize || 16,
      margin: margin || 24,
      backgroundColor: backgroundColor || '#ffffff',
    };

    const styledHtml = renderStyledMarkdown(markdown, template, settings);

    res.json({
      success: true,
      data: {
        html: styledHtml,
        template: {
          id: template.id,
          name: template.name,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    });
  }
});

/**
 * @route POST /api/convert/email
 * @desc Convert Markdown to email-compatible HTML
 */
router.post('/email', (req, res) => {
  try {
    const { markdown, templateId, fontSize, backgroundColor } = req.body;

    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'markdown is required',
      });
    }

    const template = getTemplateById(templateId || 'email-business');
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Template not found',
      });
    }

    const settings = {
      fontSize: fontSize || 16,
      backgroundColor: backgroundColor || '#ffffff',
    };

    const emailHtml = generateEmailHtml(markdown, template, settings);

    res.json({
      success: true,
      data: {
        html: emailHtml,
        template: {
          id: template.id,
          name: template.name,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    });
  }
});

/**
 * @route POST /api/convert/wechat
 * @desc Convert Markdown to WeChat-compatible HTML (inline styles)
 */
router.post('/wechat', (req, res) => {
  try {
    const { markdown, templateId, fontSize, margin, backgroundColor } = req.body;

    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'markdown is required',
      });
    }

    const template = getTemplateById(templateId || 'wechat-tech');
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Template not found',
      });
    }

    const settings = {
      fontSize: fontSize || 15,
      margin: margin || 24,
      backgroundColor: backgroundColor || '#ffffff',
    };

    const inlineStyledHtml = renderInlineStyledMarkdown(markdown, template, settings);

    res.json({
      success: true,
      data: {
        html: inlineStyledHtml,
        template: {
          id: template.id,
          name: template.name,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    });
  }
});

/**
 * @route POST /api/convert/plain
 * @desc Convert Markdown to plain HTML (no styles)
 */
router.post('/plain', async (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'markdown is required',
      });
    }

    const { parseEnhancedMarkdown } = await import('../../src/utils/enhancedMarkdown');
    const html = parseEnhancedMarkdown(markdown);

    res.json({
      success: true,
      data: { html },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    });
  }
});

/**
 * @route GET /api/convert/templates
 * @desc Get all available templates
 */
router.get('/templates', (_req, res) => {
  res.json({
    success: true,
    data: templates.map((t) => ({
      id: t.id,
      name: t.name,
      format: t.format,
      description: t.description,
      themeColors: t.themeColors,
    })),
  });
});

export default router;
