window.QuillCharacterDesign = {
  currentStoryId: null,

  async init(storyId) {
    this.currentStoryId = storyId;
    await this.render();
  },

  async render() {
    const container = document.getElementById("character-list");
    if (!container) return;
    const characters = await QuillDB.listCharacters(this.currentStoryId);
    if (characters.length === 0) {
      container.innerHTML = `<div class="characters-empty"><p>No characters yet. Create one to add a style prompt.</p></div>`;
      return;
    }
    container.innerHTML = characters
      .map(
        (c) => `
      <div class="character-card" data-id="${c.id}">
        <div class="character-card-avatar">
          ${c.referenceImage ? `<img src="${c.referenceImage}" alt="${c.name}">` : `<span class="character-initial">${c.name[0]}</span>`}
        </div>
        <div class="character-card-info">
          <div class="character-card-name">${QuillUtils.escapeHtml(c.name)}</div>
          <div class="character-card-desc">${QuillUtils.escapeHtml(c.description?.slice(0, 80))}${c.description?.length > 80 ? "..." : ""}</div>
        </div>
        <div class="character-card-actions">
          <button class="btn btn-ghost btn-sm btn-edit-character" data-id="${c.id}">Edit</button>
          <button class="btn btn-ghost btn-sm btn-delete-character" data-id="${c.id}">×</button>
        </div>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".btn-edit-character").forEach((btn) => {
      btn.addEventListener("click", () => this.openEditModal(btn.dataset.id));
    });
    container.querySelectorAll(".btn-delete-character").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteCharacter(btn.dataset.id));
    });
  },

  async openCreateModal() {
    const modal = document.getElementById("modal-character");
    if (!modal) return;
    document.getElementById("modal-character-title").textContent =
      "Create Character";
    document.getElementById("input-character-id").value = "";
    document.getElementById("input-character-name").value = "";
    document.getElementById("input-character-description").value = "";
    document.getElementById("input-character-refimage").value = "";
    document.getElementById("character-refimage-preview").innerHTML = "";
    document.getElementById("input-character-style-prompt").value = "";
    modal.classList.remove("hidden");
  },

  async openEditModal(id) {
    const char = await QuillDB.getCharacter(id);
    if (!char) return;
    const modal = document.getElementById("modal-character");
    if (!modal) return;
    document.getElementById("modal-character-title").textContent =
      "Edit Character";
    document.getElementById("input-character-id").value = char.id;
    document.getElementById("input-character-name").value = char.name;
    document.getElementById("input-character-description").value =
      char.description || "";
    document.getElementById("input-character-refimage").value = "";
    const preview = document.getElementById("character-refimage-preview");
    preview.innerHTML = char.referenceImage
      ? `<img src="${char.referenceImage}" style="max-width:120px;border-radius:6px;">`
      : "";
    document.getElementById("input-character-style-prompt").value =
      char.stylePrompt || "";
    modal.classList.remove("hidden");
  },

  async saveCharacter() {
    const id = document.getElementById("input-character-id").value;
    const name = document.getElementById("input-character-name").value.trim();
    const description = document
      .getElementById("input-character-description")
      .value.trim();
    const stylePrompt = document
      .getElementById("input-character-style-prompt")
      .value.trim();
    const refImageInput = document.getElementById("input-character-refimage");
    let referenceImage = null;

    try {
      if (refImageInput.files?.[0]) {
        referenceImage = await this.fileToBase64(refImageInput.files[0]);
      } else if (!id) {
        referenceImage = null;
      }

      if (!name) {
        QuillToast.show("Character name is required", "error");
        return;
      }

      if (id) {
        const existing = await QuillDB.getCharacter(id);
        await QuillDB.saveCharacter({
          ...existing,
          name,
          description,
          referenceImage: referenceImage || existing.referenceImage,
          stylePrompt,
        });
      } else {
        await QuillAPI.createCharacter({
          storyId: this.currentStoryId,
          name,
          description,
          referenceImage,
          stylePrompt,
        });
      }

      this.closeModal();
      await this.render();
    } catch (err) {
      console.error("Failed to save character:", err);
      QuillToast.show("Failed to save character", "error");
    }
  },

  async deleteCharacter(id) {
    if (!confirm("Delete this character?")) return;
    try {
      await QuillDB.deleteCharacter(id);
      await this.render();
    } catch (err) {
      console.error("Failed to delete character:", err);
      QuillToast.show("Failed to delete character", "error");
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async generateStylePrompt() {
    const description = document
      .getElementById("input-character-description")
      ?.value?.trim();
    const fileInput = document.getElementById("input-character-refimage");
    if (!description && !fileInput?.files?.[0]) {
      QuillToast.show(
        "Enter a description or upload a reference image first",
        "error",
      );
      return;
    }

    let systemContent =
      "You are an expert at writing image generation prompts for character design.";
    let userContent = `Write a concise visual character design prompt for an AI image generator based on this description. Format: physical appearance, clothing style, expression, lighting. Keep it under 200 words.\n\nDescription: ${description || "A character"}`;

    if (fileInput?.files?.[0]) {
      systemContent =
        "You are an expert at writing image generation prompts for character design. You can analyze reference images to create accurate visual prompts.";
      userContent = `Write a concise visual character design prompt for an AI image generator based on this description and reference image. Include relevant visual details from both. Keep it under 200 words.\n\nDescription: ${description || "A character based on the reference image"}`;
    }

    const field = document.getElementById("input-character-style-prompt");
    if (field) field.value = "Generating...";

    try {
      const config = await QuillDB.getConfig();
      const textEntry =
        QuillLLM.getPromptEntry(config) ||
        config.apiEntries?.find((e) => e.capabilities?.text);

      if (!textEntry) {
        QuillToast.show("No text-capable API configured", "error");
        if (field) field.value = "";
        return;
      }

      const messages = [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ];

      const content = await QuillLLM.chatWithEntry(textEntry, messages, {
        maxTokens: 300,
        temperature: 0.7,
      });
      const clean = content.replace(/^["']|["']$/g, "").trim();
      if (field) field.value = clean || "";
      if (clean) {
        QuillToast.show("Style prompt generated!", "success");
      } else {
        QuillToast.show("Generated prompt was empty", "error");
      }
    } catch (err) {
      QuillToast.show("Failed to generate: " + err.message, "error");
      if (field) field.value = "";
    }
  },

  closeModal() {
    const modal = document.getElementById("modal-character");
    if (modal) modal.classList.add("hidden");
  },
};
