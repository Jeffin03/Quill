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
    this.showView("story-list-view");
    const hash = window.location.hash;
    if (hash.startsWith("#story/")) {
      const storyId = hash.replace("#story/", "");
      if (storyId) this.openStory(storyId);
    }
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
    safeBind("btn-new-story", "click", () => {
      this.openModal("modal-new-story");
    });

    // Create Story (in modal)
    safeBind("btn-create-story", "click", () => {
      this.createStory();
    });

    // Settings button
    safeBind("btn-settings", "click", () => {
      this.openApiManager();
    });

    // Story settings button (in workspace)
    safeBind("btn-story-settings", "click", () => {
      this.openStorySettingsModal();
    });

    // Save story settings
    safeBind("btn-save-story-settings", "click", () => {
      this.saveStorySettings();
    });

    // Home connection status pill click
    safeBind("home-connection-status", "click", () => {
      this.openApiManager();
    });

    // Settings: add connection button
    safeBind("btn-add-connection", "click", () => {
      this._stepperState = {
        step: 1,
        provider: "openrouter",
        entryId: null,
        capabilities: { text: true, comic: false },
      };
      this._showSettingsView("stepper");
      this._renderStepperStep();
    });

    // Settings: stepper nav
    safeBind("btn-step-next", "click", () => this._stepperNext());
    safeBind("btn-step-back", "click", () => this._stepperBack());

    // Settings: save defaults on change
    safeBind("input-llm-tokens", "change", () => this._saveSettingsDefaults());
    safeBind("input-llm-temp", "change", () => this._saveSettingsDefaults());
    safeBind("input-art-style", "change", () => this._saveSettingsDefaults());
    safeBind("input-uncensor-rewrite", "change", () =>
      this._saveSettingsDefaults(),
    );
    safeBind("input-sanitize-enabled", "change", () =>
      this._saveSettingsDefaults(),
    );

    // Back to stories
    safeBind("btn-back", "click", () => {
      this.currentStory = null;
      history.pushState(null, "", window.location.pathname);
      this.showView("story-list-view");
      QuillStoryList.loadStories();
    });

    // Import story from JSON file
    safeBind("btn-import-story", "click", async () => {
      try {
        const story = await QuillDB.importStory();
        QuillStoryList.loadStories();
        QuillToast.show(`"${story.title}" imported successfully!`, "success");
      } catch (err) {
        if (err.message !== "No file selected") {
          QuillToast.show("Failed to import: " + err.message, "error");
        }
      }
    });

    // Toggle tree panel
    safeBind("btn-toggle-tree", "click", () => {
      this.toggleTreePanel();
    });

    // Toggle cards panel
    safeBind("btn-toggle-cards", "click", () => {
      this.toggleCardsPanel();
    });

    // Add card button
    safeBind("btn-add-card", "click", () => {
      this.openAddCardModal();
    });

    // Save card (add card modal)
    safeBind("btn-save-card", "click", () => {
      this.saveNewCard();
    });

    // Magic cards button
    safeBind("btn-magic-cards", "click", () => {
      this.openModal("modal-magic-cards");
    });

    // Generate magic cards
    safeBind("btn-generate-magic", "click", () => {
      this.generateMagicCards();
    });

    // Add field button (in card modal)
    safeBind("btn-add-field", "click", () => {
      QuillCards.addFieldRow();
    });

    // ── Visual Timeline / Characters ──────────

    // Toggle scenes panel
    safeBind("btn-toggle-scenes", "click", () => {
      this.toggleScenesPanel();
    });

    // Add character from sidebar
    safeBind("btn-add-character", "click", () => {
      QuillCharacterDesign.openCreateModal();
    });

    // Save character
    safeBind("btn-save-character", "click", () => {
      QuillCharacterDesign.saveCharacter();
    });

    // Generate style prompt
    safeBind("btn-generate-style-prompt", "click", () => {
      QuillCharacterDesign.generateStylePrompt();
    });

    // Panel tab switching
    document.querySelectorAll(".panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.panel;
        const panel = tab.closest(".panel");
        if (!panel) return;

        // Deactivate all tabs and content in this panel
        panel
          .querySelectorAll(".panel-tab")
          .forEach((t) => t.classList.remove("active"));
        panel
          .querySelectorAll(".panel-tab-content")
          .forEach((c) => c.classList.remove("active"));

        // Activate clicked tab and its content
        tab.classList.add("active");
        const target = document.getElementById(targetId);
        if (target) target.classList.add("active");
      });
    });

    // Provider toggle show/hide settings
    safeBind("input-image-provider", "change", () => {
      this.toggleImageProviderSettings();
    });

    window.addEventListener("popstate", (e) => {
      if (e.state?.storyId) {
        this.openStory(e.state.storyId);
      } else {
        this.currentStory = null;
        this.showView("story-list-view");
        QuillStoryList.loadStories();
      }
    });

    // Modal close buttons
    document
      .querySelectorAll(".modal-close, .modal-footer .btn-ghost[data-modal]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const modalId = btn.dataset.modal;
          if (modalId) {
            if (modalId === "modal-settings") {
              QuillQR.stopScanner();
            }
            this.closeModal(modalId);
          }
        });
      });

    // Close modals on overlay click
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.add("hidden");
          QuillQR.stopScanner();
        }
      });
    });

    // Story title editing
    const titleEl = document.getElementById("story-title");
    if (titleEl) {
      titleEl.addEventListener("blur", () => {
        if (this.currentStory) {
          const newTitle = titleEl.textContent.trim();
          if (newTitle && newTitle !== this.currentStory.title) {
            this.currentStory.title = newTitle;
            QuillAPI.updateStory(this.currentStory.id, { title: newTitle });
          }
        }
      });

      titleEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
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
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
  },

  /**
   * Open a story by ID.
   */
  async openStory(id) {
    try {
      const story = await QuillAPI.getStory(id);
      this.currentStory = story;

      // Update header
      document.getElementById("story-title").textContent = story.title;
      const genreContainer = document.getElementById("story-meta");
      if (genreContainer) {
        genreContainer.innerHTML = ""; // Clear old badges

        const genres = Array.isArray(story.settings?.genre)
          ? story.settings.genre
          : [story.settings?.genre || "fiction"];
        genres.forEach((g) => {
          const badge = document.createElement("span");
          badge.className = "meta-badge";
          badge.textContent = g;
          genreContainer.appendChild(badge);
        });

        // Re-add pacing badge
        const pacingBadge = document.createElement("span");
        pacingBadge.id = "story-pacing";
        pacingBadge.className = "meta-badge";
        pacingBadge.textContent = story.settings?.pacing || "natural";
        genreContainer.appendChild(pacingBadge);
      }

      // Render all panels
      QuillChat.render(story);
      QuillCards.render(story.cards || []);
      QuillTree.render(story);
      QuillCharacterDesign.init(story.id);
      this.renderVisualTimeline();

      // Switch to workspace view
      this.showView("workspace-view");
      history.pushState({ storyId: id }, "", `#story/${id}`);
      // Auto-collapse panels on mobile
      if (window.innerWidth <= 768) {
        if (this.treePanelVisible) this.toggleTreePanel();
        if (this.cardsPanelVisible) this.toggleCardsPanel();
      }

      // Focus chat input
      setTimeout(() => document.getElementById("chat-input").focus(), 100);
    } catch (err) {
      console.error("Failed to open story:", err);
      alert("Failed to open story. It may have been deleted.");
    }
  },

  /**
   * Create a new story from modal inputs.
   */
  async createStory() {
    const title =
      document.getElementById("input-story-title").value.trim() ||
      "Untitled Story";
    const pacing = document.getElementById("input-story-pacing").value;
    const tone =
      document.getElementById("input-story-tone").value.trim() || "atmospheric";

    // Get all checked genres
    const genres = Array.from(
      document.querySelectorAll("#genre-checkboxes input:checked"),
    ).map((cb) => cb.value);

    try {
      const story = await QuillAPI.createStory({
        title,
        genre: genres.length > 0 ? genres : ["general fiction"],
        pacing,
        tone,
      });
      this.closeModal("modal-new-story");

      // Reset form
      document.getElementById("input-story-title").value = "";
      document.getElementById("input-story-tone").value = "atmospheric";

      // Open the new story
      this.openStory(story.id);
    } catch (err) {
      console.error("Failed to create story:", err);
      alert("Failed to create story.");
    }
  },

  /**
   * Toggle the tree panel visibility.
   */
  toggleTreePanel() {
    const panel = document.getElementById("tree-panel");
    const btn = document.getElementById("btn-toggle-tree");
    const overlay = document.getElementById("mobile-overlay");

    this.treePanelVisible = !this.treePanelVisible;
    panel.classList.toggle("collapsed", !this.treePanelVisible);
    btn.classList.toggle("active", this.treePanelVisible);

    if (window.innerWidth <= 768) {
      if (this.treePanelVisible) {
        if (this.cardsPanelVisible) this.toggleCardsPanel();
        if (overlay) overlay.classList.add("active");
      } else if (!this.cardsPanelVisible) {
        if (overlay) overlay.classList.remove("active");
      }
    }
  },

  /**
   * Toggle the cards panel visibility.
   */
  toggleCardsPanel() {
    const panel = document.getElementById("cards-panel");
    const btn = document.getElementById("btn-toggle-cards");
    const overlay = document.getElementById("mobile-overlay");

    this.cardsPanelVisible = !this.cardsPanelVisible;
    panel.classList.toggle("collapsed", !this.cardsPanelVisible);
    btn.classList.toggle("active", this.cardsPanelVisible);

    if (window.innerWidth <= 768) {
      if (this.cardsPanelVisible) {
        if (this.treePanelVisible) this.toggleTreePanel();
        if (overlay) overlay.classList.add("active");
      } else if (!this.treePanelVisible) {
        if (overlay) overlay.classList.remove("active");
      }
    }
  },

  /**
   * Toggle the visual timeline panel (switches left panel to Scenes tab).
   */
  toggleScenesPanel() {
    const scenesTab = document.querySelector('[data-panel="scenes-content"]');
    if (scenesTab) scenesTab.click();
    this.renderVisualTimeline();
  },

  /**
   * Render the visual timeline — all messages with visualizations.
   */
  async renderVisualTimeline() {
    const container = document.getElementById("visual-timeline");
    if (!container || !this.currentStory) return;

    const vizMessages = this.currentStory.messages.filter(
      (m) => m.visualization,
    );
    if (vizMessages.length === 0) {
      container.innerHTML =
        '<p class="visual-timeline-empty">No scenes visualized yet. Click 🎨 on any message to visualize it.</p>';
      return;
    }

    container.innerHTML = vizMessages
      .map(
        (msg) => `
      <div class="visual-scene-card" data-message-id="${msg.id}">
        <img src="data:image/png;base64,${msg.visualization.imageBase64}" alt="Scene" loading="lazy">
        <div class="visual-scene-card-info">
          <span>${QuillUtils.escapeHtml(msg.content.slice(0, 60))}${msg.content.length > 60 ? "..." : ""}</span>
          <div class="visual-scene-card-actions">
            <button class="btn btn-ghost btn-sm btn-delete-viz" data-message-id="${msg.id}" title="Remove visualization">×</button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".btn-delete-viz").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const messageId = btn.dataset.messageId;
          await QuillAPI.deleteVisualization(this.currentStory.id, messageId);
          const storyMsg = this.currentStory.messages.find(
            (m) => m.id === messageId,
          );
          if (storyMsg) storyMsg.visualization = null;
          this.renderVisualTimeline();
        } catch (err) {
          console.error("Failed to delete visualization:", err);
          QuillToast.show("Failed to remove visualization", "error");
        }
      });
    });
  },

  /**
   * Render the character list in the sidebar.
   */
  async renderCharacterList() {
    const container = document.getElementById("character-list");
    if (!container || !this.currentStory) return;

    const characters = await QuillDB.listCharacters(this.currentStory.id);
    if (characters.length === 0) {
      container.innerHTML =
        '<div class="characters-empty"><p>No characters yet. Create one to add a style prompt for visualizations.</p></div>';
      return;
    }

    container.innerHTML = characters
      .map(
        (c) => `
      <div class="character-card-inline" data-id="${c.id}">
        <div class="character-card-avatar">
          ${c.referenceImage ? `<img src="${c.referenceImage}" alt="${c.name}">` : `<span>${c.name[0]}</span>`}
        </div>
        <div class="character-card-info">
          <div class="character-card-name">${QuillUtils.escapeHtml(c.name)}</div>
          <div class="character-card-desc">${QuillUtils.escapeHtml(c.description?.slice(0, 50))}${c.description?.length > 50 ? "..." : ""}</div>
        </div>
        <div class="character-card-actions">
          <button class="btn btn-ghost btn-sm btn-edit-character" data-id="${c.id}" title="Edit">✎</button>
          <button class="btn btn-ghost btn-sm btn-delete-character" data-id="${c.id}" title="Delete">×</button>
        </div>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".btn-edit-character").forEach((btn) => {
      btn.addEventListener("click", () =>
        QuillCharacterDesign.openEditModal(btn.dataset.id),
      );
    });

    container.querySelectorAll(".btn-delete-character").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this character?")) return;
        try {
          await QuillDB.deleteCharacter(btn.dataset.id);
          this.renderCharacterList();
          QuillToast.show("Character deleted", "info");
        } catch (err) {
          console.error("Failed to delete character:", err);
          QuillToast.show("Failed to delete character", "error");
        }
      });
    });
  },

  /**
   * Open a modal by ID.
   */
  openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  },

  /**
   * Close a modal by ID.
   */
  closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  },
  // ── API Manager (Stepper) ────────────────

  _stepperState: {
    step: 1,
    provider: "openrouter",
    entryId: null, // null = adding new, string = editing existing
    capabilities: { text: true, comic: false },
  },

  toggleApiEntryFields() {
    // Legacy — no longer used by stepper but kept for safety
  },

  async openApiManager() {
    try {
      const config = await QuillAPI.getConfig();
      document.getElementById("input-llm-tokens").value =
        config.maxTokens || 2048;
      document.getElementById("input-llm-temp").value =
        config.temperature || 0.85;
      document.getElementById("input-art-style").value = config.artStyle || "";
      document.getElementById("input-uncensor-rewrite").checked =
        !!config.uncensorRewrite;
      document.getElementById("input-sanitize-enabled").checked =
        config.sanitizeEnabled !== false;
      this._renderConnectionsList(config.apiEntries || []);
      this._renderFeatureRouting(
        config.apiEntries || [],
        config.featureRouting || {},
      );
      this._showSettingsView("overview");
    } catch (err) {
      console.error("Failed to load config:", err);
    }
    this.openModal("modal-settings");
  },

  _showSettingsView(view) {
    const overview = document.getElementById("settings-overview");
    const stepper = document.getElementById("settings-stepper");
    const title = document.getElementById("settings-title");
    if (view === "stepper") {
      overview.classList.add("hidden");
      stepper.classList.remove("hidden");
      title.textContent = this._stepperState.entryId
        ? "Edit Connection"
        : "Add Connection";
    } else {
      overview.classList.remove("hidden");
      stepper.classList.add("hidden");
      title.textContent = "Settings";
    }
  },

  _renderConnectionsList(entries) {
    const list = document.getElementById("settings-connections-list");
    if (!list) return;
    if (!entries || entries.length === 0) {
      list.innerHTML =
        '<p class="settings-empty">No connections yet. Add one to get started.</p>';
      return;
    }
    const providerLabels = {
      openrouter: "OpenRouter",
      nim: "NVIDIA NIM",
      lmstudio: "LM Studio",
      ollama: "Ollama",
      comfyui: "ComfyUI",
    };
    list.innerHTML = entries
      .map((e, i) => {
        const caps = [];
        if (e.capabilities?.text)
          caps.push('<span class="connection-cap text">Text</span>');
        if (e.capabilities?.comic)
          caps.push('<span class="connection-cap comic">Image</span>');
        return `
        <div class="connection-card" data-index="${i}">
          <div class="connection-status" id="conn-status-${e.id}"></div>
          <div class="connection-info">
            <div class="connection-provider">${providerLabels[e.provider] || e.provider}</div>
            <div class="connection-model">${QuillUtils.escapeHtml(e.label)} · ${QuillUtils.escapeHtml(e.model || "Any")}</div>
          </div>
          <div class="connection-capabilities">${caps.join("")}</div>
          <div class="connection-actions">
            ${(e.provider === "ollama" || e.provider === "lmstudio") ? `<button class="btn btn-ghost btn-sm btn-scan-conn" data-action="scan" data-index="${i}" title="Scan QR to update URL">QR</button>` : ""}
            <button class="btn btn-ghost btn-sm" data-action="edit" data-index="${i}" title="Edit">✎</button>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-index="${i}" title="Remove">×</button>
          </div>
        </div>
      `;
      })
      .join("");

    list.querySelectorAll(".btn-sm").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index);
        if (btn.dataset.action === "edit") {
          this._startStepperEdit(entries[idx]);
        } else if (btn.dataset.action === "delete") {
          const removed = entries[idx];
          const updated = entries.filter((_, i) => i !== idx);
          const config = await QuillAPI.getConfig();
          await QuillAPI.updateConfig({ apiEntries: updated });
          this._renderConnectionsList(updated);
          this._renderFeatureRouting(updated, config.featureRouting || {});
          QuillToast.show(`Removed "${removed.label}"`, "info");
        } else if (btn.dataset.action === "scan") {
          this._scanQRForEntry(entries[idx]);
        }
      });
    });

    // Check connection status
    entries.forEach((e) => this._checkConnectionStatus(e));
  },

  async _scanQRForStepperHost() {
    const readerEl = document.getElementById("qr-reader-stepper");
    if (!readerEl) return;

    if (QuillQR.scanner) {
      await QuillQR.stopScanner();
      return;
    }

    readerEl.classList.remove("hidden");

    QuillQR.scanner = new Html5Qrcode("qr-reader-stepper");

    try {
      await QuillQR.scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText) => {
          await QuillQR.stopScanner();
          const hostEl = document.getElementById("stepper-host");
          if (hostEl) {
            hostEl.value = decodedText;
            hostEl.dispatchEvent(new Event("input", { bubbles: true }));
          }
          QuillToast.show(`Scanned: ${decodedText}`, "success");
        },
        () => {},
      );
    } catch (err) {
      console.error("Camera error:", err);
      QuillToast.show("Could not access camera. Check permissions.", "error");
      await QuillQR.stopScanner();
    }
  },

  async _scanQRForEntry(entry) {
    const readerEl = document.getElementById("qr-reader-settings");
    if (!readerEl) return;

    if (QuillQR.scanner) {
      await QuillQR.stopScanner();
      return;
    }

    readerEl.classList.remove("hidden");

    QuillQR.scanner = new Html5Qrcode("qr-reader-settings");
    QuillQR.urlInput = { value: "" }; // Temporary holder

    try {
      await QuillQR.scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText) => {
          await QuillQR.stopScanner();
          // Update the entry's host with scanned URL
          const config = await QuillAPI.getConfig();
          const entries = config.apiEntries || [];
          const updated = entries.map((e) =>
            e.id === entry.id ? { ...e, host: decodedText } : e,
          );
          await QuillAPI.updateConfig({ apiEntries: updated });
          this._renderConnectionsList(updated);
          this._renderFeatureRouting(updated, config.featureRouting || {});
          QuillToast.show(
            `Updated "${entry.label}" URL to ${decodedText}`,
            "success",
          );
        },
        () => {},
      );
    } catch (err) {
      console.error("Camera error:", err);
      QuillToast.show("Could not access camera. Check permissions.", "error");
      await QuillQR.stopScanner();
    }
  },

  _renderFeatureRouting(entries, routing) {
    const container = document.getElementById("settings-feature-routing");
    if (!container) return;
    if (!entries || entries.length === 0) {
      container.innerHTML =
        '<p class="settings-empty">Add a connection first.</p>';
      return;
    }
    const textEntries = entries.filter((e) => e.capabilities?.text);
    const comicEntries = entries.filter((e) => e.capabilities?.comic);
    const features = [
      { key: "story", label: "Story Generation", list: textEntries },
      { key: "cards", label: "Card Extraction", list: textEntries },
      { key: "prompts", label: "Style Prompts", list: textEntries },
      { key: "image", label: "Image Generation", list: comicEntries },
    ];
    container.innerHTML = features
      .map((f) => {
        const opts = f.list
          .map(
            (e) =>
              `<option value="${e.id}" ${routing[f.key] === e.id ? "selected" : ""}>${QuillUtils.escapeHtml(e.label)}</option>`,
          )
          .join("");
        return `
        <div class="feature-row">
          <span class="feature-label">${f.label}</span>
          <select class="feature-select" data-feature="${f.key}">
            <option value="">Auto</option>
            ${opts}
          </select>
        </div>
      `;
      })
      .join("");

    container.querySelectorAll(".feature-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const config = await QuillAPI.getConfig();
        const r = {
          ...config.featureRouting,
          [sel.dataset.feature]: sel.value || undefined,
        };
        if (!sel.value) delete r[sel.dataset.feature];
        await QuillAPI.updateConfig({ featureRouting: r });
      });
    });
  },

  // Strip any path from a URL so appending /v1/models doesn't double up
  _baseHost(url, fallback) {
    try {
      const u = new URL(url || fallback);
      return `${u.protocol}//${u.host}`;
    } catch {
      return (url || fallback).replace(/\/+$/, "");
    }
  },

  _startStepperEdit(entry) {
    this._stepperState = {
      step: 1,
      provider: entry.provider,
      entryId: entry.id,
      capabilities: { ...entry.capabilities },
    };
    this._showSettingsView("stepper");
    this._renderStepperStep();
  },

  async _checkConnectionStatus(entry) {
    const el = document.getElementById(`conn-status-${entry.id}`);
    if (!el) return;
    try {
      if (entry.provider === "ollama") {
        const host = this._baseHost(entry.host, "http://localhost:11434");
        const r = await fetch(`${host}/api/tags`, {
          signal: AbortSignal.timeout(3000),
        });
        el.classList.add(r.ok ? "online" : "offline");
      } else if (entry.provider === "lmstudio") {
        const host = this._baseHost(entry.host, "http://localhost:1234");
        const r = await fetch(`${host}/v1/models`, {
          signal: AbortSignal.timeout(3000),
        });
        el.classList.add(r.ok ? "online" : "offline");
      } else if (entry.provider === "comfyui") {
        const host = this._baseHost(entry.host, "http://localhost:8188");
        const r = await fetch(`${host}/system_stats`, {
          signal: AbortSignal.timeout(3000),
        });
        el.classList.add(r.ok ? "online" : "offline");
      } else {
        el.classList.add("online"); // Cloud providers assumed online
      }
    } catch {
      el.classList.add("offline");
    }
  },

  // ── Stepper Navigation ───────────────────

  _renderStepperStep() {
    const s = this._stepperState;
    // Update progress dots
    document.querySelectorAll(".stepper-step").forEach((el) => {
      const step = parseInt(el.dataset.step);
      el.classList.remove("active", "done");
      if (step === s.step) el.classList.add("active");
      else if (step < s.step) el.classList.add("done");
    });
    // Show/hide step content
    for (let i = 1; i <= 4; i++) {
      document
        .getElementById(`step-${i}`)
        ?.classList.toggle("hidden", i !== s.step);
    }
    // Nav buttons
    const back = document.getElementById("btn-step-back");
    const next = document.getElementById("btn-step-next");
    back.disabled = s.step === 1;
    next.textContent = s.step === 4 ? "Save" : "Next →";

    if (s.step === 1) this._renderStep1();
    else if (s.step === 2) this._renderStep2();
    else if (s.step === 3) this._renderStep3();
    else if (s.step === 4) this._renderStep4();
  },

  _stepperNext() {
    const s = this._stepperState;
    if (s.step < 4) {
      s.step++;
      this._renderStepperStep();
    } else {
      this._saveStepperEntry();
    }
  },

  _stepperBack() {
    if (this._stepperState.step > 1) {
      this._stepperState.step--;
      this._renderStepperStep();
    }
  },

  // ── Step 1: Provider ─────────────────────

  _renderStep1() {
    const s = this._stepperState;
    document.querySelectorAll(".provider-card").forEach((card) => {
      const p = card.dataset.provider;
      card.classList.toggle("selected", p === s.provider);
      card.querySelector("input").checked = p === s.provider;
      card.addEventListener("click", () => {
        s.provider = p;
        // Set default capabilities
        if (p === "nim" || p === "comfyui") {
          s.capabilities = { text: false, comic: true };
        } else {
          s.capabilities = { text: true, comic: false };
        }
        document.querySelectorAll(".provider-card").forEach((c) => {
          c.classList.toggle("selected", c.dataset.provider === p);
          c.querySelector("input").checked = c.dataset.provider === p;
        });
      });
    });
  },

  // ── Step 2: Credentials ──────────────────

  _renderStep2() {
    const s = this._stepperState;
    const container = document.getElementById("step-2-fields");
    const title = document.getElementById("step-2-title");
    const providerLabels = {
      openrouter: "OpenRouter",
      nim: "NVIDIA NIM",
      lmstudio: "LM Studio",
      ollama: "Ollama",
      comfyui: "ComfyUI",
    };
    title.textContent = `Configure ${providerLabels[s.provider]}`;

    if (
      s.provider === "lmstudio" ||
      s.provider === "ollama" ||
      s.provider === "comfyui"
    ) {
      const defaultHost =
        s.provider === "ollama"
          ? "http://localhost:11434"
          : s.provider === "comfyui"
            ? "http://localhost:8188"
            : "http://localhost:1234";
      const hint =
        s.provider === "ollama"
          ? "Ollama server URL"
          : s.provider === "comfyui"
            ? "ComfyUI server URL"
            : "LM Studio server URL";
      container.innerHTML = `
        <div class="form-group">
          <label for="stepper-label">Label</label>
          <input type="text" id="stepper-label" placeholder="${providerLabels[s.provider]}" autocomplete="off">
        </div>
        <div class="form-group">
          <label for="stepper-host">Host & Port</label>
          <div class="host-input-group">
            <input type="text" id="stepper-host" value="${defaultHost}" placeholder="${defaultHost}" autocomplete="off">
            <button class="btn btn-ghost btn-sm btn-scan-conn" id="btn-scan-stepper-host" title="Scan QR code to fill Host & Port">QR</button>
          </div>
          <small>${hint}</small>
          <div id="qr-reader-stepper" class="qr-reader-container hidden"></div>
        </div>
      `;

      // Wire up stepper QR scan
      const scanBtn = document.getElementById("btn-scan-stepper-host");
      if (scanBtn) {
        scanBtn.addEventListener("click", () => this._scanQRForStepperHost());
      }
    } else {
      container.innerHTML = `
        <div class="form-group">
          <label for="stepper-label">Label</label>
          <input type="text" id="stepper-label" placeholder="${providerLabels[s.provider]}" autocomplete="off">
        </div>
        <div class="form-group">
          <label for="stepper-apikey">API Key</label>
          <input type="password" id="stepper-apikey" placeholder="sk-or-... or nvapi-..." autocomplete="new-password">
        </div>
      `;
    }

    // If editing, pre-fill values
    if (s.entryId) {
      QuillAPI.getConfig()
        .then((c) => {
          const entry = (c.apiEntries || []).find((e) => e.id === s.entryId);
          if (entry) {
            const labelEl = document.getElementById("stepper-label");
            if (labelEl) labelEl.value = entry.label || "";
            const hostEl = document.getElementById("stepper-host");
            if (hostEl) hostEl.value = entry.host || "";
            const keyEl = document.getElementById("stepper-apikey");
            if (keyEl) keyEl.value = entry.apiKey || "";
          }
        })
        .catch((err) => console.error("Failed to pre-fill entry:", err));
    }
  },

  // ── Step 3: Model ────────────────────────

  async _renderStep3() {
    const s = this._stepperState;
    const datalist = document.getElementById("list-stepper-models");
    const input = document.getElementById("stepper-model");
    const status = document.getElementById("stepper-model-status");
    datalist.innerHTML = "";
    status.textContent = "";
    status.className = "model-status";

    if (s.provider === "openrouter") {
      status.textContent = "Loading free models...";
      status.className = "model-status loading";
      try {
        const models = await QuillImageGen.fetchFreeModels();
        const textModels = models.filter(
          (m) => !m.id.includes("flux") && !m.id.includes("dall-e"),
        );
        datalist.innerHTML = textModels
          .map((m) => `<option value="${m.id}">${m.name}</option>`)
          .join("");
        status.textContent = `${textModels.length} free models loaded`;
        status.className = "model-status success";
        input.placeholder = "Select a free model...";
      } catch {
        datalist.innerHTML = `
          <option value="nvidia/nemotron-3-super-120b-a12b:free">Nemotron 3 Super 120B (Recommended)</option>
          <option value="google/gemma-4-31b-it:free">Gemma 4 31B</option>
          <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra 550B (1M ctx)</option>
          <option value="openai/gpt-oss-20b:free">GPT-OSS 20B</option>
        `;
        status.textContent = "Could not load models — type manually";
        status.className = "model-status error";
      }
    } else if (s.provider === "nim") {
      QuillImageGen.NIM_MODELS.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        datalist.appendChild(opt);
      });
      input.placeholder = "Select an image model...";
    } else if (s.provider === "ollama" || s.provider === "lmstudio") {
      const hostEl = document.getElementById("stepper-host");
      const fallback = s.provider === "ollama" ? "http://localhost:11434" : "http://localhost:1234";
      const host = this._baseHost(hostEl?.value, fallback);
      status.textContent = "Fetching models...";
      status.className = "model-status loading";
      const apiPath = s.provider === "ollama" ? "/api/tags" : "/v1/models";
      try {
        const resp = await fetch(`${host}${apiPath}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) {
          const data = await resp.json();
          // Ollama: { models: [{ name }] }, LM Studio: { data: [{ id }] }
          const models = data.models || data.data || [];
          models.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m.name || m.id;
            opt.textContent = m.name || m.id;
            datalist.appendChild(opt);
          });
          status.textContent = `${models.length} models found`;
          status.className = "model-status success";
        } else {
          status.textContent = "Server unreachable — type model manually";
          status.className = "model-status error";
        }
      } catch {
        status.textContent = "Server unreachable — type model manually";
        status.className = "model-status error";
      }
      input.placeholder = "Enter model name...";
    } else if (s.provider === "comfyui") {
      const hostEl = document.getElementById("stepper-host");
      const host = this._baseHost(hostEl?.value, "http://localhost:8188");
      status.textContent = "Fetching checkpoints...";
      status.className = "model-status loading";
      try {
        const resp = await fetch(`${host}/object_info/CheckpointLoaderSimple`, {
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const models =
            data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
          models.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            datalist.appendChild(opt);
          });
          status.textContent = `${models.length} checkpoints found`;
          status.className = "model-status success";
        } else {
          status.textContent = "Server unreachable — type checkpoint manually";
          status.className = "model-status error";
        }
      } catch {
        status.textContent = "Server unreachable — type checkpoint manually";
        status.className = "model-status error";
      }
      input.placeholder = "Enter checkpoint name...";
    }

    // Pre-fill if editing
    if (s.entryId) {
      const c = await QuillAPI.getConfig();
      const entry = (c.apiEntries || []).find((e) => e.id === s.entryId);
      if (entry?.model) input.value = entry.model;
    }
  },

  // ── Step 4: Assign ───────────────────────

  _renderStep4() {
    const s = this._stepperState;
    const hint = document.getElementById("step-4-hint");
    const container = document.getElementById("step-4-assignments");

    const isText = s.capabilities.text;
    const isComic = s.capabilities.comic;

    // Auto-assign recommendations
    const features = [];
    if (isText) {
      features.push({
        key: "story",
        label: "Story Generation",
        recommended: true,
      });
      features.push({
        key: "cards",
        label: "Card Extraction",
        recommended: true,
      });
      features.push({
        key: "prompts",
        label: "Style Prompts",
        recommended: true,
      });
    }
    if (isComic) {
      features.push({
        key: "image",
        label: "Image Generation",
        recommended: true,
      });
    }

    if (features.length === 0) {
      hint.textContent = "No features to assign for this provider.";
      container.innerHTML = "";
      return;
    }

    hint.textContent = "Recommended assignments based on your provider:";

    const providerLabels = {
      openrouter: "OpenRouter",
      nim: "NVIDIA NIM",
      lmstudio: "LM Studio",
      ollama: "Ollama",
      comfyui: "ComfyUI",
    };
    container.innerHTML = features
      .map(
        (f) => `
      <div class="assignment-row recommended">
        <span class="assignment-label">${f.label} <span class="assignment-badge">${providerLabels[s.provider]}</span></span>
        <label class="checkbox-pill">
          <input type="checkbox" data-feature="${f.key}" checked> Assign
        </label>
      </div>
    `,
      )
      .join("");
  },

  async _saveStepperEntry() {
    const s = this._stepperState;
    const label =
      document.getElementById("stepper-label")?.value?.trim() || s.provider;
    const host = document.getElementById("stepper-host")?.value?.trim() || "";
    const apiKey =
      document.getElementById("stepper-apikey")?.value?.trim() || "";
    const model = document.getElementById("stepper-model")?.value?.trim() || "";

    // Validation
    if (
      (s.provider === "lmstudio" ||
        s.provider === "ollama" ||
        s.provider === "comfyui") &&
      !host
    ) {
      QuillToast.show("Enter the server host URL", "error");
      return;
    }
    if ((s.provider === "openrouter" || s.provider === "nim") && !apiKey) {
      QuillToast.show("Enter an API key", "error");
      return;
    }

    // Gather feature assignments
    const routing = {};
    document
      .querySelectorAll('#step-4-assignments input[type="checkbox"]')
      .forEach((cb) => {
        if (cb.checked) routing[cb.dataset.feature] = true; // will be replaced with entry ID
      });

    const entry = {
      id: s.entryId || QuillUtils.uuid(),
      provider: s.provider,
      label,
      apiKey,
      host,
      model,
      capabilities: { ...s.capabilities },
    };

    const config = await QuillAPI.getConfig();
    let entries = [...(config.apiEntries || [])];

    if (s.entryId) {
      entries = entries.map((e) => (e.id === s.entryId ? entry : e));
    } else {
      entries.push(entry);
    }

    // Build feature routing — map feature keys to this entry's ID
    const featureRouting = { ...(config.featureRouting || {}) };
    for (const [feat] of Object.entries(routing)) {
      // Only assign if feature wasn't already assigned to another entry, or if checkbox is checked
      featureRouting[feat] = entry.id;
    }
    // Remove assignments for features this entry doesn't support
    if (!entry.capabilities.text) {
      delete featureRouting.story;
      delete featureRouting.cards;
      delete featureRouting.prompts;
    }
    if (!entry.capabilities.comic) {
      delete featureRouting.image;
    }

    await QuillAPI.updateConfig({ apiEntries: entries, featureRouting });

    this._renderConnectionsList(entries);
    this._renderFeatureRouting(entries, featureRouting);
    this._showSettingsView("overview");

    QuillToast.show(
      s.entryId ? `Updated "${label}"` : `Added "${label}"`,
      "success",
    );

    // Reset stepper
    this._stepperState = {
      step: 1,
      provider: "openrouter",
      entryId: null,
      capabilities: { text: true, comic: false },
    };
  },

  async _saveSettingsDefaults() {
    const data = {
      maxTokens:
        parseInt(document.getElementById("input-llm-tokens").value) || 2048,
      temperature:
        parseFloat(document.getElementById("input-llm-temp").value) || 0.85,
      artStyle: document.getElementById("input-art-style").value.trim(),
      uncensorRewrite: document.getElementById("input-uncensor-rewrite")
        .checked,
      sanitizeEnabled: document.getElementById("input-sanitize-enabled")
        .checked,
    };
    await QuillAPI.updateConfig(data);
  },

  /**
   * Open the add card modal (fresh state).
   */
  openAddCardModal() {
    const saveBtn = document.getElementById("btn-save-card");
    saveBtn.textContent = "Add Card";
    saveBtn.onclick = () => this.saveNewCard();

    document.getElementById("input-card-type").value = "character";
    document.getElementById("input-card-title").value = "";
    document.getElementById("card-fields-list").innerHTML = "";
    QuillCards.addFieldRow();

    this.openModal("modal-add-card");
  },

  /**
   * Save a new card from the modal.
   */
  async saveNewCard() {
    const storyId = this.currentStory?.id;
    if (!storyId) return;

    const type = document.getElementById("input-card-type").value;
    const title = document.getElementById("input-card-title").value.trim();
    if (!title) {
      alert("Please enter a card title.");
      return;
    }

    const fields = {};
    document.querySelectorAll("#card-fields-list .field-row").forEach((row) => {
      const inputs = row.querySelectorAll("input");
      const k = inputs[0].value.trim();
      const v = inputs[1].value.trim();
      if (k) fields[k] = v;
    });

    try {
      const card = await QuillAPI.createCard(storyId, { type, title, fields });
      this.currentStory.cards.push(card);
      QuillCards.render(this.currentStory.cards);
      this.closeModal("modal-add-card");
    } catch (err) {
      console.error("Failed to create card:", err);
      alert("Failed to create card.");
    }
  },

  /**
   * Open story-specific settings.
   */
  openStorySettingsModal() {
    if (!this.currentStory) return;
    const settings = this.currentStory.settings || {};

    document.getElementById("edit-story-pacing").value =
      settings.pacing || "natural";
    document.getElementById("edit-story-tone").value =
      settings.tone || "atmospheric";

    // Set checkboxes
    const currentGenres = Array.isArray(settings.genre)
      ? settings.genre
      : [settings.genre || "general fiction"];
    document.querySelectorAll("#edit-genre-checkboxes input").forEach((cb) => {
      cb.checked = currentGenres.includes(cb.value);
    });

    this.openModal("modal-story-settings");
  },

  /**
   * Save story-specific settings.
   */
  async saveStorySettings() {
    if (!this.currentStory) return;

    // Get checked genres
    const genres = Array.from(
      document.querySelectorAll("#edit-genre-checkboxes input:checked"),
    ).map((cb) => cb.value);

    const settings = {
      genre: genres.length > 0 ? genres : ["general fiction"],
      pacing: document.getElementById("edit-story-pacing").value,
      tone:
        document.getElementById("edit-story-tone").value.trim() ||
        "atmospheric",
    };

    const previousSettings = { ...(this.currentStory.settings || {}) };
    try {
      await QuillAPI.updateStory(this.currentStory.id, { settings });
      this.currentStory.settings = settings;

      // Update UI Header
      const genreContainer = document.getElementById("story-meta");
      if (genreContainer) {
        genreContainer.innerHTML = "";

        // Add genre badges
        settings.genre.forEach((g) => {
          const badge = document.createElement("span");
          badge.className = "meta-badge";
          badge.textContent = g;
          genreContainer.appendChild(badge);
        });

        // Re-add pacing badge
        const pacingBadge = document.createElement("span");
        pacingBadge.id = "story-pacing";
        pacingBadge.className = "meta-badge";
        pacingBadge.textContent = settings.pacing;
        genreContainer.appendChild(pacingBadge);
      }

      this.closeModal("modal-story-settings");
      QuillToast.show("Story settings updated!");
    } catch (err) {
      this.currentStory.settings = previousSettings;
      console.error("Failed to save story settings:", err);
      QuillToast.show("Failed to save settings", "error");
    }
  },

  /**
   * Generate cards from a premise using AI.
   */
  async generateMagicCards() {
    const premise = document.getElementById("input-magic-premise").value.trim();
    if (!premise) {
      alert("Please enter a premise or some story text first!");
      return;
    }

    const btn = document.getElementById("btn-generate-magic");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Analyzing...";

    try {
      const storyId = this.currentStory?.id;
      if (!storyId) throw new Error("No active story");

      const newCards = await QuillAPI.generateCardsFromPremise(
        storyId,
        premise,
      );

      // Update local state
      this.currentStory.cards = newCards;
      QuillCards.render(newCards);

      this.closeModal("modal-magic-cards");
      QuillToast.show(`Generated ${newCards.length} context cards!`, "success");

      // Reset input
      document.getElementById("input-magic-premise").value = "";
    } catch (err) {
      console.error("Magic cards failure:", err);
      QuillToast.show("Failed to generate cards: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },

  /**
   * Set up PWA update flow. Never requires clearing site data.
   * When a new SW is detected, shows a toast; on click, activates the
   * new SW and reloads. IndexedDB is untouched across reloads.
   */
  checkUpdates() {
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const safeReload = () => {
      if (reloading) return;
      reloading = true;
      QuillToast.show("Updating app…", "info", 0);
      setTimeout(() => window.location.reload(), 500);
    };

    // When a new SW takes control (after user clicked "Update"), reload
    navigator.serviceWorker.addEventListener("controllerchange", safeReload);

    // Defer to the registration stored by index.html's script
    const checkReg = () => {
      const reg = window.__QUILL_SW_REG;
      if (!reg) { setTimeout(checkReg, 200); return; }

      // If a new SW is already waiting, show the button immediately
      if (reg.waiting) {
        QuillToast.show(
          "Update available — click to apply",
          "info",
          0,
          () => reg.waiting.postMessage({ type: "SKIP_WAITING" }),
        );
      }

      // Watch for new SW installs in the future
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            QuillToast.show(
              "Update available — click to apply",
              "info",
              0,
              () => (reg.waiting || installing).postMessage({ type: "SKIP_WAITING" }),
            );
          }
        });
      });
    };
    checkReg();
  },
  /**
   * Check if the LLM server is reachable.
   */
  async checkConnection() {
    const statusEl = document.getElementById("connection-status");
    const homeStatusEl = document.getElementById("home-connection-status");
    const homeStatusText = homeStatusEl?.querySelector(".status-text");

    try {
      const config = await QuillAPI.getConfig();
      const textEntry = (config.apiEntries || []).find(
        (e) => e.capabilities?.text,
      );
      if (!textEntry) {
        if (statusEl) statusEl.className = "connection-status";
        if (homeStatusEl) {
          homeStatusEl.className = "connection-status-pill offline";
          if (homeStatusText)
            homeStatusText.textContent = "LLM: Not Configured";
        }
        return;
      }

      const host = this._baseHost(
        textEntry.host,
        textEntry.provider === "ollama"
          ? "http://localhost:11434"
          : textEntry.provider === "lmstudio"
            ? "http://localhost:1234"
            : textEntry.provider === "comfyui"
              ? "http://localhost:8188"
              : textEntry.provider === "openrouter"
                ? "https://openrouter.ai"
                : "",
      );
      if (!host) {
        if (statusEl) statusEl.className = "connection-status offline";
        if (homeStatusEl) {
          homeStatusEl.className = "connection-status-pill offline";
          if (homeStatusText) homeStatusText.textContent = "LLM: Offline";
        }
        return;
      }

      const apiPath =
        textEntry.provider === "ollama"
          ? "/api/tags"
          : textEntry.provider === "lmstudio"
            ? "/v1/models"
            : textEntry.provider === "comfyui"
              ? "/system_stats"
              : "/models";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const resp = await fetch(host + apiPath, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          if (statusEl) statusEl.className = "connection-status online";
          if (homeStatusEl) {
            homeStatusEl.className = "connection-status-pill online";
            if (homeStatusText) homeStatusText.textContent = "LLM: Online";
          }
        } else {
          throw new Error("Not OK");
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (statusEl) statusEl.className = "connection-status offline";
        if (homeStatusEl) {
          homeStatusEl.className = "connection-status-pill offline";
          if (homeStatusText) homeStatusText.textContent = "LLM: Offline";
        }
      }
    } catch (err) {
      if (statusEl) statusEl.className = "connection-status offline";
      if (homeStatusEl) {
        homeStatusEl.className = "connection-status-pill offline";
        if (homeStatusText) homeStatusText.textContent = "LLM: Offline";
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

  toggleImageProviderSettings() {
    const provider = document.getElementById("input-image-provider")?.value;
    const nimBlock = document.getElementById("nim-settings-block");
    const lmBlock = document.getElementById("lmstudio-settings-block");
    if (!provider) return;
    if (provider === "nim") {
      nimBlock?.classList.remove("hidden");
      lmBlock?.classList.add("hidden");
    } else {
      nimBlock?.classList.add("hidden");
      lmBlock?.classList.remove("hidden");
    }
  },
};

/**
 * Simple Toast Notification System
 */
window.QuillToast = {
  init() {
    this.container = document.getElementById("toast-container");
  },
  show(message, type = "info", duration = 4000, onClick = null) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">${message}</div>
      <button class="toast-close">×</button>
    `;

    if (onClick) {
      toast.style.cursor = "pointer";
      toast.addEventListener("click", (e) => {
        if (!e.target.classList.contains("toast-close")) onClick();
      });
    }

    toast.querySelector(".toast-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.remove(toast);
    });

    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
  },
  remove(toast) {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  },
};

// ── Boot ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  QuillApp.init();
});
