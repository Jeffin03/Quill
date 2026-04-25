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
    QuillQR.init();
    QuillToast.init();
    this.checkUpdates();
    this.startHeartbeat();

    // Bind global UI events
    this.bindEvents();

    // Show story list view by default
    this.showView('story-list-view');
  },

  /**
   * Bind all global event handlers.
   */
  bindEvents() {
    const safeBind = (id, event, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, fn);
      else console.warn(`[SafeBind] Element not found: ${id}`);
    };

    // New Story button
    safeBind('btn-new-story', 'click', () => {
      this.openModal('modal-new-story');
    });

    // Create Story (in modal)
    safeBind('btn-create-story', 'click', () => {
      this.createStory();
    });

    // Settings button
    safeBind('btn-settings', 'click', () => {
      this.openSettingsModal();
    });

    // Story settings button (in workspace)
    safeBind('btn-story-settings', 'click', () => {
      this.openStorySettingsModal();
    });

    // Save story settings
    safeBind('btn-save-story-settings', 'click', () => {
      this.saveStorySettings();
    });

    // Save settings
    safeBind('btn-save-settings', 'click', () => {
      this.saveSettings();
    });

    // Home connection status pill click
    safeBind('home-connection-status', 'click', () => {
      this.openSettingsModal();
    });

    // Back to stories
    safeBind('btn-back', 'click', () => {
      this.currentStory = null;
      this.showView('story-list-view');
      QuillStoryList.loadStories();
    });

    // Import story from JSON file
    safeBind('btn-import-story', 'click', async () => {
      try {
        const story = await QuillDB.importStory();
        QuillStoryList.loadStories();
        QuillToast.show(`"${story.title}" imported successfully!`, 'success');
      } catch (err) {
        if (err.message !== 'No file selected') {
          QuillToast.show('Failed to import: ' + err.message, 'error');
        }
      }
    });

    // Toggle tree panel
    safeBind('btn-toggle-tree', 'click', () => {
      this.toggleTreePanel();
    });

    // Toggle cards panel
    safeBind('btn-toggle-cards', 'click', () => {
      this.toggleCardsPanel();
    });

    // Add card button
    safeBind('btn-add-card', 'click', () => {
      this.openAddCardModal();
    });

    // Save card (add card modal)
    safeBind('btn-save-card', 'click', () => {
      this.saveNewCard();
    });

    // Magic cards button
    safeBind('btn-magic-cards', 'click', () => {
      this.openModal('modal-magic-cards');
    });

    // Generate magic cards
    safeBind('btn-generate-magic', 'click', () => {
      this.generateMagicCards();
    });

    // Add field button (in card modal)
    safeBind('btn-add-field', 'click', () => {
      QuillCards.addFieldRow();
    });

    // Modal close buttons (querySelectorAll is inherently safe)
    document.querySelectorAll('.modal-close, .modal-footer .btn-ghost[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        if (modalId) {
          this.closeModal(modalId);
          if (modalId === 'modal-settings') QuillQR.stopScanner();
        }
      });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
          QuillQR.stopScanner(); 
        }
      });
    });

    // Story title editing
    const titleEl = document.getElementById('story-title');
    if (titleEl) {
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
    }
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
   * Open story-specific settings.
   */
  openStorySettingsModal() {
    if (!this.currentStory) return;
    document.getElementById('edit-story-genre').value = this.currentStory.settings?.genre || 'general fiction';
    document.getElementById('edit-story-pacing').value = this.currentStory.settings?.pacing || 'natural';
    document.getElementById('edit-story-tone').value = this.currentStory.settings?.tone || 'atmospheric';
    this.openModal('modal-story-settings');
  },

  /**
   * Save story-specific settings.
   */
  async saveStorySettings() {
    if (!this.currentStory) return;
    const settings = {
      genre: document.getElementById('edit-story-genre').value,
      pacing: document.getElementById('edit-story-pacing').value,
      tone: document.getElementById('edit-story-tone').value.trim() || 'atmospheric'
    };

    try {
      await QuillAPI.updateStory(this.currentStory.id, { settings });
      this.currentStory.settings = settings;
      
      // Update UI
      document.getElementById('story-genre').textContent = settings.genre;
      document.getElementById('story-pacing').textContent = settings.pacing;
      
      this.closeModal('modal-story-settings');
      QuillToast.show('Story settings updated!');
    } catch (err) {
      console.error('Failed to save story settings:', err);
      QuillToast.show('Failed to save settings', 'error');
    }
  },

  /**
   * Generate cards from a premise using AI.
   */
  async generateMagicCards() {
    const premise = document.getElementById('input-magic-premise').value.trim();
    if (!premise) {
      alert('Please enter a premise or some story text first!');
      return;
    }

    const btn = document.getElementById('btn-generate-magic');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Analyzing...';

    try {
      const storyId = this.currentStory?.id;
      if (!storyId) throw new Error('No active story');

      const newCards = await QuillAPI.generateCardsFromPremise(storyId, premise);
      
      // Update local state
      this.currentStory.cards = newCards;
      QuillCards.render(newCards);
      
      this.closeModal('modal-magic-cards');
      QuillToast.show(`Generated ${newCards.length} context cards!`, 'success');
      
      // Reset input
      document.getElementById('input-magic-premise').value = '';
    } catch (err) {
      console.error('Magic cards failure:', err);
      QuillToast.show('Failed to generate cards: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },

  /**
   * Check for PWA updates.
   */
  checkUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        QuillToast.show('New version available! Refresh to update.', 'info', 0, () => {
          window.location.reload();
        });
      });
    }
  },
  /**
   * Check if the LLM server is reachable.
   */
  async checkConnection() {
    const statusEl = document.getElementById('connection-status');
    const homeStatusEl = document.getElementById('home-connection-status');
    const homeStatusText = homeStatusEl?.querySelector('.status-text');

    try {
      const config = await QuillAPI.getConfig();
      if (!config.apiUrl) {
        if (statusEl) statusEl.className = 'connection-status';
        if (homeStatusEl) {
          homeStatusEl.className = 'connection-status-pill offline';
          if (homeStatusText) homeStatusText.textContent = 'LLM: Not Configured';
        }
        return;
      }

      // Ping Ollama (or any OpenAI compatible /v1 endpoint)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const resp = await fetch(config.apiUrl.replace(/\/v1\/?$/, '') + '/api/tags', {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (resp.ok) {
          if (statusEl) statusEl.className = 'connection-status online';
          if (homeStatusEl) {
            homeStatusEl.className = 'connection-status-pill online';
            if (homeStatusText) homeStatusText.textContent = 'LLM: Online';
          }
        } else {
          throw new Error('Not OK');
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (statusEl) statusEl.className = 'connection-status offline';
        if (homeStatusEl) {
          homeStatusEl.className = 'connection-status-pill offline';
          if (homeStatusText) homeStatusText.textContent = 'LLM: Offline';
        }
      }
    } catch (err) {
      if (statusEl) statusEl.className = 'connection-status offline';
      if (homeStatusEl) {
        homeStatusEl.className = 'connection-status-pill offline';
        if (homeStatusText) homeStatusText.textContent = 'LLM: Offline';
      }
    }
  },

  /**
   * Start periodic connection checks.
   */
  startHeartbeat() {
    this.checkConnection();
    setInterval(() => this.checkConnection(), 15000);
  },
};

/**
 * Simple Toast Notification System
 */
window.QuillToast = {
  init() {
    this.container = document.getElementById('toast-container');
  },
  show(message, type = 'info', duration = 4000, onClick = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">${message}</div>
      <button class="toast-close">×</button>
    `;
    
    if (onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toast-close')) onClick();
      });
    }

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(toast);
    });

    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
  },
  remove(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }
};

// ── Boot ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  QuillApp.init();
});
