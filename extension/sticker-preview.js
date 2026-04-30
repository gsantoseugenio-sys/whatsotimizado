(() => {
  const PREFIX = "wa_ai_sticker_preview_";
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "";
  const key = `${PREFIX}${id}`;
  const image = document.getElementById("sticker");
  const status = document.getElementById("status");
  const download = document.getElementById("download");
  const close = document.getElementById("close");

  function setStatus(message) {
    status.textContent = message || "";
  }

  async function loadSticker() {
    if (!id) {
      setStatus("Figurinha nao encontrada.");
      return;
    }

    const data = await chrome.storage.local.get([key]);
    const entry = data[key];
    const imageUrl = entry?.imageUrl || "";
    if (!imageUrl) {
      setStatus("Figurinha expirada. Gere novamente pela extensao.");
      return;
    }

    image.src = imageUrl;
    download.href = imageUrl;
    setStatus("Imagem aberta com seguranca em uma aba da extensao.");
    chrome.storage.local.remove([key]);
  }

  close.addEventListener("click", () => {
    window.close();
  });

  loadSticker().catch(() => setStatus("Nao foi possivel carregar a figurinha."));
})();
