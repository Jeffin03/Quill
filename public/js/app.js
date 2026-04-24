/* ══════════════════════════════════════════
   Quill — Main Application
   ══════════════════════════════════════════ */

window.QuillApp = {
  currentStory: null,
  treePanelVisible: true,
  cardsPanelVisible: true,

  /**
   * Initialize the application.
   */
  init() {
    // Initialize modules
    QuillStoryList.init();
    QuillChat.init();
    QuillCards.init();
    QuillTree.init();

    // Bind global UI events
    this.bindEvents();

    // Show story list view by default
    this.showView('story-list-view');
  },

  /**
   * Bind all global event handlers.
   */
  bindEvents() {
    // New Story button
    document.getElementById('btn-new-story').addEventListener('click', () => {
      this.openModal('modal-new-story');
    });

    // Create Story (in modal)
    document.getElementById('btn-create-story').addEventListener('click', () => {
      this.createStory();
    });

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.openSettingsModal();
    });

    // Story settings button (in workspace)
    document.getElementById('btn-story-settings').addEventListener('click', () => {
      this.openSettingsModal();
    });

    // Save settings
    document.getElementById('btn-save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Back to stories
    document.getElementById('btn-back').addEventListener('click', () => {
      this.currentStory = null;
      this.showView('story-list-view');
      QuillStoryList.loadStories();
    });

    // Toggle tree panel
    document.getElementById('btn-toggle-tree').addEventListener('click', () => {
      this.toggleTreePanel();
    });

    // Toggle cards panel
    document.getElementById('btn-toggle-cards').addEventListener('click', () => {
      this.toggleCardsPanel();
    });

    // Add card button
    document.getElementById('btn-add-card').addEventListener('click', () => {
      this.openAddCardModal();
    });

    // Save card (add card modal)
    document.getElementById('btn-save-card').addEventListener('click', () => {
      this.saveNewCard();
    });

    // Magic cards button
    document.getElementById('btn-magic-cards').addEventListener('click', () => {
      this.openModal('modal-magic-cards');
    });

    // Generate magic cards
    document.getElementById('btn-generate-magic').addEventListener('click', () => {
      this.generateMagicCards();
    });

    // Add field button (in card modal)
    document.getElementById('btn-add-field').addEventListener('click', () => {
      QuillCards.addFieldRow();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-footer .btn-ghost[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        if (modalId) this.closeModal(modalId);
      });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });

    // Close mobile side panels on overlay click
    const mobileOverlay = document.getElementById('mobile-overlay');
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        if (this.treePanelVisible) this.toggleTreePanel();
        if (this.cardsPanelVisible) this.toggleCardsPanel();
      });
    }

    // Story title editing (debounced save)
    const titleEl = document.getElementById('story-title');
    titleEl.addEventListener('blur', () => {
      if (this.currentStory) {
        const newTitle = titleEl.textContent.trim();
        if (newTitle && newTitle !== this.currentStory.title) {
          this.currentStory.title = newTitle;
          QuillAPI.updateStory(this.currentStory.id, { title: newTitle });
        }
      }
    });

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });
  },

  /**
   * Switch between views.
   */
  showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
  },

  /**
   * Open a story by ID.
   */
  async openStory(id) {
    try {
      const story = await QuillAPI.getStory(id);
      this.currentStory = story;

      // Update header
      document.getElementById('story-title').textContent = story.title;
      document.getElementById('story-genre').textContent = story.settings?.genre || 'fiction';
      document.getElementById('story-pacing').textContent = story.settings?.pacing || 'natural';

      // Render all panels
      QuillChat.render(story);
      QuillCards.render(story.cards || []);
      QuillTree.render(story);

      // Switch to workspace view
      this.showView('workspace-view');

      // Auto-collapse panels on mobile
      if (window.innerWidth <= 768) {
        if (this.treePanelVisible) this.toggleTreePanel();
        if (this.cardsPanelVisible) this.toggleCardsPanel();
      }

      // Focus chat input
      setTimeout(() => document.getElementById('chat-input').focus(), 100);
    } catch (err) {
      console.error('Failed to open story:', err);
      alert('Failed to open story. It may have been deleted.');
    }
  },

  /**
   * Create a new story from modal inputs.
   */
  async createStory() {
    const title = document.getElementById('input-story-title').value.trim() || 'Untitled Story';
    const genre = document.getElementById('input-story-genre').value;
    const pacing = document.getElementById('input-story-pacing').value;
    const tone = document.getElementById('input-story-tone').value.trim() || 'atmospheric';

    try {
      const story = await QuillAPI.createStory({ title, genre, pacing, tone });
      this.closeModal('modal-new-story');

      // Reset form
      document.getElementById('input-story-title').value = '';
      document.getElementById('input-story-tone').value = 'atmospheric';

      // Open the new story
      this.openStory(story.id);
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Failed to create story.');
    }
  },

  /**
   * Toggle the tree panel visibility.
   */
  toggleTreePanel() {
    const panel = document.getElementById('tree-panel');
    const btn = document.getElementById('btn-toggle-tree');
    const overlay = document.getElementById('mobile-overlay');
    
    this.treePanelVisible = !this.treePanelVisible;
    panel.classList.toggle('collapsed', !this.treePanelVisible);
    btn.classList.toggle('active', this.treePanelVisible);
    
    if (window.innerWidth <= 768) {
      if (this.treePanelVisible) {
        if (this.cardsPanelVisible) this.toggleCardsPanel();
        if (overlay) overlay.classList.add('active');
      } else if (!this.cardsPanelVisible) {
        if (overlay) overlay.classList.remove('active');
      }
    }
  },

  /**
   * Toggle the cards panel visibility.
   */
  toggleCardsPanel() {
    const panel = document.getElementById('cards-panel');
    const btn = document.getElementById('btn-toggle-cards');
    const overlay = document.getElementById('mobile-overlay');
    
    this.cardsPanelVisible = !this.cardsPanelVisible;
    panel.classList.toggle('collapsed', !this.cardsPanelVisible);
    btn.classList.toggle('active', this.cardsPanelVisible);
    
    if (window.innerWidth <= 768) {
      if (this.cardsPanelVisible) {
        if (this.treePanelVisible) this.toggleTreePanel();
        if (overlay) overlay.classList.add('active');
      } else if (!this.treePanelVisible) {
        if (overlay) overlay.classList.remove('active');
      }
    }
  },

  /**
   * Open a modal by ID.
   */
  openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  },

  /**
   * Close a modal by ID.
   */
  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  },

  /**
   * Open the settings modal with current config.
   */
  async openSettingsModal() {
    try {
      const config = await QuillAPI.getConfig();
      document.getElementById('input-llm-url').value = config.apiUrl || '';
      document.getElementById('input-llm-model').value = config.model || '';
      document.getElementById('input-llm-key').value = '';
      document.getElementById('input-llm-tokens').value = config.maxTokens || 2048;
      document.getElementById('input-llm-temp').value = config.temperature || 0.85;
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    this.openModal('modal-settings');
  },

  /**
   * Save settings from the modal.
   */
  async saveSettings() {
    const data = {
      apiUrl: document.getElementById('input-llm-url').value.trim(),
      model: document.getElementById('input-llm-model').value.trim(),
      maxTokens: parseInt(document.getElementById('input-llm-tokens').value),
      temperature: parseFloat(document.getElementById('input-llm-temp').value),
    };

    const apiKey = document.getElementById('input-llm-key').value;
    if (apiKey) data.apiKey = apiKey;

    try {
      await QuillAPI.updateConfig(data);
      this.closeModal('modal-settings');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings.');
    }
  },

  /**
   * Open the add card modal (fresh state).
   */
  openAddCardModal() {
    const saveBtn = document.getElementById('btn-save-card');
    saveBtn.textContent = 'Add Card';
    saveBtn.onclick = () => this.saveNewCard();

    document.getElementById('input-card-type').value = 'character';
    document.getElementById('input-card-title').value = '';
    document.getElementById('card-fields-list').innerHTML = '';
    QuillCards.addFieldRow();

    this.openModal('modal-add-card');
  },

  /**
   * Save a new card from the modal.
   */
  async saveNewCard() {
    const storyId = this.currentStory?.id;
    if (!storyId) return;

    const type = document.getElementById('input-card-type').value;
    const title = document.getElementById('input-card-title').value.trim();
    if (!title) {
      alert('Please enter a card title.');
      return;
    }

    const fields = {};
    document.querySelectorAll('#card-fields-list .field-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const k = inputs[0].value.trim();
      const v = inputs[1].value.trim();
      if (k) fields[k] = v;
    });

    try {
      const card = await QuillAPI.createCard(storyId, { type, title, fields });
      this.currentStory.cards.push(card);
      QuillCards.render(this.currentStory.cards);
      this.closeModal('modal-add-card');
    } catch (err) {
      console.error('Failed to create card:', err);
      alert('Failed to create card.');
    }
  },

  /**
   * Generate cards automatically from a premise.
   */
  async generateMagicCards() {
    const storyId = this.currentStory?.id;
    if (!storyId) return;

    const premiseEl = document.getElementById('input-magic-premise');
    const premise = premiseEl.value.trim();
    if (!premise) {
      alert('Please paste a premise or prologue first.');
      return;
    }

    const btn = document.getElementById('btn-generate-magic');
    btn.disabled = true;
    btn.textContent = 'Analyzing and Generating... (This may take a minute)';

    try {
      const newCards = await QuillAPI.generateCardsFromPremise(storyId, premise);
      
      // Update local state
      this.currentStory.cards = newCards;
      QuillCards.render(newCards);
      
      this.closeModal('modal-magic-cards');
      premiseEl.value = ''; // clear for next time
    } catch (err) {
      console.error('Failed to generate magic cards:', err);
      alert('Failed to generate cards. The AI might have timed out.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate Cards';
    }
  },
};

// ── Boot ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  QuillApp.init();
});
