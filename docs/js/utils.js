/* ══════════════════════════════════════════
   Quill — Utility Functions
   ══════════════════════════════════════════ */

window.QuillUtils = {
  /**
   * Generate a simple UUID v4.
   */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  /**
   * Format a timestamp for display.
   */
  formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  },

  /**
   * Format a timestamp as time only (HH:MM).
   */
  formatTimeShort(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  },

  /**
   * Convert basic markdown-like text to HTML for prose display.
   * Handles: paragraphs, bold, italic, line breaks, blockquotes.
   */
  proseToHtml(text) {
    if (!text) return '';

    // Split into paragraphs on double newlines
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map(p => {
      let html = p.trim();
      if (!html) return '';

      // Blockquotes
      if (html.startsWith('>')) {
        const quoteContent = html.replace(/^>\s*/gm, '');
        return `<blockquote>${quoteContent}</blockquote>`;
      }

      // Inline formatting
      html = html
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>');

      // Single newlines to <br>
      html = html.replace(/\n/g, '<br>');

      return `<p>${html}</p>`;
    }).filter(Boolean).join('\n');
  },

  /**
   * Escape HTML to prevent XSS.
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Debounce a function.
   */
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Get the type icon for a card type.
   */
  cardTypeIcon(type) {
    const icons = {
      character: '👤',
      relationship: '💞',
      plot: '📖',
      world: '🌍',
      arc: '📐',
    };
    return icons[type] || '📝';
  },

  /**
   * Get the type label for a card type.
   */
  cardTypeLabel(type) {
    const labels = {
      character: 'Characters',
      relationship: 'Relationships',
      plot: 'Plot Threads',
      world: 'World & Setting',
      arc: 'Story Arc',
    };
    return labels[type] || type;
  },

  /**
   * Truncate text to a max length with ellipsis.
   */
  truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + '…';
  },
};
