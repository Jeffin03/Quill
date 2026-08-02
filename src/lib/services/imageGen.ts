/* ══════════════════════════════════════════
   Quill — Image Generation Service
   Ported from docs/js/imageGen.js.
   Any OpenAI-compatible image API (NVIDIA NIM,
   ComfyUI) with feature-routing resolution.
   ══════════════════════════════════════════ */

import type { APIEntry } from '$lib/types';
import { getConfig, type AppConfig } from './db';
import * as llm from './llm';

export const NIM_MODELS: { id: string; name: string }[] = [
	{ id: 'black-forest-labs/flux.1-dev', name: 'FLUX.1-Dev (Recommended)' },
	{ id: 'black-forest-labs/flux.1-schnell', name: 'FLUX.1-Schnell (Fast)' },
	{ id: 'stabilityai/stable-diffusion-3.5-large', name: 'Stable Diffusion 3.5 Large' },
	{ id: 'qwen/qwen-image', name: 'Qwen-Image' }
];

const NIM_BASE = 'https://ai.api.nvidia.com/v1';

// ── Entry Resolution ─────────────────────

/**
 * Get the image-capable entry for generation.
 */
export function getImageEntry(config: AppConfig): APIEntry | undefined {
	const entries = config.apiEntries || [];
	const routing = config.featureRouting || {};

	if (routing.image) {
		const routed = entries.find((e) => e.id === routing.image && e.capabilities?.image);
		if (routed) return routed;
	}

	return entries.find((e) => e.capabilities?.image);
}

// ── Generation ────────────────────────────

export interface GenerateImageOptions {
	prompt: string;
	signal?: AbortSignal;
}

/**
 * Generate an image as a base64 PNG string.
 * Dispatches to the configured image provider (NIM or ComfyUI).
 */
export async function generateImage({ prompt, signal }: GenerateImageOptions): Promise<string> {
	const config = await getConfig();
	const entry = getImageEntry(config);
	if (!entry) {
		throw new Error('No image-capable API configured. Add one in Settings → API Manager.');
	}

	if (entry.provider === 'nim') {
		return generateNimImage(
			prompt,
			entry.model || 'black-forest-labs/flux.1-dev',
			entry.apiKey,
			signal
		);
	}

	if (entry.provider === 'comfyui') {
		return generateComfyImage(
			prompt,
			entry.model || '',
			entry.host || 'http://localhost:8188',
			signal
		);
	}

	throw new Error(`Unknown image provider: ${entry.provider}`);
}

