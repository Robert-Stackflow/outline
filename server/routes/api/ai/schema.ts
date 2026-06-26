import { z } from "zod";
import { BaseSchema } from "../schema";

export const AiConfigSchema = BaseSchema;
export type AiConfigReq = z.infer<typeof AiConfigSchema>;

export const AiConfigUpdateSchema = BaseSchema.extend({
  body: z.object({
    enabled: z.boolean().optional(),
    baseUrl: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    systemPrompt: z.string().optional(),
    /** When provided, replaces the stored API key. Empty string clears it. */
    apiKey: z.string().optional(),
  }),
});
export type AiConfigUpdateReq = z.infer<typeof AiConfigUpdateSchema>;

export const AiChatSchema = BaseSchema.extend({
  body: z.object({
    message: z.string().min(1),
    conversationId: z.uuid().optional(),
    documentId: z.string().optional(),
  }),
});
export type AiChatReq = z.infer<typeof AiChatSchema>;

export const AiSummarySchema = BaseSchema.extend({
  body: z.object({
    documentId: z.string(),
  }),
});
export type AiSummaryReq = z.infer<typeof AiSummarySchema>;

export const AiConversationsListSchema = BaseSchema.extend({
  body: z
    .object({
      documentId: z.string().optional(),
    })
    .optional(),
});
export type AiConversationsListReq = z.infer<typeof AiConversationsListSchema>;

export const AiConversationsInfoSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});
export type AiConversationsInfoReq = z.infer<typeof AiConversationsInfoSchema>;

export const AiConversationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});
export type AiConversationsDeleteReq = z.infer<
  typeof AiConversationsDeleteSchema
>;
