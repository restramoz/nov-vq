// Ollama client-side API helper
// Supports both local Ollama and cloud endpoint

import { OLLAMA_GENERATION_PARAMS } from "./prompts";

export function getOllamaConfig() {
  return {
    url: localStorage.getItem("ollama_url") || "http://localhost:11434",
    model: localStorage.getItem("ollama_model") || "deepseek-v3.2:cloud",
    apiKey: localStorage.getItem("ollama_api_key") || "",
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildHeaders(): Record<string, string> {
  const config = getOllamaConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

// Non-streaming generate
export async function ollamaGenerate(
  messages: OllamaMessage[],
  options?: { model?: string; signal?: AbortSignal }
): Promise<string> {
  const config = getOllamaConfig();
  const model = options?.model || config.model;

  const response = await fetch(`${config.url}/api/chat`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: OLLAMA_GENERATION_PARAMS.temperature,
        top_p: OLLAMA_GENERATION_PARAMS.top_p,
        top_k: OLLAMA_GENERATION_PARAMS.top_k,
        num_predict: OLLAMA_GENERATION_PARAMS.max_tokens,
        repeat_penalty: OLLAMA_GENERATION_PARAMS.repeat_penalty,
      },
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.message?.content || "";
}

// Streaming generate - yields chunks of text
export async function* ollamaGenerateStream(
  messages: OllamaMessage[],
  options?: { model?: string; signal?: AbortSignal }
): AsyncGenerator<string> {
  const config = getOllamaConfig();
  const model = options?.model || config.model;

  const response = await fetch(`${config.url}/api/chat`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: OLLAMA_GENERATION_PARAMS.temperature,
        top_p: OLLAMA_GENERATION_PARAMS.top_p,
        top_k: OLLAMA_GENERATION_PARAMS.top_k,
        num_predict: OLLAMA_GENERATION_PARAMS.max_tokens,
        repeat_penalty: OLLAMA_GENERATION_PARAMS.repeat_penalty,
      },
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama Error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          yield json.message.content;
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer);
      if (json.message?.content) {
        yield json.message.content;
      }
    } catch {
      // skip
    }
  }
}

export async function ollamaListModels(): Promise<string[]> {
  const config = getOllamaConfig();
  try {
    const response = await fetch(`${config.url}/api/tags`, { headers: buildHeaders() });
    if (!response.ok) throw new Error("Failed to fetch models");
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}

export async function testOllamaConnection(): Promise<boolean> {
  const config = getOllamaConfig();
  try {
    const response = await fetch(`${config.url}/api/tags`, { headers: buildHeaders() });
    return response.ok;
  } catch {
    return false;
  }
}
