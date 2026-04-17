/* ══════════════════════════════════════════
   Quill — Story List Module
   ══════════════════════════════════════════ */

window.QuillStoryList = {
  /**
   * Initialize the story list view.
   */
  init() {
    this.grid = document.getElementById('stories-grid');
    this.emptyState = document.getElementById('empty-state');
    this.loadStories();
  },

  /**
   * Load and render all stories.
   */
  async loadStories() {
    try {
      const stories = await QuillAPI.listStories();
      this.render(stories);
    } catch (err) {
      console.error('Failed to load stories:', err);
      this.render([]);
    }
  },

  /**
   * Render story cards in the grid.
   */
  render(stories) {
    this.grid.innerHTML = '';

    if (stories.length === 0) {
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    stories.forEach((story, i) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <h4 class="story-card-title">${QuillUtils.escapeHtml(story.title)}</h4>
        <div class="story-card-meta">
          <span class="meta-badge">${QuillUtils.escapeHtml(story.genre || 'fiction')}</span>
          <span class="meta-badge">${QuillUtils.escapeHtml(story.pacing || 'natural')}</span>
        </div>
        <div class="story-card-stats">
          ${story.messageCount} messages · ${story.cardCount || 0} cards · ${QuillUtils.formatTime(story.updatedAt)}
        </div>
        <button class="story-card-delete" data-id="${story.id}" title="Delete story">🗑</button>
      `;

      // Open story on click
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('story-card-delete')) return;
        QuillApp.openStory(story.id);
      });

      // Delete button
      const deleteBtn = card.querySelector('.story-card-delete');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${story.title}"? This cannot be undone.`)) {
          try {
            await QuillAPI.deleteStory(story.id);
            this.loadStories();
          } catch (err) {
            console.error('Failed to delete story:', err);
          }
        }
      });

      this.grid.appendChild(card);
    });
  },
};
