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
    ["qr-reader-settings", "qr-reader-stepper"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.innerHTML = "";
      }
    });
  },
};
