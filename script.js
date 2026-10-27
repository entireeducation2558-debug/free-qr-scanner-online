(() => {
  const cameraTab = document.getElementById("cameraTab");
  const uploadTab = document.getElementById("uploadTab");
  const cameraPanel = document.getElementById("cameraPanel");
  const uploadPanel = document.getElementById("uploadPanel");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const statusBox = document.getElementById("status");
  const resultPanel = document.getElementById("resultPanel");
  const resultText = document.getElementById("resultText");
  const copyButton = document.getElementById("copyButton");
  const clearButton = document.getElementById("clearButton");
  const openLink = document.getElementById("openLink");
  const qrFile = document.getElementById("qrFile");
  const fileName = document.getElementById("fileName");
  const placeholder = document.getElementById("cameraPlaceholder");
  let scanner = null, cameraRunning = false, lastResult = "", fileScanBusy = false;

  function setStatus(message, kind = "") {
    statusBox.textContent = message;
    statusBox.className = "status" + (kind ? " " + kind : "");
  }
  function setTab(mode) {
    const camera = mode === "camera";
    cameraTab.classList.toggle("active", camera);
    uploadTab.classList.toggle("active", !camera);
    cameraTab.setAttribute("aria-selected", String(camera));
    uploadTab.setAttribute("aria-selected", String(!camera));
    cameraPanel.classList.toggle("hidden", !camera);
    uploadPanel.classList.toggle("hidden", camera);
    setStatus(camera ? "Start the camera to scan a QR code." : "Choose an image that contains a QR code.");
  }
  function showResult(decodedText) {
    lastResult = decodedText;
    resultText.value = decodedText;
    resultPanel.classList.remove("hidden");
    let parsed;
    try { parsed = new URL(decodedText); } catch (_) { parsed = null; }
    if (parsed && (parsed.protocol === "https:" || parsed.protocol === "http:")) {
      openLink.href = parsed.href;
      openLink.classList.remove("hidden");
    } else {
      openLink.removeAttribute("href");
      openLink.classList.add("hidden");
    }
    setStatus("QR code scanned successfully.", "success");
  }
  function handleScan(decodedText) {
    showResult(decodedText);
    if (scanner && cameraRunning) {
      scanner.pause(true);
      setStatus("QR code scanned. Stop the camera before starting another scan.", "success");
    }
  }
  cameraTab.addEventListener("click", () => setTab("camera"));
  uploadTab.addEventListener("click", async () => {
    if (cameraRunning) await stopCamera();
    setTab("upload");
  });
  async function startCamera() {
    if (typeof Html5Qrcode === "undefined") {
      setStatus("Scanner library did not load. Check your internet connection, then reload.", "error");
      return;
    }
    startButton.disabled = true;
    setStatus("Requesting camera permission…");
    try {
      if (!scanner) scanner = new Html5Qrcode("reader");
      placeholder?.classList.add("hidden");
      await scanner.start({ facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
        handleScan, () => {});
      cameraRunning = true;
      stopButton.disabled = false;
      setStatus("Camera is running. Point it at a QR code.");
    } catch (error) {
      console.error("Camera start error:", error);
      placeholder?.classList.remove("hidden");
      setStatus("Could not start the camera. Allow camera access and use the HTTPS GitHub Pages link (or localhost).", "error");
    } finally { startButton.disabled = false; }
  }
  async function stopCamera() {
    if (scanner && cameraRunning) {
      try { await scanner.stop(); await scanner.clear(); }
      catch (error) { console.warn("Camera stop issue:", error); }
    }
    cameraRunning = false;
    stopButton.disabled = true;
    placeholder?.classList.remove("hidden");
    setStatus("Camera stopped. You can start it again.");
  }
  startButton.addEventListener("click", startCamera);
  stopButton.addEventListener("click", stopCamera);
  qrFile.addEventListener("change", async () => {
    const file = qrFile.files && qrFile.files[0];
    resultPanel.classList.add("hidden");
    if (!file) { fileName.textContent = "No image selected"; return; }
    fileName.textContent = file.name;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file such as JPG or PNG.", "error"); return;
    }
    if (fileScanBusy) return;
    if (typeof Html5Qrcode === "undefined") {
      setStatus("Scanner library did not load. Check your internet connection and reload.", "error"); return;
    }
    fileScanBusy = true;
    setStatus("Scanning image…");
    let imageScanner;
    try {
      imageScanner = new Html5Qrcode("reader", false);
      const decoded = await imageScanner.scanFile(file, true);
      showResult(decoded);
    } catch (error) {
      console.error("Image scan error:", error);
      setStatus("No readable QR code found. Try a clearer image with the whole QR code visible.", "error");
    } finally {
      if (imageScanner) { try { await imageScanner.clear(); } catch (_) {} }
      fileScanBusy = false;
    }
  });
  copyButton.addEventListener("click", async () => {
    if (!lastResult) return;
    try {
      await navigator.clipboard.writeText(lastResult);
      copyButton.textContent = "Copied!";
      setTimeout(() => { copyButton.textContent = "Copy result"; }, 1600);
    } catch (_) {
      resultText.focus(); resultText.select();
      const ok = document.execCommand("copy");
      setStatus(ok ? "Result copied." : "Select the result text and copy it manually.", ok ? "success" : "error");
    }
  });
  clearButton.addEventListener("click", () => {
    lastResult = ""; resultText.value = ""; resultPanel.classList.add("hidden");
    openLink.removeAttribute("href"); openLink.classList.add("hidden");
    if (scanner && cameraRunning) {
      try { scanner.resume(); } catch (_) {}
      setStatus("Camera is running. Point it at another QR code.");
    } else setStatus("Result cleared. Ready to scan another QR code.");
  });
  window.addEventListener("pagehide", () => {
    if (scanner && cameraRunning) scanner.stop().catch(() => {});
  });
})();
