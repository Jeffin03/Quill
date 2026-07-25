window.QuillImageGen = (() => {
  const NIM_MODELS = [
    { id: "black-forest-labs/flux.1-dev", name: "FLUX.1-Dev (Recommended)" },
    { id: "black-forest-labs/flux.1-schnell", name: "FLUX.1-Schnell (Fast)" },
    {
      id: "stabilityai/stable-diffusion-3.5-large",
      name: "Stable Diffusion 3.5 Large",
    },
    { id: "qwen/qwen-image", name: "Qwen-Image" },
  ];

  const NIM_BASE = "https://api.nvcf.nim.com/v1";

  // ── ComfyUI default txt2img workflow ──────
  function buildComfyWorkflow(prompt, model) {
    return {
      3: {
        class_type: "KSampler",
        inputs: {
          seed: Math.floor(Math.random() * 2 ** 32),
          steps: 20,
          cfg: 7.0,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1.0,
          model: ["4", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
        },
      },
      4: {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: model || "sd_xl_base_1.0.safetensors",
        },
      },
      5: {
        class_type: "EmptyLatentImage",
        inputs: {
          width: 768,
          height: 1024,
          batch_size: 1,
        },
      },
      6: {
        class_type: "CLIPTextEncode",
        inputs: {
          text: prompt,
          clip: ["4", 1],
        },
      },
      7: {
        class_type: "CLIPTextEncode",
        inputs: {
          text: "blurry, low quality, deformed, ugly, watermark, text",
          clip: ["4", 1],
        },
      },
      8: {
        class_type: "VAEDecode",
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2],
        },
      },
      9: {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "quill",
          images: ["8", 0],
        },
      },
    };
  }

  async function getComicEntry(config) {
    const entries = config.apiEntries || [];
    const routing = config.featureRouting || {};
    if (routing.image) {
      const routed = entries.find(
        (e) => e.id === routing.image && e.capabilities?.comic,
      );
      if (routed) return routed;
    }
    return entries.find((e) => e.capabilities?.comic);
  }

  async function generateImage({ prompt, signal }) {
    const config = await QuillDB.getConfig();
    const entry = await getComicEntry(config);
    if (!entry)
      throw new Error(
        "No comic-capable API configured. Add one in Settings → API Manager.",
      );

    if (entry.provider === "nim") {
      return generateNimImage(
        prompt,
        entry.model || "black-forest-labs/flux.1-dev",
        entry.apiKey,
        signal,
      );
    } else if (entry.provider === "comfyui") {
      return generateComfyImage(
        prompt,
        entry.model || "",
        entry.host || "http://localhost:8188",
        signal,
      );
    }
    throw new Error(`Unknown provider: ${entry.provider}`);
  }

  async function generateNimImage(prompt, model, apiKey, signal) {
    const response = await fetch(`${NIM_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: model || "black-forest-labs/flux.1-schnell",
        prompt,
        n: 1,
        response_format: "b64_json",
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`NIM API error (${response.status}): ${text}`);
    }
    const data = await response.json();
    return data.data?.[0]?.b64_json || null;
  }

  async function generateComfyImage(prompt, model, baseUrl, signal) {
    const host = baseUrl.replace(/\/+$/, "");
    const workflow = buildComfyWorkflow(prompt, model);

    // Submit workflow
    const submitResp = await fetch(`${host}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!submitResp.ok) {
      const text = await submitResp.text().catch(() => "");
      throw new Error(`ComfyUI submit error (${submitResp.status}): ${text}`);
    }
    const { prompt_id } = await submitResp.json();
    if (!prompt_id) throw new Error("No prompt_id returned from ComfyUI");

    // Poll for completion
    const startTime = Date.now();
    const timeout = 120000;
    while (Date.now() - startTime < timeout) {
      if (signal?.aborted) throw new Error("Aborted");
      await new Promise((r) => setTimeout(r, 1000));

      const historyResp = await fetch(`${host}/history/${prompt_id}`, {
        signal,
      });
      if (!historyResp.ok) continue;
      const history = await historyResp.json();
      const entry = history[prompt_id];
      if (!entry || !entry.outputs) continue;

      // Find the SaveImage node output
      for (const nodeId of Object.keys(entry.outputs)) {
        const nodeOutput = entry.outputs[nodeId];
        if (nodeOutput.images && nodeOutput.images.length > 0) {
          const img = nodeOutput.images[0];
          const imgResp = await fetch(
            `${host}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`,
            { signal },
          );
          if (!imgResp.ok) throw new Error("Failed to fetch generated image");
          const blob = await imgResp.blob();
          return await blobToBase64(blob);
        }
      }
    }
    throw new Error("ComfyUI generation timed out (120s)");
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ── OpenRouter Free Models Fetcher ──────

  let cachedFreeModels = null;
  let lastFetch = 0;
  const CACHE_TTL = 3600000;

  async function fetchFreeModels(force = false) {
    if (!force && cachedFreeModels && Date.now() - lastFetch < CACHE_TTL) {
      return cachedFreeModels;
    }
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok)
      throw new Error(`OpenRouter API error (${response.status})`);
    const data = await response.json();
    const freeModels = (data.data || [])
      .filter((m) => {
        const p = m.pricing || {};
        const promptFree =
          p.prompt === 0 || p.prompt === "0" || p.prompt === 0.0;
        const completionFree =
          p.completion === 0 || p.completion === "0" || p.completion === 0.0;
        if (promptFree && completionFree) return true;
        if (m.id && m.id.endsWith(":free")) return true;
        return false;
      })
      .map((m) => ({ id: m.id, name: m.name || m.id }));
    cachedFreeModels = freeModels;
    lastFetch = Date.now();
    return freeModels;
  }

  return {
    NIM_MODELS,
    generateImage,
    fetchFreeModels,
  };
})();
