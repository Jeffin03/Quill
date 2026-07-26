/* ══════════════════════════════════════════
   Quill — QR Scanner Module
   ══════════════════════════════════════════ */

window.QuillQR = {
  scanner: null,

  init() {
    // placeholder — scanner is created on demand
  },

  async stopScanner() {
    if (this.scanner) {
      try {
        await this.scanner.stop();
      } catch (e) {}
      this.scanner = null;
    }
    const el = document.getElementById("qr-reader-settings");
    if (el) {
      el.classList.add("hidden");
      el.innerHTML = "";
    }
  },
};
