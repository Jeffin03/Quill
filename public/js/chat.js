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
  render(story) {
    this.messagesContainer.innerHTML = '';

    if (!story.messages || story.messages.length === 0) {
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
    this.scrollToBottom();
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
      <div class="message-bubble">${content}</div>
      <span class="message-time">${QuillUtils.formatTimeShort(msg.timestamp)}</span>
    `;

    this.messagesContainer.appendChild(el);
    return el;
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
      <div class="message-bubble"></div>
    `;

    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
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
    this.scrollToBottom();

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
        // Render accumulated prose as HTML
        bubble.innerHTML = QuillUtils.proseToHtml(accumulator);
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

        this.resetInput();
      },

      onError: (error) => {
        streamEl.classList.remove('message-streaming');
        bubble.innerHTML = `<p style="color: var(--color-relationship);">⚠ Error: ${QuillUtils.escapeHtml(error)}</p>`;
        this.resetInput();
      },
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
  scrollToBottom() {
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  },
};
