import { InvalidRequestError } from "@server/errors";
import Logger from "@server/logging/Logger";
import type { Team } from "@server/models";
import fetch from "@server/utils/fetch";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
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
 * OpenAI-compatible provider.
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

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${team.aiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: settings.temperature ?? 0.7,
        stream: false,
      }),
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

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw InvalidRequestError("The AI provider returned an empty response");
  }

  return content.trim();
}
