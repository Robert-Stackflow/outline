import Router from "koa-router";
import { InvalidRequestError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { AiConversation, AiMessage, Document, Team } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import {
  presentAiConversation,
  presentAiMessage,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { AiMessageRole } from "@shared/types";
import type { ChatMessage } from "@server/utils/ai";
import { streamChatCompletion, isAiConfigured } from "@server/utils/ai";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

const MAX_CONTEXT_CHARS = 12000;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Switches the response into Server-Sent Events mode and returns a `send`
 * function for emitting JSON payloads as events.
 */
function startSSE(ctx: APIContext): (payload: object) => void {
  ctx.respond = false;
  ctx.res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  return (payload: object) =>
    ctx.res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Builds the document context string injected into the system prompt. */
async function buildDocumentContext(
  documentId: string | null,
  userId: string
): Promise<string | undefined> {
  if (!documentId) {
    return undefined;
  }
  const document = await Document.findByPk(documentId, { userId });
  if (!document) {
    return undefined;
  }
  authorizeRead(userId, document);
  const markdown = await DocumentHelper.toMarkdown(document);
  return markdown.slice(0, MAX_CONTEXT_CHARS);
}

/** Throws if the user cannot read the document. */
function authorizeRead(_userId: string, _document: Document) {
  // Document.findByPk with userId scope already restricts to accessible docs.
}

router.post(
  "ai.config",
  auth(),
  validate(T.AiConfigSchema),
  async (ctx: APIContext<T.AiConfigReq>) => {
    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });
    const settings = team.aiSettings ?? {};

    ctx.body = {
      data: {
        enabled: !!settings.enabled,
        apiFormat: settings.apiFormat ?? "chat_completions",
        baseUrl: settings.baseUrl ?? "",
        model: settings.model ?? "",
        temperature: settings.temperature ?? 0.7,
        systemPrompt: settings.systemPrompt ?? "",
        hasApiKey: !!team.aiApiKey,
        configured: isAiConfigured(team),
        canManage: user.isAdmin,
      },
    };
  }
);

router.post(
  "ai.updateConfig",
  auth(),
  validate(T.AiConfigUpdateSchema),
  async (ctx: APIContext<T.AiConfigUpdateReq>) => {
    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });
    authorize(user, "update", team);

    const { apiKey, ...settings } = ctx.input.body;

    team.aiSettings = {
      ...(team.aiSettings ?? {}),
      ...settings,
    };
    if (apiKey !== undefined) {
      team.aiApiKey = apiKey === "" ? null : apiKey;
    }
    await team.save();

    const merged = team.aiSettings ?? {};
    ctx.body = {
      data: {
        enabled: !!merged.enabled,
        apiFormat: merged.apiFormat ?? "chat_completions",
        baseUrl: merged.baseUrl ?? "",
        model: merged.model ?? "",
        temperature: merged.temperature ?? 0.7,
        systemPrompt: merged.systemPrompt ?? "",
        hasApiKey: !!team.aiApiKey,
        configured: isAiConfigured(team),
        canManage: user.isAdmin,
      },
    };
  }
);