async function generateNimImage(
	prompt: string,
	model: string,
	apiKey: string | undefined,
	signal?: AbortSignal
): Promise<string> {
	const response = await fetch(`${NIM_BASE}/genai/${model}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		signal,
		body: JSON.stringify({
			prompt,
			seed: Math.floor(Math.random() * 2 ** 32),
			width: 1024,
			height: 1024
		})
	});

	if (!response.ok) {
		const text = await response.text().catch(() => 'Unknown error');
		throw new Error(`NIM API error (${response.status}): ${text}`);
	}

	const data = await response.json();
	const b64 = data.artifacts?.[0]?.base64;
	if (!b64) throw new Error('No image returned from NIM');
	return b64;
}

// ── ComfyUI ───────────────────────────────

function buildComfyWorkflow(prompt: string, model: string) {
	return {
		3: {
			class_type: 'KSampler',
			inputs: {
				seed: Math.floor(Math.random() * 2 ** 32),
				steps: 20,
				cfg: 7.0,
				sampler_name: 'euler',
				scheduler: 'normal',
				denoise: 1.0,
				model: ['4', 0],
				positive: ['6', 0],
				negative: ['7', 0],
				latent_image: ['5', 0]
			}
		},
		4: {
			class_type: 'CheckpointLoaderSimple',
			inputs: {
				ckpt_name: model || 'sd_xl_base_1.0.safetensors'
			}
		},
		5: {
			class_type: 'EmptyLatentImage',
			inputs: {
				width: 768,
				height: 1024,
				batch_size: 1
			}
		},
		6: {
			class_type: 'CLIPTextEncode',
			inputs: {
				text: prompt,
				clip: ['4', 1]
			}
		},
		7: {
			class_type: 'CLIPTextEncode',
			inputs: {
				text: 'blurry, low quality, deformed, ugly, watermark, text',
				clip: ['4', 1]
			}
		},
		8: {
			class_type: 'VAEDecode',
			inputs: {
				samples: ['3', 0],
				vae: ['4', 2]
			}
		},
		9: {
			class_type: 'SaveImage',
			inputs: {
				filename_prefix: 'quill',
				images: ['8', 0]
			}
		}
	};
}

async function generateComfyImage(
	prompt: string,
	model: string,
	baseUrl: string,
	signal?: AbortSignal
): Promise<string> {
	const host = baseUrl.replace(/\/+$/, '');
	const workflow = buildComfyWorkflow(prompt, model);

	const submitResp = await fetch(`${host}/prompt`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal,
		body: JSON.stringify({ prompt: workflow })
	});
	if (!submitResp.ok) {
		const text = await submitResp.text().catch(() => '');
		throw new Error(`ComfyUI submit error (${submitResp.status}): ${text}`);
	}
	const { prompt_id } = await submitResp.json();
	if (!prompt_id) throw new Error('No prompt_id returned from ComfyUI');

	const startTime = Date.now();
	const timeout = 120000;
	while (Date.now() - startTime < timeout) {
		if (signal?.aborted) throw new Error('Aborted');
		await new Promise((r) => setTimeout(r, 1000));

		const historyResp = await fetch(`${host}/history/${prompt_id}`, { signal });
		if (!historyResp.ok) continue;
		const history = await historyResp.json();
		const entry = history[prompt_id];
		if (!entry || !entry.outputs) continue;

		for (const nodeId of Object.keys(entry.outputs)) {
			const nodeOutput = entry.outputs[nodeId];
			if (nodeOutput.images && nodeOutput.images.length > 0) {
				const img = nodeOutput.images[0];
				const imgResp = await fetch(
					`${host}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`,
					{ signal }
				);
				if (!imgResp.ok) throw new Error('Failed to fetch generated image');
				const blob = await imgResp.blob();
				return await blobToBase64(blob);
			}
		}
	}
	throw new Error('ComfyUI generation timed out (120s)');
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const base64 = (reader.result as string).split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

// ── Style Prompt Generation ───────────────

export interface StylePromptOptions {
	name?: string;
	description?: string;
	referenceImage?: string | null;
}

/**
 * Ask a text LLM to write a visual character-design prompt
 * from a description and optional reference image.
 */
export async function generateCharacterStylePrompt(opts: StylePromptOptions): Promise<string> {
	const config = await getConfig();
	const entry = llm.getPromptEntry(config) || llm.getTextEntry(config);
	if (!entry) {
		throw new Error('No text-capable API configured. Add one in Settings → API Manager.');
	}

	let systemContent = 'You are an expert at writing image generation prompts for character design.';
	let userContent = `Write a concise visual character design prompt for an AI image generator based on this description. Format: physical appearance, clothing style, expression, lighting. Keep it under 200 words.\n\nName: ${opts.name || 'A character'}\nDescription: ${opts.description || ''}`;

	if (opts.referenceImage) {
		systemContent =
			'You are an expert at writing image generation prompts for character design. You can analyze reference images to create accurate visual prompts.';
		userContent = `Write a concise visual character design prompt for an AI image generator based on this description and reference image. Include relevant visual details from both. Keep it under 200 words.\n\nName: ${opts.name || 'A character'}\nDescription: ${opts.description || 'A character based on the reference image'}`;
	}

	const content = await llm.chatWithEntry(
		entry,
		[
			{ role: 'system', content: systemContent },
			{ role: 'user', content: userContent }
		],
		{ maxTokens: 300, temperature: 0.7 }
	);

	return content.replace(/^["']|["']$/g, '').trim();
}
