import type { AiMessage } from "@server/models";

export default function presentAiMessage(message: AiMessage) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}
