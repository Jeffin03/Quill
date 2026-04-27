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
   * Render the branching story tree.
   */
  async render(story) {
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

    // Reconstruct the tree structure
    const msgMap = new Map(story.messages.map(m => [m.id, m]));
    const childrenMap = new Map();
    
    story.messages.forEach(msg => {
      if (msg.parentId) {
        if (!childrenMap.has(msg.parentId)) childrenMap.set(msg.parentId, []);
        childrenMap.get(msg.parentId).push(msg.id);
      }
    });

    const treeRoot = document.createElement('div');
    treeRoot.className = 'tree-multiverse';
    
    // Start rendering from the root message
    const rootId = story.rootMessageId || story.messages[0].id;
    this.renderNode(rootId, msgMap, childrenMap, treeRoot, story.activeBranchId, 1);

    this.container.appendChild(treeRoot);

    // Scroll to active node
    const activeNode = treeRoot.querySelector('.tree-node.active');
    if (activeNode) {
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  /**
   * Recursively render nodes and their branches.
   */
  renderNode(msgId, msgMap, childrenMap, container, activeBranchId, depth) {
    const msg = msgMap.get(msgId);
    if (!msg || msg.role !== 'user') return; // We render user directions as the nodes

    const children = childrenMap.get(msgId) || [];
    const aiRespId = children.find(id => msgMap.get(id)?.role === 'assistant');
    const aiMsg = aiRespId ? msgMap.get(aiRespId) : null;
    
    // Create the node element
    const preview = aiMsg ? QuillUtils.truncate(aiMsg.content, 60) : '...';
    const label = QuillUtils.truncate(msg.content, 30);
    
    // Is this node on the active path?
    const isActive = this.isNodeOnPath(msgId, activeBranchId, msgMap);

    const nodeEl = this.createNodeUI({
      id: msg.id,
      label,
      preview,
      active: isActive,
      depth
    });
    
    container.appendChild(nodeEl);

    // Render children (branches)
    const nextMsgIds = aiRespId ? (childrenMap.get(aiRespId) || []) : [];
    
    if (nextMsgIds.length > 0) {
      const branchesContainer = document.createElement('div');
      branchesContainer.className = 'tree-branches';
      container.appendChild(branchesContainer);

      nextMsgIds.forEach(nextId => {
        const branchWrapper = document.createElement('div');
        branchWrapper.className = 'tree-branch-wrapper';
        branchesContainer.appendChild(branchWrapper);
        this.renderNode(nextId, msgMap, childrenMap, branchWrapper, activeBranchId, depth + 1);
      });
    }
  },

  /**
   * Check if a node is part of the lineage of the active leaf.
   */
  isNodeOnPath(nodeId, activeLeafId, msgMap) {
    let currentId = activeLeafId;
    while (currentId) {
      if (currentId === nodeId) return true;
      const msg = msgMap.get(currentId);
      currentId = msg?.parentId;
    }
    return false;
  },

  /**
   * Create the node UI element.
   */
  createNodeUI({ id, label, preview, active, depth }) {
    const el = document.createElement('div');
    el.className = `tree-node ${active ? 'active' : ''}`;
    el.style.marginLeft = `${(depth - 1) * 12}px`;
    
    el.innerHTML = `
      <div class="tree-node-dot"></div>
      <div class="tree-node-content">
        <div class="tree-node-label">${QuillUtils.escapeHtml(label)}</div>
        <div class="tree-node-preview">${QuillUtils.escapeHtml(preview)}</div>
      </div>
    `;

    el.addEventListener('click', () => {
      this.switchToBranch(id);
    });

    return el;
  },

  /**
   * Switch the active branch to a specific node.
   */
  async switchToBranch(messageId) {
    try {
      const story = QuillApp.currentStory;
      story.activeBranchId = messageId;
      
      // Update the story cards to the snapshot of this message
      const msg = story.messages.find(m => m.id === messageId);
      if (msg && msg.cardSnapshot) {
        story.cards = msg.cardSnapshot;
        QuillCards.render(story.cards);
      }

      await QuillAPI.updateStory(story.id, { activeBranchId: messageId, cards: story.cards });
      
      // Re-render everything
      const branchMessages = await QuillAPI.getBranchMessages(story.id, messageId);
      QuillChat.render({ ...story, messages: branchMessages });
      this.render(story);
      
      QuillToast.show('Switched timeline');
    } catch (err) {
      console.error('Failed to switch branch:', err);
    }
  },

  /**
   * Add a new node to the tree (helper for chat).
   */
  addNode(message, prose) {
    if (QuillApp.currentStory) {
      this.render(QuillApp.currentStory);
    }
  },
};
