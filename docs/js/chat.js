/* ══════════════════════════════════════════
   Quill — Chat Module
   ══════════════════════════════════════════ */

window.QuillChat = {
  currentStream: null,
  isStreaming: false,

  /**
   * Initialize the chat module.
   */
  init() {
    this.messagesContainer = document.getElementById('chat-messages');
    this.welcomeEl = document.getElementById('chat-welcome');
    this.input = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('btn-send');

    // Auto-resize textarea
    this.input.addEventListener('input', () => this.autoResize());

    // Send on Enter (Shift+Enter for new line)
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.sendBtn.addEventListener('click', () => this.send());
  },

  /**
   * Auto-resize the textarea to fit content.
   */
  autoResize() {
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(this.input.scrollHeight, 150) + 'px';
  },

  /**
   * Load and render all messages for the current story.
   */
  async render(story) {
    this.messagesContainer.innerHTML = '';

    const branchMessages = await QuillAPI.getBranchMessages(story.id);

    if (!branchMessages || branchMessages.length === 0) {
      this.messagesContainer.innerHTML = `
        <div id="chat-welcome" class="chat-welcome">
          <div class="welcome-icon">✒️</div>
          <h3>Ready to write</h3>
          <p>Set the scene, introduce characters, or describe the world you want to build. You direct — the AI writes.</p>
        </div>
      `;
      return;
    }

    story.messages.forEach(msg => this.appendMessage(msg, false));
    this.scrollToBottom(true);
  },

  /**
   * Append a message to the chat.
   */
  appendMessage(msg, animate = true) {
    // Remove welcome screen if present
    const welcome = this.messagesContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const el = document.createElement('div');
    el.className = `message message-${msg.role}`;
    el.dataset.id = msg.id || '';
    if (!animate) el.style.animation = 'none';

    const label = msg.role === 'user' ? 'You (Director)' : 'Quill';
    const content = msg.role === 'assistant'
      ? QuillUtils.proseToHtml(msg.content)
      : QuillUtils.escapeHtml(msg.content);

    el.innerHTML = `
      <span class="message-label">${label}</span>
      <div class="message-bubble-wrapper">
        <div class="message-bubble">${content}</div>
        <div class="message-actions">
          <button class="btn-message-action btn-edit-message" title="Edit message">✏️</button>
          <button class="btn-message-action btn-delete-message" title="Delete or Rewind">🗑️</button>
        </div>
      </div>
      <span class="message-time">${QuillUtils.formatTimeShort(msg.timestamp)}</span>
    `;

    const editBtn = el.querySelector('.btn-edit-message');
    const deleteBtn = el.querySelector('.btn-delete-message');
    const bubbleWrapper = el.querySelector('.message-bubble-wrapper');
    const bubble = el.querySelector('.message-bubble');

    editBtn.addEventListener('click', () => {
      this.openEditMode(msg, el, bubbleWrapper, bubble);
    });

    deleteBtn.addEventListener('click', () => {
      this.openDeleteMode(msg, el);
    });

    this.messagesContainer.appendChild(el);
    return el;
  },

  /**
   * Open the delete/rewind options for a message.
   */
  openDeleteMode(msg, el) {
    const storyId = QuillApp.currentStory.id;
    const msgIndex = QuillApp.currentStory.messages.findIndex(m => m.id === msg.id);

    if (confirm(`What would you like to do with this message?\n\nOK = REWIND (Delete everything from here onwards)\nCancel = DELETE ONLY (Just remove this bubble)`)) {
      // Rewind
      QuillAPI.rewindTimeline(storyId, msgIndex).then(updatedStory => {
        QuillApp.currentStory = updatedStory;
        this.render(updatedStory);
        QuillTree.render(updatedStory);
      });
    } else {
      // Just delete this one
      const story = QuillApp.currentStory;
      story.messages = story.messages.filter(m => m.id !== msg.id);
      QuillAPI.updateStory(storyId, { messages: story.messages }).then(() => {
        el.remove();
        QuillTree.render(story);
      });
    }
  },

  /**
   * Enter edit mode for a specific message.
   */
  openEditMode(msg, el, wrapper, bubble) {
    const originalContent = msg.content;
    
    wrapper.innerHTML = `
      <div class="message-edit-container">
        <textarea class="message-edit-textarea">${QuillUtils.escapeHtml(originalContent)}</textarea>
        <div class="message-edit-actions">
          <button class="btn btn-ghost btn-sm btn-cancel-edit">Cancel</button>
          <button class="btn btn-primary btn-sm btn-save-edit">Save</button>
        </div>
      </div>
    `;

    const textarea = wrapper.querySelector('textarea');
    const saveBtn = wrapper.querySelector('.btn-save-edit');
    const cancelBtn = wrapper.querySelector('.btn-cancel-edit');

    // Auto-resize
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';

    const restoreNormalView = (newContent = originalContent) => {
      msg.content = newContent;
      const htmlContent = msg.role === 'assistant' 
        ? QuillUtils.proseToHtml(newContent) 
        : QuillUtils.escapeHtml(newContent);
        
      wrapper.innerHTML = `
        <div class="message-bubble">${htmlContent}</div>
        <button class="btn-edit-message" title="Edit message">✏️</button>
      `;
      wrapper.querySelector('.btn-edit-message').addEventListener('click', () => {
        this.openEditMode(msg, el, wrapper, wrapper.querySelector('.message-bubble'));
      });
    };

    cancelBtn.addEventListener('click', () => restoreNormalView());

    saveBtn.addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (!newContent) return;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        await QuillAPI.updateMessage(QuillApp.currentStory.id, msg.id, newContent);
        
        const storyMsg = QuillApp.currentStory.messages.find(m => m.id === msg.id);
        if (storyMsg) storyMsg.content = newContent;

        restoreNormalView(newContent);
        QuillTree.render(QuillApp.currentStory);
      } catch (err) {
        console.error('Failed to update message:', err);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  },

  /**
   * Create a streaming message element (for real-time AI response).
   */
  createStreamingMessage() {
    const welcome = this.messagesContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const el = document.createElement('div');
    el.className = 'message message-assistant message-streaming';
    el.innerHTML = `
      <span class="message-label">Quill</span>
      <div class="message-bubble-wrapper">
        <div class="message-bubble"></div>
        <div class="message-actions"></div>
      </div>
    `;

    this.messagesContainer.appendChild(el);
    this.scrollToBottom(true);
    return el;
  },

  /**
   * Send the current input as a direction.
   */
  async send() {
    const message = this.input.value.trim();
    if (!message || this.isStreaming) return;

    const story = QuillApp.currentStory;
    if (!story) return;

    // Clear input
    this.input.value = '';
    this.input.style.height = 'auto';

    // Show user message immediately
    const userMsg = {
      id: QuillUtils.uuid(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    this.appendMessage(userMsg);
    this.scrollToBottom(true);

    // Disable input during streaming
    this.isStreaming = true;
    this.sendBtn.disabled = true;
    this.input.placeholder = 'Writing...';

    // Create streaming message element
    const streamEl = this.createStreamingMessage();
    const bubble = streamEl.querySelector('.message-bubble');
    let accumulator = '';

    // Stream the response
    this.currentStream = QuillAPI.streamChat(story.id, message, {
      onChunk: (content) => {
        accumulator += content;

        // Check if cards have started (for UI feedback)
        if (accumulator.includes('[[[QUILL_CARDS_START]]]') && !this.cardsStarted) {
          this.cardsStarted = true;
          QuillCards.setSyncing(true);
        }

        // Render accumulated prose as HTML (strip cards if they started)
        const prose = accumulator.split('[[[QUILL_CARDS_START]]]')[0];
        bubble.innerHTML = QuillUtils.proseToHtml(prose);
        this.scrollToBottom();
      },

      onDone: (data) => {
        // Finalize the message
        streamEl.classList.remove('message-streaming');

        // Use the cleaned prose from the server
        if (data.prose) {
          bubble.innerHTML = QuillUtils.proseToHtml(data.prose);
        }

        // Add timestamp
        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = QuillUtils.formatTimeShort(new Date().toISOString());
        streamEl.appendChild(timeEl);

        // Update cards panel
        if (data.cards) {
          QuillApp.currentStory.cards = data.cards;
          QuillCards.render(data.cards);
        }

        // Update tree
        QuillTree.addNode(message, data.prose);

        // Add actions (Delete/Edit)
        const assistantMsgId = data.messageId || QuillUtils.uuid();
        this.addActionsToStreamMessage(streamEl, { id: assistantMsgId, role: 'assistant', content: data.prose || '', timestamp: new Date().toISOString() });

        this.resetInput();
        QuillCards.setSyncing(false);
        this.cardsStarted = false;
      },

      onError: (error) => {
        streamEl.classList.remove('message-streaming');
        bubble.innerHTML = `<p style="color: var(--color-relationship);">⚠ Error: ${QuillUtils.escapeHtml(error)}</p>`;
        
        // Add actions even on error so user can delete it
        this.addActionsToStreamMessage(streamEl, { id: QuillUtils.uuid(), role: 'assistant', content: '', timestamp: new Date().toISOString() });
        
        this.resetInput();
        QuillCards.setSyncing(false);
        this.cardsStarted = false;
      },
    });
  },

  /**
   * Add Edit/Delete actions to a message that was just streamed or failed.
   */
  addActionsToStreamMessage(el, msg) {
    const actionsContainer = el.querySelector('.message-actions');
    if (!actionsContainer) return;

    actionsContainer.innerHTML = `
      <button class="btn-message-action btn-edit-message" title="Edit">✏️</button>
      <button class="btn-message-action btn-branch-message" title="Branch from here">🌿</button>
      <button class="btn-message-action btn-delete-message" title="Delete/Rewind">🗑️</button>
    `;

    actionsContainer.querySelector('.btn-edit-message').addEventListener('click', () => {
      this.openEditMode(msg, el, el.querySelector('.message-bubble-wrapper'), el.querySelector('.message-bubble'));
    });

    actionsContainer.querySelector('.btn-branch-message').addEventListener('click', () => {
      this.openBranchMode(msg);
    });

    actionsContainer.querySelector('.btn-delete-message').addEventListener('click', () => {
      this.openDeleteMode(msg, el);
    });
  },

  /**
   * Reset input state after streaming completes.
   */
  resetInput() {
    this.isStreaming = false;
    this.sendBtn.disabled = false;
    this.input.placeholder = 'Direct the scene... (Enter to send, Shift+Enter for new line)';
    this.currentStream = null;
    this.input.focus();
  },

  /**
   * Scroll chat to the bottom.
   */
  scrollToBottom(force = false) {
    requestAnimationFrame(() => {
      if (force) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        return;
      }
      
      // Smart scroll: only scroll if within 150px of the bottom
      const threshold = 150;
      const position = this.messagesContainer.scrollHeight - this.messagesContainer.scrollTop - this.messagesContainer.clientHeight;
      
      if (position < threshold) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    });
  /**
   * Open branch mode (Create a new divergent timeline from a message).
   */
  async openBranchMode(msg) {
    const confirm = window.confirm('Fork this story from here? You will start a new parallel timeline.');
    if (!confirm) return;

    try {
      const story = QuillApp.currentStory;
      story.activeBranchId = msg.id;
      
      // Update story cards to the snapshot of this message
      if (msg.cardSnapshot) {
        story.cards = msg.cardSnapshot;
        QuillCards.render(story.cards);
      }

      await QuillAPI.updateStory(story.id, { activeBranchId: msg.id, cards: story.cards });
      
      // Re-render
      await this.render(story);
      QuillTree.render(story);
      
      QuillToast.show('Timeline forked! Type to begin a new path.', 'success');
      
      // Focus input
      this.input.focus();
    } catch (err) {
      console.error('Failed to branch:', err);
    }
  },
};
