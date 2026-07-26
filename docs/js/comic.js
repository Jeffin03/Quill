window.QuillComic = {
  currentStoryId: null,
  currentComic: null,
  generating: false,

  async open(storyId) {
    this.currentStoryId = storyId;
    const comics = await QuillDB.listComics(storyId);
    if (comics.length === 0) {
      this.openNewComicModal();
    } else {
      this.currentComic = await QuillDB.getComic(comics[0].id);
      this.render();
    }
  },

  async createComic(title) {
    const comic = await QuillAPI.createComic({
      storyId: this.currentStoryId,
      title,
    });
    this.currentComic = comic;
    this.render();
  },

  async saveComic() {
    if (!this.currentComic) return;
    this.currentComic.title =
      document.getElementById("comic-title").textContent.trim() ||
      "Untitled Comic";
    await QuillDB.saveComic(this.currentComic);
    QuillToast.show("Comic saved!", "success");
  },

  async render() {
    if (!this.currentComic) return;
    QuillApp.showView("comic-view");
    document.getElementById("comic-title").textContent =
      this.currentComic.title;
    this.renderPanels();
    await this.renderCharacters();
  },

  // ── Panels ────────────────────────────────

  renderPanels() {
    const grid = document.getElementById("comic-panel-grid");
    if (!grid) return;
    const panels = this.currentComic.panels || [];
    if (panels.length === 0) {
      grid.innerHTML = `<div class="comic-empty"><p>Add panels to generate your comic</p></div>`;
      return;
    }
    grid.innerHTML = panels
      .map(
        (p, i) => `
      <div class="comic-panel" data-panel-id="${p.id}">
        ${p.imageBase64 ? `<img src="data:image/png;base64,${p.imageBase64}" alt="Panel ${i + 1}">` : `<div class="comic-panel-loading">${this.generating ? "Generating..." : "Click ▼ to generate"}</div>`}
        ${p.dialogue ? `<div class="comic-panel-overlay"><div class="comic-speech-bubble ${i % 2 === 0 ? "top" : "bottom"}">${QuillUtils.escapeHtml(p.dialogue)}</div></div>` : ""}
        <div class="comic-panel-actions">
          <button class="btn-panel-edit" data-panel-id="${p.id}" title="Edit">✎</button>
          <button class="btn-panel-generate" data-panel-id="${p.id}" title="Generate image">🎨</button>
          <button class="btn-panel-delete" data-panel-id="${p.id}" title="Delete">×</button>
        </div>
      </div>
    `,
      )
      .join("");

    grid.querySelectorAll(".btn-panel-edit").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.openEditPanelModal(btn.dataset.panelId),
      );
    });
    grid.querySelectorAll(".btn-panel-generate").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.generatePanelImage(btn.dataset.panelId),
      );
    });
    grid.querySelectorAll(".btn-panel-delete").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.deletePanel(btn.dataset.panelId),
      );
    });
  },

  async openAddPanelModal() {
    document.getElementById("modal-panel-title").textContent = "Add Panel";
    document.getElementById("input-panel-id").value = "";
    document.getElementById("input-panel-scene").value = "";
    document.getElementById("input-panel-dialogue").value = "";
    document.getElementById("input-panel-prompt").value = "";
    document.getElementById("panel-image-preview").classList.add("hidden");
    await this.populatePanelCharacterCheckboxes();
    document.getElementById("modal-panel").classList.remove("hidden");
  },

  async openEditPanelModal(panelId) {
    const panel = this.currentComic.panels.find((p) => p.id === panelId);
    if (!panel) return;
    document.getElementById("modal-panel-title").textContent = "Edit Panel";
    document.getElementById("input-panel-id").value = panel.id;
    document.getElementById("input-panel-scene").value =
      panel.sceneDescription || "";
    document.getElementById("input-panel-dialogue").value =
      panel.dialogue || "";
    document.getElementById("input-panel-prompt").value = panel.prompt || "";
    const preview = document.getElementById("panel-image-preview");
    if (panel.imageBase64) {
      document.getElementById("panel-image-img").src =
        `data:image/png;base64,${panel.imageBase64}`;
      preview.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
    }
    await this.populatePanelCharacterCheckboxes(panel.characterIds || []);
    document.getElementById("modal-panel").classList.remove("hidden");
  },

  async populatePanelCharacterCheckboxes(selected = []) {
    const container = document.getElementById("panel-character-checkboxes");
    const chars = await QuillDB.listCharacters(this.currentStoryId);
    if (chars.length === 0) {
      container.innerHTML =
        '<p style="color:var(--text-muted);font-size:13px;">No characters created yet.</p>';
      return;
    }
    container.innerHTML = chars
      .map(
        (c) => `
      <label class="checkbox-pill">
        <input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}>
        ${QuillUtils.escapeHtml(c.name)}
      </label>
    `,
      )
      .join("");
  },

  async savePanel() {
    const panelId = document.getElementById("input-panel-id").value;
    const sceneDescription = document
      .getElementById("input-panel-scene")
      .value.trim();
    const dialogue = document
      .getElementById("input-panel-dialogue")
      .value.trim();
    const prompt = document.getElementById("input-panel-prompt").value.trim();
    const characterIds = Array.from(
      document.querySelectorAll("#panel-character-checkboxes input:checked"),
    ).map((cb) => cb.value);

    if (!sceneDescription) {
      QuillToast.show("Scene description is required", "error");
      return null;
    }

    const data = { sceneDescription, dialogue, prompt, characterIds };
    let savedPanelId = panelId;

    if (panelId) {
      await QuillAPI.updatePanel(this.currentComic.id, panelId, data);
    } else {
      const newPanel = await QuillAPI.addPanel(this.currentComic.id, data);
      savedPanelId = newPanel.id;
      document.getElementById("input-panel-id").value = newPanel.id;
    }

    this.currentComic = await QuillDB.getComic(this.currentComic.id);
    this.renderPanels();
    return savedPanelId;
  },

  async deletePanel(panelId) {
    if (!confirm("Delete this panel?")) return;
    try {
      await QuillAPI.deletePanel(this.currentComic.id, panelId);
      this.currentComic = await QuillDB.getComic(this.currentComic.id);
      this.renderPanels();
    } catch (err) {
      console.error("Failed to delete panel:", err);
      QuillToast.show("Failed to delete panel", "error");
    }
  },

  closePanelModal() {
    document.getElementById("modal-panel").classList.add("hidden");
  },

  // ── Image Generation ──────────────────────

  async generatePanelImage(panelId) {
    if (this.generating) return;
    const panel = this.currentComic.panels.find((p) => p.id === panelId);
    if (!panel) return;

    this.generating = true;
    this.renderPanels();

    try {
      const config = await QuillDB.getConfig();
      const chars = (await QuillDB.listCharacters(this.currentStoryId)) || [];
      const panelChars = chars.filter((c) =>
        (panel.characterIds || []).includes(c.id),
      );

      let prompt = panel.prompt || panel.sceneDescription || "";

      if (!prompt || panel.prompt === "") {
        const promptParts = [];
        if (config.artStyle) promptParts.push(config.artStyle);
        panelChars.forEach((c) => {
          if (c.stylePrompt) promptParts.push(c.stylePrompt);
        });
        promptParts.push(panel.sceneDescription);
        prompt = promptParts.join(", ");
      }

      const imageBase64 = await QuillImageGen.generateImage({ prompt });

      if (!imageBase64) throw new Error("No image returned");

      await QuillAPI.updatePanel(this.currentComic.id, panelId, {
        imageBase64,
        prompt,
      });
      this.currentComic = await QuillDB.getComic(this.currentComic.id);
      QuillToast.show("Panel image generated!", "success");
    } catch (err) {
      QuillToast.show("Image generation failed: " + err.message, "error");
      console.error("[Comic] Generation error:", err);
    } finally {
      this.generating = false;
      this.renderPanels();
    }
  },

  async renderCharacters() {
    if (!this.currentStoryId) return;
    await QuillCharacterDesign.init(this.currentStoryId);
  },

  openNewComicModal() {
    document.getElementById("input-comic-title").value = "";
    document.getElementById("modal-new-comic").classList.remove("hidden");
  },
};
