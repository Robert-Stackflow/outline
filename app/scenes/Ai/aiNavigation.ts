import { aiPath } from "~/utils/routeHelpers";

/**
 * Builds the AI scene URL for either a new or existing conversation.
 *
 * @param conversationId the conversation id to open.
 * @returns the route path for the requested AI conversation.
 */
export function getAiConversationPath(conversationId?: string): string {
  if (!conversationId) {
    return aiPath();
  }

  return `${aiPath()}?c=${encodeURIComponent(conversationId)}`;
}
