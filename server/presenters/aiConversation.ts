import type { AiConversation } from "@server/models";

export default function presentAiConversation(conversation: AiConversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    documentId: conversation.documentId,
    userId: conversation.userId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}
