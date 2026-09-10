/**
 * Vision (photo-to-help) and audio (lecture recording → transcript) calls.
 *
 * Same rules as the text client: the key never leaves the server, provider error
 * bodies are never forwarded, inputs are bounded, and every failure becomes a
 * clear, sanitized message the UI can act on. Image and audio payloads are
 * validated before a byte is sent anywhere.
 */

import { AiServiceError, type GroqConfig } from "./groq-client";

/** Groq's multimodal model; overridable so a deployment can pin a version. */
export const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
/** Whisper large v3 handles Indian-English classroom audio well. */
export const DEFAULT_AUDIO_MODEL = "whisper-large-v3";

/** Groq's own vision limit is 4 MB per image; stay under it with headroom. */
export const MAX_IMAGE_BYTES = 3_500_000;
export const MAX_AUDIO_BYTES = 20_000_000;

export function getVisionModel(env: { GROQ_VISION_MODEL?: string } = {}): string {
  return env.GROQ_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

export function getAudioModel(env: { GROQ_AUDIO_MODEL?: string } = {}): string {
  return env.GROQ_AUDIO_MODEL?.trim() || DEFAULT_AUDIO_MODEL;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type ImagePayload = { dataUrl: string; mimeType: string; approxBytes: number };

/**
 * Accepts a `data:` URL from the browser and returns it only if it is a real,
 * size-bounded image. Anything else is rejected with a message a student can
 * understand.
 */
export function validateImageDataUrl(value: unknown): ImagePayload {
  if (typeof value !== "string" || value.length < 32)
    throw new AiServiceError("Attach a photo of the page or your working.", 400);
  const match = value.match(/^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match)
    throw new AiServiceError("That file is not a JPEG, PNG, WebP or GIF image.", 415);
  const mimeType = match[1].toLowerCase();
  if (!IMAGE_TYPES.includes(mimeType))
    throw new AiServiceError("Use a JPEG, PNG, WebP or GIF photo.", 415);
  const approxBytes = Math.floor((match[2].replace(/\s+/g, "").length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES)
    throw new AiServiceError(
      "That photo is over 3.5 MB. Please retake it at a smaller size.",
      413,
    );
  return { dataUrl: `data:${mimeType};base64,${match[2].replace(/\s+/g, "")}`, mimeType, approxBytes };
}

export function validateAudioUpload(input: {
  bytes: number;
  mimeType: string | null;
  name: string;
}): void {
  if (input.bytes === 0) throw new AiServiceError("The recording was empty.", 400);
  if (input.bytes > MAX_AUDIO_BYTES)
    throw new AiServiceError("Recordings must be under 20 MB (about 5 minutes).", 413);
  const ok = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "video/webm"];
  if (input.mimeType && !ok.some((type) => input.mimeType!.startsWith(type.split("/")[0])))
    throw new AiServiceError("Record the lecture as WebM, OGG, MP4, MP3 or WAV audio.", 415);
  if (!input.name.trim()) throw new AiServiceError("Give the recording a name.", 400);
}

async function readError(response: Response, what: string): Promise<never> {
  if (response.status === 429)
    throw new AiServiceError(`The AI service is busy (${what}). Please try again shortly.`, 429);
  if (response.status === 401 || response.status === 403)
    throw new AiServiceError(
      "The AI service credentials need attention. Check GROQ_API_KEY on the server.",
      503,
    );
  if (response.status === 400 || response.status === 404)
    throw new AiServiceError(
      `The configured model could not handle this ${what}. Check GROQ_VISION_MODEL / GROQ_AUDIO_MODEL.`,
      502,
    );
  throw new AiServiceError(`The AI service is temporarily unavailable (${what}).`, 502);
}

function transportError(error: unknown, what: string): never {
  const timeout =
    error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
  throw new AiServiceError(
    timeout
      ? `The ${what} request timed out. Please try again.`
      : `Could not reach the AI service for the ${what} request.`,
    timeout ? 504 : 502,
  );
}

/** Vision completion: the model reads the photograph, we keep the sources. */
export async function completeGroqVision(
  input: {
    image: ImagePayload;
    systemPrompt: string;
    userText: string;
    maxTokens?: number;
  },
  config: GroqConfig,
  options: { model?: string; fetcher?: typeof fetch } = {},
): Promise<string> {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? getVisionModel(),
        messages: [
          { role: "system", content: input.systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: input.userText },
              { type: "image_url", image_url: { url: input.image.dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_completion_tokens: input.maxTokens ?? 1_024,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    transportError(error, "photo");
  }
  if (!response.ok) await readError(response, "photo");
  const body = await response.json().catch(() => null);
  const reply = body?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim())
    throw new AiServiceError("The AI could not read that photo. Try again in better light.", 502);
  return reply.trim();
}

/** Speech-to-text for a recorded lecture (teacher content pipeline). */
export async function transcribeGroqAudio(
  input: { bytes: Uint8Array; fileName: string; mimeType: string; language?: string },
  config: GroqConfig,
  options: { model?: string; fetcher?: typeof fetch } = {},
): Promise<string> {
  const fetcher = options.fetcher ?? fetch;
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }),
    input.fileName,
  );
  form.append("model", options.model ?? getAudioModel());
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (input.language) form.append("language", input.language);

  let response: Response;
  try {
    response = await fetcher("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    transportError(error, "transcription");
  }
  if (!response.ok) await readError(response, "transcription");
  const body = await response.json().catch(() => null);
  const text = body?.text;
  if (typeof text !== "string" || !text.trim())
    throw new AiServiceError(
      "The recording could not be transcribed. Check that the audio is clear.",
      502,
    );
  return text.trim();
}
