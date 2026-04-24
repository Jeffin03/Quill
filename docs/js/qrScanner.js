/* ══════════════════════════════════════════
   Quill — QR Scanner Module
   ══════════════════════════════════════════ */

window.QuillQR = {
  scanner: null,

  init() {
    this.scanBtn = document.getElementById('btn-scan-qr');
    this.readerEl = document.getElementById('qr-reader');
    this.urlInput = document.getElementById('input-llm-url');

    if (this.scanBtn) {
      this.scanBtn.addEventListener('click', () => this.toggleScanner());
    }
  },

  async toggleScanner() {
    if (this.scanner) {
      await this.stopScanner();
      return;
    }

    this.readerEl.classList.remove('hidden');
    this.scanBtn.textContent = '⏹';
    this.scanBtn.classList.add('active');

    this.scanner = new Html5Qrcode("qr-reader");

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    try {
      await this.scanner.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
          this.urlInput.value = decodedText;
          this.stopScanner();
          // Visual feedback
          this.urlInput.style.borderColor = 'var(--color-world)';
          setTimeout(() => this.urlInput.style.borderColor = '', 1000);
        },
        (errorMessage) => {
          // ignore scan errors (they happen every frame if no QR found)
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
      this.stopScanner();
    }
  },

  async stopScanner() {
    if (this.scanner) {
      try {
        await this.scanner.stop();
      } catch (e) {}
      this.scanner = null;
    }
    
    this.readerEl.classList.add('hidden');
    this.readerEl.innerHTML = ''; // Clear library's generated elements
    this.scanBtn.textContent = '📷';
    this.scanBtn.classList.remove('active');
  }
};