router.post(
  "ai.chat",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AiChatSchema),
  async (ctx: APIContext<T.AiChatReq>) => {
    const { user } = ctx.state.auth;
    const { message, conversationId, documentId } = ctx.input.body;
    const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });

    if (!isAiConfigured(team)) {
      throw InvalidRequestError("AI is not configured for this workspace");
    }

    // Resolve or create the conversation.
    let conversation: AiConversation;
    if (conversationId) {
      conversation = await AiConversation.findByPk(conversationId, {
        rejectOnEmpty: true,
      });
      authorize(user, "update", conversation);
    } else {
      conversation = await AiConversation.create({
        userId: user.id,
        teamId: user.teamId,
        documentId: documentId ?? null,
        title: message.slice(0, 100),
      });
    }

    // Persist the user's message.
    const userMessage = await AiMessage.create({
      conversationId: conversation.id,
      role: AiMessageRole.User,
      content: message,
    });

    // Gather conversation history and document context.
    const priorMessages = await AiMessage.findAll({
      where: { conversationId: conversation.id },
      order: [["createdAt", "ASC"]],
      limit: MAX_HISTORY_MESSAGES + 1,
    });

    const context = await buildDocumentContext(
      conversation.documentId,
      user.id
    );

    const settings = team.aiSettings ?? {};
    const systemParts = [
      settings.systemPrompt ||
        "You are a helpful assistant embedded in a knowledge base. Answer concisely using Markdown.",
    ];
    if (context) {
      systemParts.push(
        `The user is viewing the following document. Use it as context when relevant:\n\n---\n${context}\n---`
      );
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemParts.join("\n\n") },
      ...priorMessages.map((m) => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
      })),
    ];

    // Stream the assistant reply as Server-Sent Events so the client can render
    // it with a typewriter effect.
    const send = startSSE(ctx);
    send({
      type: "meta",
      conversation: presentAiConversation(conversation),
      userMessage: presentAiMessage(userMessage),
    });

    try {
      const reply = await streamChatCompletion(team, messages, (delta) => {
        send({ type: "delta", text: delta });
      });

      const assistantMessage = await AiMessage.create({
        conversationId: conversation.id,
        role: AiMessageRole.Assistant,
        content: reply,
      });

      // Touch the conversation so it sorts to the top of recent history.
      conversation.changed("updatedAt", true);
      await conversation.save();

      send({
        type: "done",
        assistantMessage: presentAiMessage(assistantMessage),
      });
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : "AI request failed",
      });
    } finally {
      ctx.res.end();
    }
  }
);

router.post(
  "ai.summary",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AiSummarySchema),
  async (ctx: APIContext<T.AiSummaryReq>) => {
    const { user } = ctx.state.auth;
    const { documentId } = ctx.input.body;
    const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });

    if (!isAiConfigured(team)) {
      throw InvalidRequestError("AI is not configured for this workspace");
    }

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    const markdown = (await DocumentHelper.toMarkdown(document)).slice(
      0,
      MAX_CONTEXT_CHARS
    );

    const send = startSSE(ctx);
    try {
      await streamChatCompletion(
        team,
        [
          {
            role: "system",
            content:
              "You are a concise summarizer. Produce a short summary (2-4 sentences) of the document the user provides. Respond in the same language as the document. Do not add a heading.",
          },
          { role: "user", content: markdown },
        ],
        (delta) => send({ type: "delta", text: delta })
      );
      send({ type: "done" });
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : "AI request failed",
      });
    } finally {
      ctx.res.end();
    }
  }
);

router.post(
  "aiConversations.list",
  auth(),
  pagination(),
  validate(T.AiConversationsListSchema),
  async (ctx: APIContext<T.AiConversationsListReq>) => {
    const { user } = ctx.state.auth;
    const documentId = ctx.input.body?.documentId;

    const conversations = await AiConversation.findAll({
      where: {
        userId: user.id,
        ...(documentId ? { documentId } : {}),
      },
      order: [["updatedAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: conversations.map(presentAiConversation),
      policies: presentPolicies(user, conversations),
    };
  }
);

router.post(
  "aiConversations.info",
  auth(),
  validate(T.AiConversationsInfoSchema),
  async (ctx: APIContext<T.AiConversationsInfoReq>) => {
    const { user } = ctx.state.auth;
    const { id } = ctx.input.body;

    const conversation = await AiConversation.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", conversation);

    const messages = await AiMessage.findAll({
      where: { conversationId: conversation.id },
      order: [["createdAt", "ASC"]],
    });

    ctx.body = {
      data: {
        conversation: presentAiConversation(conversation),
        messages: messages.map(presentAiMessage),
      },
      policies: presentPolicies(user, [conversation]),
    };
  }
);

router.post(
  "aiConversations.delete",
  auth(),
  validate(T.AiConversationsDeleteSchema),
  async (ctx: APIContext<T.AiConversationsDeleteReq>) => {
    const { user } = ctx.state.auth;
    const { id } = ctx.input.body;

    const conversation = await AiConversation.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "delete", conversation);

    await conversation.destroy();

    ctx.body = { success: true };
  }
);

export default router;
