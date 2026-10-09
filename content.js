(function () {
  'use strict';

  if (window.__mercorJDcopierInitialized) {
    return;
  }
  window.__mercorJDcopierInitialized = true;

  if (!/\/jobs\//.test(window.location.pathname)) {
    return;
  }

  const STOP_PATTERNS = [
    /^earn\s+up\s+to\s+\$?/i,
    /^referral\s*link|referral\s+link\s+below/i,
    /^posted\s+\d+/i,
    /^one\s+interview/i
  ];

  const ABOUT_PATTERNS = [
    /^about\b/i,
    /^about\s+mercor\b/i,
    /^about\s+cincinnatus\b/i
  ];

  function normalizeText(text) {
    return text
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getMainContainer() {
    const candidates = [
      'main',
      '[role="main"]',
      'article',
      'body'
    ];

    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (!node) {
        continue;
      }
      if (node.querySelectorAll('h1, h2, p, ul, ol, li').length > 0) {
        return node;
      }
    }

    return document.body;
  }

  function isStopHeading(text) {
    return STOP_PATTERNS.some((pattern) => pattern.test(text));
  }

  function isAboutHeading(text) {
    return ABOUT_PATTERNS.some((pattern) => pattern.test(text));
  }

  function extractListText(listNode) {
    const items = Array.from(listNode.querySelectorAll(':scope > li'))
      .map((li) => normalizeText(li.innerText))
      .filter(Boolean)
      .map((line) => `- ${line}`);
    return items.join('\n');
  }

  function extractJobDescription() {
    const container = getMainContainer();
    const headingLevel = (tagName) => parseInt(tagName.slice(1), 10);
    const nodes = Array.from(
      container.querySelectorAll('h1, h2, h3, h4, p, ul, ol')
    ).filter((node) => {
      const text = normalizeText(node.innerText);
      if (!text) {
        return false;
      }
      const tagName = node.tagName.toLowerCase();
      if ((tagName === 'ul' || tagName === 'ol') && node.querySelectorAll(':scope > li').length === 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    let startIndex = -1;
    for (let i = 0; i < nodes.length; i += 1) {
      const tag = nodes[i].tagName.toLowerCase();
      if (tag === 'h1') {
        startIndex = i;
        break;
      }
    }

    if (startIndex < 0) {
      return { ok: false, text: '', message: 'Could not find the job heading on this page.' };
    }

    const lines = [];
    let inAboutSection = false;
    let aboutHeadingLevel = 0;

    for (let i = startIndex; i < nodes.length; i += 1) {
      const node = nodes[i];
      const tag = node.tagName.toLowerCase();
      const text = normalizeText(node.innerText);

      if (!text) {
        continue;
      }

      if ((tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') && isAboutHeading(text)) {
        if (inAboutSection) {
          if (lines.length) {
            lines.push('');
          }
          lines.push(text);
          continue;
        }

        inAboutSection = true;
        aboutHeadingLevel = headingLevel(tag);
        if (lines.length) {
          lines.push('');
        }
        lines.push(text);
        continue;
      }

      if ((tag === 'h2' || tag === 'h3' || tag === 'h4') && isStopHeading(text)) {
        break;
      }

      if (inAboutSection && headingLevel(tag) <= aboutHeadingLevel) {
        break;
      }

      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        if (lines.length) {
          lines.push('');
        }
        lines.push(text);
        continue;
      }

      if (tag === 'p') {
        lines.push(text);
        continue;
      }

      if (tag === 'ul' || tag === 'ol') {
        const listText = extractListText(node);
        if (listText) {
          lines.push(listText);
        }
      }
    }

    const text = lines.join('\n\n').trim();

    if (!text) {
      return { ok: false, text: '', message: 'Nothing to copy from this page.' };
    }

    return { ok: true, text };
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fall through to legacy copy
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.right = '24px';
    toast.style.top = '120px';
    toast.style.padding = '8px 12px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '13px';
    toast.style.color = '#fff';
    toast.style.background = type === 'success' ? '#0f9d58' : '#d64545';
    toast.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.2)';
    toast.style.zIndex = '2147483647';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 180ms ease';
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    window.setTimeout(() => {
      toast.style.opacity = '0';
      window.setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 220);
    }, 1300);
  }

  function ensureGlowStyle() {
    const styleId = 'mercor-jd-copy-fab-style';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes mercorGlow {
        0% {
          box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6), 0 10px 26px rgba(15, 157, 88, 0.5);
        }
        70% {
          box-shadow: 0 0 0 14px rgba(22, 163, 74, 0), 0 10px 26px rgba(15, 157, 88, 0.5);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(22, 163, 74, 0), 0 10px 26px rgba(15, 157, 88, 0.5);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #mercor-jd-copy-fab {
          animation: none !important;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function buildButton() {
    ensureGlowStyle();

    const existing = document.getElementById('mercor-jd-copy-fab');
    if (existing) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'mercor-jd-copy-fab';
    button.type = 'button';
    button.setAttribute('aria-label', 'Copy job description');
    button.style.position = 'fixed';
    button.style.right = '18px';
    button.style.top = '42%';
    button.style.transform = 'translateY(-50%)';
    button.style.width = '58px';
    button.style.height = '58px';
    button.style.borderRadius = '999px';
    button.style.border = '1px solid rgba(255, 255, 255, 0.25)';
    button.style.background = 'linear-gradient(145deg, #22c55e, #0f9d58)';
    button.style.color = '#ffffff';
    button.style.cursor = 'pointer';
    button.style.fontWeight = '700';
    button.style.fontSize = '15px';
    button.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    button.style.boxShadow = '0 10px 26px rgba(15, 157, 88, 0.52)';
    button.style.zIndex = '2147483647';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.gap = '4px';
    button.style.outline = 'none';
    button.style.opacity = '0.98';
    button.style.transition = 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease';
    button.style.backdropFilter = 'blur(4px)';
    button.style.animation = 'mercorGlow 1.9s ease-in-out infinite';

    const ring = document.createElement('span');
    ring.textContent = '✉';
    ring.style.fontSize = '19px';
    ring.style.position = 'relative';
    ring.style.top = '-1px';
    button.appendChild(ring);

    const label = document.createElement('span');
    label.textContent = 'JD';
    label.style.fontSize = '11px';
    label.style.fontWeight = '600';
    label.style.letterSpacing = '0.02em';
    button.appendChild(label);

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-50%) scale(1.06)';
      button.style.opacity = '1';
      button.style.boxShadow = '0 14px 30px rgba(15, 157, 88, 0.55)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(-50%) scale(1)';
      button.style.opacity = '0.98';
      button.style.boxShadow = '0 10px 26px rgba(15, 157, 88, 0.52)';
    });

    button.addEventListener('click', async () => {
      button.disabled = true;
      const result = extractJobDescription();

      if (!result.ok) {
        showToast(result.message || 'Unable to copy job description.', 'error');
        button.disabled = false;
        return;
      }

      const copied = await copyToClipboard(result.text);
      if (copied) {
        showToast('Job description copied to clipboard ✅');
      } else {
        showToast('Copy blocked by browser. Try again.', 'error');
      }
      button.disabled = false;
    });

    document.body.appendChild(button);
  }

  function initWhenReady() {
    if (document.body && document.body.children.length > 0) {
      buildButton();
      return;
    }
    window.setTimeout(initWhenReady, 120);
  }

  initWhenReady();
})();
