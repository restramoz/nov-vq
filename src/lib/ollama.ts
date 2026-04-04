// Ollama client-side API helper
// Calls Ollama directly from browser (localhost only)

export function getOllamaConfig() {
  return {
    url: localStorage.getItem("ollama_url") || "http://localhost:11434",
    model: localStorage.getItem("ollama_model") || "deepseek-v3.2:cloud",
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function ollamaGenerate(
  messages: OllamaMessage[],
  options?: { model?: string; signal?: AbortSignal }
): Promise<string> {
  const config = getOllamaConfig();
  const model = options?.model || config.model;

  const response = await fetch(`${config.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
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

export async function ollamaListModels(): Promise<string[]> {
  const config = getOllamaConfig();
  try {
    const response = await fetch(`${config.url}/api/tags`);
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
    const response = await fetch(`${config.url}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
