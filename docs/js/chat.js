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
    this.messagesContainer = document.getElementById("chat-messages");
    this.welcomeEl = document.getElementById("chat-welcome");
    this.input = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("btn-send");
    this.cardsStarted = false;

    // Auto-resize textarea
    this.input.addEventListener("input", () => this.autoResize());

    // Send on Enter (Shift+Enter for new line)
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.sendBtn.addEventListener("click", () => {
      if (this.sendBtn.dataset.state === "stop") {
        this.currentStream?.abort();
        return;
      }
      this.send();
    });
  },

  /**
   * Auto-resize the textarea to fit content.
   */
  autoResize() {
    this.input.style.height = "auto";
    this.input.style.height = Math.min(this.input.scrollHeight, 150) + "px";
  },

  /**
   * Load and render all messages for the current story.
   */
  async render(story) {
    this.messagesContainer.innerHTML = "";

    const branchMessages = await QuillAPI.getBranchMessages(
      story.id,
      null,
      story,
    );

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

    branchMessages.forEach((msg) => this.appendMessage(msg, false));
    this.scrollToBottom(true);
  },

  /**
   * Append a message to the chat.
   */
  appendMessage(msg, animate = true) {
    // Remove welcome screen if present
    const welcome = this.messagesContainer.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    const el = document.createElement("div");
    el.className = `message message-${msg.role}`;
    el.dataset.id = msg.id || "";
    if (!animate) el.style.animation = "none";

    const label = msg.role === "user" ? "You (Director)" : "Quill";
    const content =
      msg.role === "assistant"
        ? QuillUtils.proseToHtml(msg.content)
        : QuillUtils.escapeHtml(msg.content);

    const vizHtml = msg.visualization
      ? `
      <div class="message-visualization">
        <img src="data:image/png;base64,${msg.visualization.imageBase64}" alt="Scene visualization" loading="lazy">
      </div>
    `
      : "";

    el.innerHTML = `
      <span class="message-label">${label}</span>
      <div class="message-bubble-wrapper">
        <div class="message-bubble">${content}</div>
        ${vizHtml}
        <div class="message-actions">
          ${msg.role === "assistant" ? `<button class="btn-message-action btn-visualize-message" title="Visualize scene">🎨</button>` : ""}
          <button class="btn-message-action btn-edit-message" title="Edit message">✏️</button>
          <button class="btn-message-action btn-branch-message" title="Branch from here">🌿</button>
          <button class="btn-message-action btn-delete-message" title="Delete or Rewind">🗑️</button>
        </div>
      </div>
      <span class="message-time">${QuillUtils.formatTimeShort(msg.timestamp)}</span>
    `;

    const editBtn = el.querySelector(".btn-edit-message");
    const branchBtn = el.querySelector(".btn-branch-message");
    const deleteBtn = el.querySelector(".btn-delete-message");
    const vizBtn = el.querySelector(".btn-visualize-message");
    const bubbleWrapper = el.querySelector(".message-bubble-wrapper");
    const bubble = el.querySelector(".message-bubble");

    editBtn.addEventListener("click", () => {
      this.openEditMode(msg, el, bubbleWrapper, bubble);
    });

    branchBtn.addEventListener("click", () => {
      this.openBranchMode(msg);
    });

    deleteBtn.addEventListener("click", () => {
      this.openDeleteMode(msg, el);
    });

    if (vizBtn) {
      vizBtn.addEventListener("click", () => {
        this.visualizeMessage(msg, el);
      });
    }

    this.messagesContainer.appendChild(el);
    return el;
  },

  /**
   * Open the delete/rewind options for a message.
   */
  openDeleteMode(msg, el) {
    const storyId = QuillApp.currentStory.id;
    const modal = document.getElementById("modal-delete-message");
    modal.classList.remove("hidden");

    const rewindBtn = document.getElementById("btn-rewind-here");
    const deleteBtn = document.getElementById("btn-delete-only");
    const closeBtn = modal.querySelector(".modal-close");
    const close = () => modal.classList.add("hidden");

    // Clone buttons to remove old listeners
    const newRewindBtn = rewindBtn.cloneNode(true);
    const newDeleteBtn = deleteBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);
    rewindBtn.replaceWith(newRewindBtn);
    deleteBtn.replaceWith(newDeleteBtn);
    closeBtn.replaceWith(newCloseBtn);

    newCloseBtn.addEventListener("click", close, { once: true });
    modal.addEventListener(
      "click",
      (e) => {
        if (e.target === modal) close();
      },
      { once: true },
    );

    newRewindBtn.addEventListener(
      "click",
      () => {
        close();
        QuillAPI.rewindTimeline(storyId, msg.id).then((updatedStory) => {
          QuillApp.currentStory = updatedStory;
          this.render(updatedStory);
          QuillTree.render(updatedStory);
        }).catch((err) => {
          console.error("Rewind failed:", err);
          QuillToast?.show?.("Failed to rewind timeline", "error");
        });
      },
      { once: true },
    );

    newDeleteBtn.addEventListener(
      "click",
      () => {
        close();
        const story = QuillApp.currentStory;
        // Compute descendants without mutating in-memory state
        const idsToRemove = new Set([msg.id]);
        const findDescendants = (parentId) => {
          story.messages.forEach((m) => {
            if (m.parentId === parentId && !idsToRemove.has(m.id)) {
              idsToRemove.add(m.id);
              findDescendants(m.id);
            }
          });
        };
        findDescendants(msg.id);
        const filteredMessages = story.messages.filter((m) => !idsToRemove.has(m.id));
        QuillAPI.updateStory(storyId, { messages: filteredMessages }).then(() => {
          story.messages = filteredMessages;
          el.remove();
          QuillTree.render(story);
        }).catch((err) => {
          console.error("Delete failed:", err);
          QuillToast?.show?.("Failed to delete message", "error");
        });
      },
      { once: true },
    );
  } /**
   * Enter edit mode for a specific message.
   */,
  openEditMode(msg, el, wrapper, _bubble) {
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

    const textarea = wrapper.querySelector("textarea");
    const saveBtn = wrapper.querySelector(".btn-save-edit");
    const cancelBtn = wrapper.querySelector(".btn-cancel-edit");

    // Auto-resize
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + "px";

    const restoreNormalView = (newContent = originalContent) => {
      msg.content = newContent;
      const htmlContent =
        msg.role === "assistant"
          ? QuillUtils.proseToHtml(newContent)
          : QuillUtils.escapeHtml(newContent);

      wrapper.innerHTML = `
  <div class="message-bubble">${htmlContent}</div>
  <div class="message-actions">
    <button class="btn-message-action btn-edit-message" title="Edit">✏️</button>
    <button class="btn-message-action btn-branch-message" title="Branch from here">🌿</button>
    <button class="btn-message-action btn-delete-message" title="Delete/Rewind">🗑️</button>
  </div>
`;
      wrapper
        .querySelector(".btn-edit-message")
        .addEventListener("click", () => {
          this.openEditMode(
            msg,
            el,
            wrapper,
            wrapper.querySelector(".message-bubble"),
          );
        });
      wrapper
        .querySelector(".btn-branch-message")
        .addEventListener("click", () => {
          this.openBranchMode(msg);
        });
      wrapper
        .querySelector(".btn-delete-message")
        .addEventListener("click", () => {
          this.openDeleteMode(msg, el);
        });
      wrapper
        .querySelector(".btn-edit-message")
        .addEventListener("click", () => {
          this.openEditMode(
            msg,
            el,
            wrapper,
            wrapper.querySelector(".message-bubble"),
          );
        });
    };

    cancelBtn.addEventListener("click", () => restoreNormalView());

    saveBtn.addEventListener("click", async () => {
      const newContent = textarea.value.trim();
      if (!newContent) return;

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        await QuillAPI.updateMessage(
          QuillApp.currentStory.id,
          msg.id,
          newContent,
        );

        const storyMsg = QuillApp.currentStory.messages.find(
          (m) => m.id === msg.id,
        );
        if (storyMsg) storyMsg.content = newContent;

        restoreNormalView(newContent);
        QuillTree.render(QuillApp.currentStory);
      } catch (err) {
        console.error("Failed to update message:", err);
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    });
  },

  /**
   * Create a streaming message element (for real-time AI response).
   */
  createStreamingMessage() {
    const welcome = this.messagesContainer.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    const el = document.createElement("div");
    el.className = "message message-assistant message-streaming";
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
    this.input.value = "";
    this.input.style.height = "auto";

    // Show user message immediately
    const userMsg = {
      id: QuillUtils.uuid(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    this.appendMessage(userMsg);
    this.scrollToBottom(true);

    // Disable input during streaming
    this.isStreaming = true;
    this.input.placeholder = "Writing...";

    // Create streaming message element
    const streamEl = this.createStreamingMessage();
    const bubble = streamEl.querySelector(".message-bubble");
    let accumulator = "";

    this.setSendButtonState("stop");

    // Stream the response
    this.currentStream = QuillAPI.streamChat(story.id, message, {
      userMessageId: userMsg.id,
      onChunk: (content) => {
        accumulator += content;

        // Check if cards have started (for UI feedback)
        if (
          accumulator.includes("[[[QUILL_CARDS_START]]]") &&
          !this.cardsStarted
        ) {
          this.cardsStarted = true;
          QuillCards.setSyncing(true);
        }

        // Render accumulated prose as HTML (strip cards if they started)
        const prose = accumulator.split("[[[QUILL_CARDS_START]]]")[0];
        bubble.innerHTML = QuillUtils.proseToHtml(prose);
        this.scrollToBottom();
      },

      onDone: (data) => {
        this.setSendButtonState("send");

        // Finalize the message
        streamEl.classList.remove("message-streaming");

        // Use the cleaned prose from the server
        if (data.prose) {
          bubble.innerHTML = QuillUtils.proseToHtml(data.prose);
        }

        // Add timestamp
        const timeEl = document.createElement("span");
        timeEl.className = "message-time";
        timeEl.textContent = QuillUtils.formatTimeShort(
          new Date().toISOString(),
        );
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
        this.addActionsToStreamMessage(streamEl, {
          id: assistantMsgId,
          role: "assistant",
          content: data.prose || "",
          timestamp: new Date().toISOString(),
        });

        this.resetInput();
        QuillCards.setSyncing(false);
        this.cardsStarted = false;
      },

      onError: (error) => {
        this.setSendButtonState("send");

        const isAbort = error?.name === "AbortError" ||
          error === "AbortError" ||
          (typeof error === "string" && error.includes("abort"));
        if (isAbort) {
          streamEl.classList.remove("message-streaming");
          if (accumulator.trim()) {
            bubble.innerHTML = QuillUtils.proseToHtml(
              accumulator.split("[[[QUILL_CARDS_START]]]")[0],
            );
          }
          this.addActionsToStreamMessage(streamEl, {
            id: QuillUtils.uuid(),
            role: "assistant",
            content: accumulator || "",
            timestamp: new Date().toISOString(),
          });
          this.resetInput();
          QuillCards.setSyncing(false);
          this.cardsStarted = false;
          return;
        }

        // existing error handling
        streamEl.classList.remove("message-streaming");
        bubble.innerHTML = `<p style="color: var(--color-relationship);">⚠ Error: ${QuillUtils.escapeHtml(error)}</p>`;
        this.addActionsToStreamMessage(streamEl, {
          id: QuillUtils.uuid(),
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        });
        this.resetInput();
        QuillCards.setSyncing(false);
        this.cardsStarted = false;
      },
    });
  },

  setSendButtonState(state) {
    this.sendBtn.dataset.state = state;
  },

  /**
   * Add Edit/Delete actions to a message that was just streamed or failed.
   */
  addActionsToStreamMessage(el, msg) {
    const actionsContainer = el.querySelector(".message-actions");
    if (!actionsContainer) return;

    actionsContainer.innerHTML = `
      <button class="btn-message-action btn-visualize-message" title="Visualize scene">🎨</button>
      <button class="btn-message-action btn-edit-message" title="Edit">✏️</button>
      <button class="btn-message-action btn-branch-message" title="Branch from here">🌿</button>
      <button class="btn-message-action btn-delete-message" title="Delete/Rewind">🗑️</button>
    `;

    actionsContainer
      .querySelector(".btn-visualize-message")
      .addEventListener("click", () => {
        this.visualizeMessage(msg, el);
      });

    actionsContainer
      .querySelector(".btn-edit-message")
      .addEventListener("click", () => {
        this.openEditMode(
          msg,
          el,
          el.querySelector(".message-bubble-wrapper"),
          el.querySelector(".message-bubble"),
        );
      });

    actionsContainer
      .querySelector(".btn-branch-message")
      .addEventListener("click", () => {
        this.openBranchMode(msg);
      });

    actionsContainer
      .querySelector(".btn-delete-message")
      .addEventListener("click", () => {
        this.openDeleteMode(msg, el);
      });
  },

  /**
   * Visualize a message as an image.
   */
  async visualizeMessage(msg, el) {
    const storyId = QuillApp.currentStory?.id;
    if (!storyId || !msg?.id) return;

    const vizBtn = el.querySelector(".btn-visualize-message");
    if (vizBtn) {
      vizBtn.disabled = true;
      vizBtn.textContent = "⏳";
    }

    try {
      const viz = await QuillAPI.visualizeMessage(storyId, msg.id);
      if (!viz) throw new Error("No image returned");

      // Update the in-memory story
      const storyMsg = QuillApp.currentStory.messages.find(
        (m) => m.id === msg.id,
      );
      if (storyMsg) storyMsg.visualization = viz;

      // Insert image into the DOM
      const bubbleWrapper = el.querySelector(".message-bubble-wrapper");
      const existingViz = bubbleWrapper.querySelector(".message-visualization");
      if (existingViz) existingViz.remove();

      const vizEl = document.createElement("div");
      vizEl.className = "message-visualization";
      vizEl.innerHTML = `<img src="data:image/png;base64,${viz.imageBase64}" alt="Scene visualization" loading="lazy">`;
      bubbleWrapper.insertBefore(
        vizEl,
        bubbleWrapper.querySelector(".message-actions"),
      );

      QuillToast.show("Scene visualized!", "success");
    } catch (err) {
      console.error("[Visualize] Error:", err);
      QuillToast.show("Visualization failed: " + err.message, "error");
    } finally {
      if (vizBtn) {
        vizBtn.disabled = false;
        vizBtn.textContent = "🎨";
      }
    }
  },

  /**
   * Reset input state after streaming completes.
   */
  resetInput() {
    this.isStreaming = false;
    this.input.placeholder =
      "Direct the scene... (Enter to send, Shift+Enter for new line)";
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
      const position =
        this.messagesContainer.scrollHeight -
        this.messagesContainer.scrollTop -
        this.messagesContainer.clientHeight;

      if (position < threshold) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    });
  },

  /**
   * Open branch mode (Create a new divergent timeline from a message).
   */
  async openBranchMode(msg) {
    const confirm = window.confirm(
      "Fork this story from here? You will start a new parallel timeline.",
    );
    if (!confirm) return;

    try {
      const story = QuillApp.currentStory;
      story.activeBranchId = msg.id;

      // Update story cards to the snapshot of this message
      if (msg.cardSnapshot) {
        story.cards = msg.cardSnapshot;
        QuillCards.render(story.cards);
      }

      await QuillAPI.updateStory(story.id, {
        activeBranchId: msg.id,
        cards: story.cards,
      });

      // Re-render
      await this.render(story);
      QuillTree.render(story);

      QuillToast.show("Timeline forked! Type to begin a new path.", "success");

      // Focus input
      this.input.focus();
    } catch (err) {
      console.error("Failed to branch:", err);
      QuillToast?.show?.("Failed to fork timeline: " + err.message, "error");
    }
  },
};
