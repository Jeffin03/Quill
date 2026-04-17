/* ══════════════════════════════════════════
   Quill — Story Tree Module
   ══════════════════════════════════════════ */

window.QuillTree = {
  nodes: [],

  /**
   * Initialize the tree module.
   */
  init() {
    this.container = document.getElementById('tree-content');
  },

  /**
   * Render the tree from story messages.
   * In Phase 1, this is a linear timeline derived from message pairs.
   */
  render(story) {
    this.container.innerHTML = '';
    this.nodes = [];

    if (!story.messages || story.messages.length === 0) {
      this.container.innerHTML = `
        <div class="tree-empty">
          <p>Scenes will appear here as the story develops</p>
        </div>
      `;
      return;
    }

    const timeline = document.createElement('div');
    timeline.className = 'tree-timeline';

    // Build nodes from message pairs (user direction + AI response)
    let nodeIndex = 0;
    for (let i = 0; i < story.messages.length; i++) {
      const msg = story.messages[i];
      if (msg.role !== 'user') continue;

      nodeIndex++;
      const aiMsg = story.messages[i + 1]; // The response (if exists)

      const preview = aiMsg
        ? QuillUtils.truncate(aiMsg.content, 60)
        : 'Awaiting response...';

      const label = QuillUtils.truncate(msg.content, 30);
      const isActive = i >= story.messages.length - 2;

      const node = this.createNode({
        index: nodeIndex,
        label,
        preview,
        messageIndex: i,
        active: isActive,
      });

      timeline.appendChild(node);
      this.nodes.push({ index: nodeIndex, messageIndex: i });
    }

    this.container.appendChild(timeline);

    // Scroll to active node
    const activeNode = timeline.querySelector('.tree-node.active');
    if (activeNode) {
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  /**
   * Create a tree node element.
   */
  createNode({ index, label, preview, messageIndex, active }) {
    const el = document.createElement('div');
    el.className = `tree-node ${active ? 'active' : ''}`;
    el.dataset.messageIndex = messageIndex;

    el.innerHTML = `
      <div class="tree-node-dot"></div>
      <div class="tree-node-content">
        <div class="tree-node-label">
          <span class="tree-node-number">${index}.</span>
          ${QuillUtils.escapeHtml(label)}
        </div>
        <div class="tree-node-preview">${QuillUtils.escapeHtml(preview)}</div>
      </div>
    `;

    // Click to scroll to that message in chat
    el.addEventListener('click', () => {
      this.scrollToMessage(messageIndex);
      // Update active state
      this.container.querySelectorAll('.tree-node').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
    });

    return el;
  },

  /**
   * Add a new node to the tree (called after a new message exchange).
   */
  addNode(userContent, aiContent) {
    const story = QuillApp.currentStory;
    if (!story) return;

    // Re-render the whole tree (simple for Phase 1)
    this.render(story);
  },

  /**
   * Scroll the chat to a specific message by index.
   */
  scrollToMessage(messageIndex) {
    const messages = document.querySelectorAll('#chat-messages .message');
    if (messages[messageIndex]) {
      messages[messageIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },
};
