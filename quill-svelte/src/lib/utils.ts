/* ══════════════════════════════════════════
   Quill — Utility Functions
   ══════════════════════════════════════════ */

/**
   * Generate a simple UUID v4.
   */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
  * Format a timestamp for display.
  */
export function formatTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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
}

/**
  * Format a timestamp as time only (HH:MM).
  */
export function formatTimeShort(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
   * Convert basic markdown-like text to HTML for prose display.
   * Handles: paragraphs, bold, italic, line breaks, blockquotes.
   */
export function proseToHtml(text: string): string {
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
}

/**
  * Escape HTML to prevent XSS.
  */
export function escapeHtml(text: string): string {

  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}

/**
  * Debounce a function.
  */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
  * Get the type icon for a card type.
  */
export function cardTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    character: '👤',
    relationship: '💞',
    plot: '📖',
    world: '🌍',
    arc: '📐',
  };
  return icons[type] || '📝';
}

/**
  * Get the type label for a card type.
  */
export function cardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    character: 'Characters',
    relationship: 'Relationships',
    plot: 'Plot Threads',
    world: 'World & Setting',
    arc: 'Story Arc',
  };
  return labels[type] || type;
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '…';
}



