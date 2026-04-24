/* ══════════════════════════════════════════
   Quill — Context Cards Module
   ══════════════════════════════════════════ */

window.QuillCards = {
  previousCardIds: new Set(),

  /**
   * Initialize the cards module.
   */
  init() {
    this.container = document.getElementById('cards-content');
    this.emptyEl = document.getElementById('cards-empty');
    this.headerEl = document.querySelector('#cards-panel .panel-header h3');
    this.originalHeader = this.headerEl.textContent;
  },

  /**
   * Toggle the syncing state (visual feedback).
   */
  setSyncing(isSyncing) {
    if (isSyncing) {
      this.headerEl.innerHTML = `${this.originalHeader} <span class="sync-indicator">Syncing...</span>`;
      this.container.classList.add('syncing');
    } else {
      this.headerEl.textContent = this.originalHeader;
      this.container.classList.remove('syncing');
    }
  },

  /**
   * Render all context cards grouped by type.
   */
  render(cards) {
    // Track previous state for "updated" animation
    const previousCardsMap = new Map(
      (QuillApp.currentStory?.cards || []).map(c => [c.id, JSON.stringify(c.fields)])
    );

    this.container.innerHTML = '';

    if (!cards || cards.length === 0) {
      this.container.innerHTML = `
        <div class="cards-empty">
          <p>Cards will appear here as the story develops</p>
        </div>
      `;
      this.previousCardIds = new Set();
      return;
    }

    // Group cards by type
    const groups = {};
    const typeOrder = ['character', 'relationship', 'plot', 'world', 'arc'];

    for (const card of cards) {
      if (!groups[card.type]) groups[card.type] = [];
      groups[card.type].push(card);
    }

    // Render each group in order
    for (const type of typeOrder) {
      if (!groups[type]) continue;
      this.renderGroup(type, groups[type], previousCardsMap);
    }

    // Render any types not in the predefined order
    for (const [type, typeCards] of Object.entries(groups)) {
      if (!typeOrder.includes(type)) {
        this.renderGroup(type, typeCards, previousCardsMap);
      }
    }

    // Track card IDs for "new card" animation detection
    const currentIds = new Set(cards.map(c => c.id));
    this.previousCardIds = currentIds;
  },

  /**
   * Render a group of cards with a header.
   */
  renderGroup(type, cards, previousCardsMap) {
    const group = document.createElement('div');
    group.className = 'card-group';

    const header = document.createElement('div');
    header.className = 'card-group-header';
    header.textContent = `${QuillUtils.cardTypeIcon(type)} ${QuillUtils.cardTypeLabel(type)}`;
    group.appendChild(header);

    for (const card of cards) {
      group.appendChild(this.renderCard(card, previousCardsMap));
    }

    this.container.appendChild(group);
  },

  /**
   * Render a single context card element.
   */
  renderCard(card, previousCardsMap) {
    const isNew = this.previousCardIds.size > 0 && !this.previousCardIds.has(card.id);
    const oldFieldsJson = previousCardsMap.get(card.id);
    const isUpdated = oldFieldsJson && oldFieldsJson !== JSON.stringify(card.fields);

    const el = document.createElement('div');
    el.className = `context-card ${isNew ? 'new-card' : ''} ${isUpdated ? 'updated' : ''}`;
    el.dataset.type = card.type;
    el.dataset.id = card.id;

    // Title row with actions
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';

    const titleInput = document.createElement('input');
    titleInput.className = 'card-title';
    titleInput.type = 'text';
    titleInput.value = card.title;
    titleInput.addEventListener('change', () => {
      this.updateCard(card.id, { title: titleInput.value });
    });

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'card-action-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit fields';
    editBtn.addEventListener('click', () => this.openEditModal(card));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete card';
    deleteBtn.addEventListener('click', () => this.deleteCard(card.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    titleRow.appendChild(titleInput);
    titleRow.appendChild(actions);
    el.appendChild(titleRow);

    // Fields
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'card-fields';

    for (const [key, value] of Object.entries(card.fields || {})) {
      const field = document.createElement('div');
      field.className = 'card-field';

      const keyEl = document.createElement('span');
      keyEl.className = 'card-field-key';
      keyEl.textContent = key;

      const valueInput = document.createElement('input');
      valueInput.className = 'card-field-value';
      valueInput.type = 'text';
      valueInput.value = value;
      valueInput.addEventListener('change', () => {
        this.updateCard(card.id, { fields: { [key]: valueInput.value } });
      });

      field.appendChild(keyEl);
      field.appendChild(valueInput);
      fieldsContainer.appendChild(field);
    }

    el.appendChild(fieldsContainer);
    return el;
  },

  /**
   * Flash a card to indicate it was updated.
   */
  flashCard(cardId) {
    const el = this.container.querySelector(`[data-id="${cardId}"]`);
    if (el) {
      el.classList.remove('updated');
      void el.offsetWidth; // force reflow
      el.classList.add('updated');
    }
  },

  /**
   * Update a card via the API.
   */
  async updateCard(cardId, data) {
    const storyId = QuillApp.currentStory?.id;
    if (!storyId) return;

    try {
      await QuillAPI.updateCard(storyId, cardId, data);
      this.flashCard(cardId);
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  },

  /**
   * Delete a card via the API.
   */
  async deleteCard(cardId) {
    const storyId = QuillApp.currentStory?.id;
    if (!storyId) return;

    if (!confirm('Delete this card?')) return;

    try {
      await QuillAPI.deleteCard(storyId, cardId);
      // Remove from local state and re-render
      QuillApp.currentStory.cards = QuillApp.currentStory.cards.filter(c => c.id !== cardId);
      this.render(QuillApp.currentStory.cards);
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  },

  /**
   * Open the edit modal for a card (for adding/removing fields).
   */
  openEditModal(card) {
    // For now, use the add card modal repurposed for editing
    // This is a simplified approach — a dedicated edit modal could be added later
    const modal = document.getElementById('modal-add-card');
    const typeSelect = document.getElementById('input-card-type');
    const titleInput = document.getElementById('input-card-title');
    const fieldsList = document.getElementById('card-fields-list');
    const saveBtn = document.getElementById('btn-save-card');

    typeSelect.value = card.type;
    titleInput.value = card.title;

    // Populate fields
    fieldsList.innerHTML = '';
    for (const [key, value] of Object.entries(card.fields || {})) {
      this.addFieldRow(key, value);
    }

    // Change save button behavior for editing
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = async () => {
      const fields = {};
      fieldsList.querySelectorAll('.field-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const k = inputs[0].value.trim();
        const v = inputs[1].value.trim();
        if (k) fields[k] = v;
      });

      try {
        await QuillAPI.updateCard(QuillApp.currentStory.id, card.id, {
          type: typeSelect.value,
          title: titleInput.value,
          fields,
        });

        // Update local state
        const idx = QuillApp.currentStory.cards.findIndex(c => c.id === card.id);
        if (idx !== -1) {
          QuillApp.currentStory.cards[idx] = {
            ...QuillApp.currentStory.cards[idx],
            type: typeSelect.value,
            title: titleInput.value,
            fields,
          };
        }

        this.render(QuillApp.currentStory.cards);
        QuillApp.closeModal('modal-add-card');
      } catch (err) {
        console.error('Failed to update card:', err);
      }

      // Reset button
      saveBtn.textContent = 'Add Card';
      saveBtn.onclick = null;
    };

    modal.classList.remove('hidden');
  },

  /**
   * Add a field row to the card fields editor in the modal.
   */
  addFieldRow(key = '', value = '') {
    const fieldsList = document.getElementById('card-fields-list');
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
      <input type="text" placeholder="Field name" value="${QuillUtils.escapeHtml(key)}">
      <input type="text" placeholder="Value" value="${QuillUtils.escapeHtml(value)}">
      <button class="field-remove" title="Remove field">×</button>
    `;

    row.querySelector('.field-remove').addEventListener('click', () => row.remove());
    fieldsList.appendChild(row);
  },
};
