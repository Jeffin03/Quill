/* ══════════════════════════════════════════
   Quill — IndexedDB Storage Layer
   Replaces the Node.js file system backend.
   All story and settings data lives in the
   browser's local IndexedDB database.
   ══════════════════════════════════════════ */

window.QuillDB = (() => {
  const DB_NAME = "QuillStudio";
  const DB_VERSION = 2;
  let db = null;

  /**
   * Open (or create) the IndexedDB database.
   * Returns a promise that resolves to the db instance.
   */
  function open() {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        // v1: Stories + Settings stores
        if (!database.objectStoreNames.contains("stories")) {
          database.createObjectStore("stories", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("settings")) {
          database.createObjectStore("settings", { keyPath: "key" });
        }

        // v2: Characters + Comics stores
        if (!database.objectStoreNames.contains("characters")) {
          database.createObjectStore("characters", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("comics")) {
          database.createObjectStore("comics", { keyPath: "id" });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Generic helper: run a transaction on a store.
   */
  async function tx(storeName, mode, fn) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = fn(store);

      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ── Stories ──────────────────────────────

  async function listStories() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("stories", "readonly");
      const store = transaction.objectStore("stories");
      const request = store.getAll();
      request.onsuccess = () => {
        // Return only metadata (no messages) for the list view
        const stories = request.result.map((s) => ({
          id: s.id,
          title: s.title,
          settings: s.settings,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          messageCount: s.messages?.length || 0,
        }));
        // Sort by most recently updated
        stories.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        resolve(stories);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getStory(id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("stories", "readonly");
      const store = transaction.objectStore("stories");
      const request = store.get(id);
      request.onsuccess = async () => {
        const story = request.result;
        if (!story) return resolve(null);

        // MIGRATION: Handle old linear stories
        let changed = false;
        if (!story.messages) story.messages = [];

        if (story.messages.length > 0 && !story.activeBranchId) {
          console.log(`[Migration] Migrating linear story: ${story.title}`);
          story.rootMessageId = story.messages[0].id;

          for (let i = 0; i < story.messages.length; i++) {
            const msg = story.messages[i];
            if (!msg.parentId && i > 0) msg.parentId = story.messages[i - 1].id;
            if (!msg.cardSnapshot) msg.cardSnapshot = story.cards || [];
          }

          story.activeBranchId = story.messages[story.messages.length - 1].id;
          changed = true;
        }

        if (changed) {
          // We can't save in a readonly transaction, but we'll return the migrated object
          // and the next 'saveStory' call (which happens often) will persist it.
          console.log(`[Migration] Story ${id} migrated in-memory.`);
        }

        resolve(story);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function saveStory(story) {
    story.updatedAt = new Date().toISOString();
    await tx("stories", "readwrite", (store) => store.put(story));
    return story;
  }

  async function deleteStory(id) {
    await tx("stories", "readwrite", (store) => store.delete(id));
  }

  // ── Settings / Config ────────────────────

  const DEFAULT_CONFIG = {
    key: "config",
    apiEntries: [],
    featureRouting: {},
    maxTokens: 2048,
    temperature: 0.85,
    artStyle:
      "semi-realistic digital painting, manhwa style, dramatic lighting",
    recentModels: [
      "hf.co/mradermacher/Llama-3.2-3B-Instruct-Abliterated-GGUF",
      "dolphin-llama3",
    ],
    openrouterFreeModels: [],
    openrouterFreeModelsFetched: null,
    uncensorRewrite: false,
  };

  async function getConfig() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("settings", "readonly");
      const store = transaction.objectStore("settings");
      const request = store.get("config");
      request.onsuccess = () => resolve(request.result || DEFAULT_CONFIG);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveConfig(data) {
    const existing = await getConfig();
    const merged = { ...existing, ...data, key: "config" };
    await tx("settings", "readwrite", (store) => store.put(merged));
    return merged;
  }

  // ── Import / Export ──────────────────────

  /**
   * Export a single story as a downloadable JSON file.
   */
  async function exportStory(id) {
    const story = await getStory(id);
    if (!story) throw new Error("Story not found");

    const blob = new Blob([JSON.stringify(story, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, "_")}_quill.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import a story from a JSON file. Opens a file picker.
   */
  function importStory() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return reject(new Error("No file selected"));

        try {
          const text = await file.text();
          const story = JSON.parse(text);
          if (!story.id || !story.title) throw new Error("Invalid story file");
          await saveStory(story);
          resolve(story);
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }

  // ── Characters ────────────────────────────

  async function listCharacters(storyId) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("characters", "readonly");
      const store = transaction.objectStore("characters");
      const request = store.getAll();
      request.onsuccess = () => {
        const chars = request.result.filter((c) => c.storyId === storyId);
        chars.sort((a, b) => a.name.localeCompare(b.name));
        resolve(chars);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getCharacter(id) {
    return tx("characters", "readonly", (store) => store.get(id));
  }

  async function saveCharacter(char) {
    char.updatedAt = new Date().toISOString();
    await tx("characters", "readwrite", (store) => store.put(char));
    return char;
  }

  async function deleteCharacter(id) {
    await tx("characters", "readwrite", (store) => store.delete(id));
  }

  // ── Comics ────────────────────────────────

  async function listComics(storyId) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("comics", "readonly");
      const store = transaction.objectStore("comics");
      const request = store.getAll();
      request.onsuccess = () => {
        const comics = request.result.filter((c) => c.storyId === storyId);
        comics.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        resolve(
          comics.map((c) => ({
            id: c.id,
            storyId: c.storyId,
            title: c.title,
            panelCount: c.panels?.length || 0,
            artStyle: c.artStyle,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getComic(id) {
    return tx("comics", "readonly", (store) => store.get(id));
  }

  async function saveComic(comic) {
    comic.updatedAt = new Date().toISOString();
    await tx("comics", "readwrite", (store) => store.put(comic));
    return comic;
  }

  async function deleteComic(id) {
    await tx("comics", "readwrite", (store) => store.delete(id));
  }

  return {
    open,
    listStories,
    getStory,
    saveStory,
    deleteStory,
    getConfig,
    saveConfig,
    exportStory,
    importStory,
    listCharacters,
    getCharacter,
    saveCharacter,
    deleteCharacter,
    listComics,
    getComic,
    saveComic,
    deleteComic,
  };
})();
