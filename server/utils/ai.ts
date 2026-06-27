import { InvalidRequestError } from "@server/errors";
import Logger from "@server/logging/Logger";
import type { Team } from "@server/models";
import { AiApiFormat } from "@shared/types";
import fetch from "@server/utils/fetch";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_OUTPUT_TOKENS = 4096;
const REQUEST_TIMEOUT = 120000;

/**
 * Whether the given team has a usable AI configuration (enabled + API key).
 *
 * @param team The team to check.
 * @returns True if AI requests can be made for this team.
 */
export function isAiConfigured(team: Team): boolean {
  return !!(team.aiSettings?.enabled && team.aiApiKey);
}

/**
 * Performs a non-streaming chat completion against the team's configured
 * provider, using whichever wire format the workspace selected (OpenAI
 * chat/completions, Anthropic messages, or OpenAI responses).
 *
 * @param team The team whose AI configuration to use.
 * @param messages The conversation messages to send.
 * @returns The assistant's reply text.
 * @throws InvalidRequestError if AI is not configured or the provider errors.
 */
export async function chatCompletion(
  team: Team,
  messages: ChatMessage[]
): Promise<string> {
  if (!isAiConfigured(team)) {
    throw InvalidRequestError("AI is not configured for this workspace");
  }

  const settings = team.aiSettings ?? {};
  const baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = settings.model || DEFAULT_MODEL;
  const temperature = settings.temperature ?? 0.7;
  const apiKey = team.aiApiKey as string;
  const format = settings.apiFormat ?? AiApiFormat.ChatCompletions;

  const { url, headers, body } = buildRequest(format, {
    baseUrl,
    model,
    temperature,
    apiKey,
    messages,
  });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });
  } catch (err) {
    Logger.error("AI provider request failed", err as Error);
    throw InvalidRequestError("Failed to reach the AI provider");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    Logger.warn("AI provider returned an error", {
      status: response.status,
      body: text.slice(0, 500),
    });
    throw InvalidRequestError(
      `AI provider error (${response.status}). Please check your configuration.`
    );
  }

  const data = await response.json();
  const content = extractContent(format, data);

  if (!content) {
    throw InvalidRequestError("The AI provider returned an empty response");
  }

  return content.trim();
}

type RequestParams = {
  baseUrl: string;
  model: string;
  temperature: number;
  apiKey: string;
  messages: ChatMessage[];
};

/**
 * Streams a chat completion against the team's configured provider, invoking
 * `onText` for each text delta as it arrives. Returns the full accumulated text.
 *
 * @param team The team whose AI configuration to use.
 * @param messages The conversation messages to send.
 * @param onText Callback invoked with each text delta.
 * @returns The full assistant reply.
 * @throws InvalidRequestError if AI is not configured or the provider errors.
 */
export async function streamChatCompletion(
  team: Team,
  messages: ChatMessage[],
  onText: (delta: string) => void
): Promise<string> {
  if (!isAiConfigured(team)) {
    throw InvalidRequestError("AI is not configured for this workspace");
  }

  const settings = team.aiSettings ?? {};
  const baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = settings.model || DEFAULT_MODEL;
  const temperature = settings.temperature ?? 0.7;
  const apiKey = team.aiApiKey as string;
  const format = settings.apiFormat ?? AiApiFormat.ChatCompletions;

  const { url, headers, body } = buildRequest(
    format,
    { baseUrl, model, temperature, apiKey, messages },
    true
  );

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });
  } catch (err) {
    Logger.error("AI provider request failed", err as Error);
    throw InvalidRequestError("Failed to reach the AI provider");
  }

  if (!response.ok || !response.body) {
    const text = await response.text?.().catch(() => "");
    Logger.warn("AI provider returned an error", {
      status: response.status,
      body: (text ?? "").slice(0, 500),
    });
    throw InvalidRequestError(
      `AI provider error (${response.status}). Please check your configuration.`
    );
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  // node-fetch exposes the body as an async-iterable Node Readable.
  for await (const chunk of response.body as AsyncIterable<Buffer>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }
      let json: unknown;
      try {
        json = JSON.parse(data);
      } catch (_err) {
        continue;
      }
      const delta = extractDelta(format, json);
      if (delta) {
        full += delta;
        onText(delta);
      }
    }
  }

  return full.trim();
}

/** Extracts a text delta from a single streamed SSE payload. */
function extractDelta(format: AiApiFormat, json: unknown): string | undefined {
  if (format === AiApiFormat.Messages) {
    const event = json as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      return event.delta.text;
    }
    return undefined;
  }

  if (format === AiApiFormat.Responses) {
    const event = json as { type?: string; delta?: string };
    if (event.type === "response.output_text.delta") {
      return event.delta;
    }
    return undefined;
  }

  return (json as { choices?: { delta?: { content?: string } }[] }).choices?.[0]
    ?.delta?.content;
}

/** Builds the provider request for the chosen wire format. */
function buildRequest(
  format: AiApiFormat,
  { baseUrl, model, temperature, apiKey, messages }: RequestParams,
  stream = false
): { url: string; headers: Record<string, string>; body: object } {
  if (format === AiApiFormat.Messages) {
    // Anthropic Messages API: system is a top-level field, not a message.
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    return {
      url: `${baseUrl}/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(system ? { system } : {}),
        messages: conversation,
        ...(stream ? { stream: true } : {}),
      },
    };
  }

  if (format === AiApiFormat.Responses) {
    // OpenAI Responses API: instructions carries the system prompt, input
    // carries the conversation turns.
    const instructions = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const input = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    return {
      url: `${baseUrl}/responses`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model,
        ...(instructions ? { instructions } : {}),
        input,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        ...(stream ? { stream: true } : {}),
      },
    };
  }

  // Default: OpenAI-compatible chat/completions.
  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: {
      model,
      messages,
      temperature,
      stream,
    },
  };
}

/** Extracts the assistant's text reply from a provider response. */
function extractContent(format: AiApiFormat, data: unknown): string | undefined {
  if (format === AiApiFormat.Messages) {
    const blocks = (data as { content?: { type?: string; text?: string }[] })
      .content;
    return blocks
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
  }

  if (format === AiApiFormat.Responses) {
    const responsesData = data as {
      output_text?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
    };
    if (responsesData.output_text) {
      return responsesData.output_text;
    }
    return responsesData.output
      ?.flatMap((item) => item.content ?? [])
      .filter((block) => block.type === "output_text")
      .map((block) => block.text ?? "")
      .join("");
  }

  return (
    data as { choices?: { message?: { content?: string } }[] }
  ).choices?.[0]?.message?.content;
}
