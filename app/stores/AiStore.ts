import { action, observable, runInAction } from "mobx";
import { getCookie } from "tiny-cookie";
import { CSRF } from "@shared/constants";
import { AiMessageRole } from "@shared/types";
import type RootStore from "./RootStore";
import { client } from "~/utils/ApiClient";

export type AiConfig = {
  enabled: boolean;
  apiFormat: string;
  baseUrl: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  hasApiKey: boolean;
  configured: boolean;
  canManage: boolean;
};

export type AiConversation = {
  id: string;
  title: string | null;
  documentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  createdAt?: string;
};

/**
 * Store for the AI assistant: workspace configuration, conversation history,
 * and chat/summary interactions. Endpoints have bespoke payload shapes, so this
 * store talks to the API directly rather than using the generic model Store.
 */
export default class AiStore {
  rootStore: RootStore;

  /** The workspace AI configuration, once fetched. */
  @observable
  config?: AiConfig;

  /** All loaded conversations, keyed by id. */
  @observable
  conversations = observable.map<string, AiConversation>();

  /** Messages for each conversation, keyed by conversation id. */
  @observable
  messages = observable.map<string, AiMessage[]>();

  /** Generated summaries, keyed by document id (session cache). */
  @observable
  summaries = observable.map<string, string>();

  /** Whether a chat request is currently in flight. */
  @observable
  isSending = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  /** Conversations ordered by most recently updated. */
  get orderedConversations(): AiConversation[] {
    return Array.from(this.conversations.values()).sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1
    );
  }

  @action
  fetchConfig = async (): Promise<AiConfig> => {
    const res = await client.post("/ai.config");
    runInAction(() => {
      this.config = res.data;
    });
    return res.data;
  };

  @action
  updateConfig = async (params: Partial<AiConfig> & { apiKey?: string }) => {
    const res = await client.post("/ai.updateConfig", params);
    runInAction(() => {
      this.config = res.data;
    });
    return res.data;
  };

  @action
  fetchConversations = async (documentId?: string) => {
    const res = await client.post("/aiConversations.list", { documentId });
    runInAction(() => {
      (res.data as AiConversation[]).forEach((c) =>
        this.conversations.set(c.id, c)
      );
    });
    return res.data as AiConversation[];
  };

  @action
  fetchConversation = async (id: string) => {
    const res = await client.post("/aiConversations.info", { id });
    runInAction(() => {
      this.conversations.set(res.data.conversation.id, res.data.conversation);
      this.messages.set(res.data.conversation.id, res.data.messages);
    });
    return res.data;
  };

  @action
  deleteConversation = async (id: string) => {
    await client.post("/aiConversations.delete", { id });
    runInAction(() => {
      this.conversations.delete(id);
      this.messages.delete(id);
    });
  };

  /**
   * Sends a message and streams the assistant reply token-by-token, updating the
   * message list as deltas arrive. Returns the conversation id.
   */
  @action
  chat = async (params: {
    message: string;
    conversationId?: string;
    documentId?: string;
  }): Promise<string> => {
    this.isSending = true;

    let convId = params.conversationId;
    const tempAssistantId = `temp-asst-${Date.now()}`;
    let assistantContent = "";

    // Show the user's message and an empty assistant bubble immediately.
    if (convId) {
      runInAction(() => {
        const existing = this.messages.get(convId!) ?? [];
        this.messages.set(convId!, [
          ...existing,
          {
            id: `temp-user-${Date.now()}`,
            conversationId: convId!,
            role: AiMessageRole.User,
            content: params.message,
          },
          {
            id: tempAssistantId,
            conversationId: convId!,
            role: AiMessageRole.Assistant,
            content: "",
          },
        ]);
      });
    }

    try {
      await this.streamRequest("/api/ai.chat", params, (event) => {
        if (event.type === "meta") {
          const conversation = event.conversation as AiConversation;
          convId = conversation.id;
          runInAction(() => {
            this.conversations.set(conversation.id, conversation);
            const existing = (this.messages.get(conversation.id) ?? []).filter(
              (m) => !m.id.startsWith("temp-")
            );
            this.messages.set(conversation.id, [
              ...existing,
              event.userMessage as AiMessage,
              {
                id: tempAssistantId,
                conversationId: conversation.id,
                role: AiMessageRole.Assistant,
                content: "",
              },
            ]);
          });
        } else if (event.type === "delta") {
          assistantContent += event.text as string;
          if (convId) {
            const id = convId;
            runInAction(() => {
              const msgs = this.messages.get(id) ?? [];
              this.messages.set(
                id,
                msgs.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            });
          }
        } else if (event.type === "done") {
          if (convId) {
            const id = convId;
            runInAction(() => {
              const msgs = this.messages.get(id) ?? [];
              this.messages.set(
                id,
                msgs.map((m) =>
                  m.id === tempAssistantId
                    ? (event.assistantMessage as AiMessage)
                    : m
                )
              );
            });
          }
        } else if (event.type === "error") {
          throw new Error((event.message as string) || "AI request failed");
        }
      });

      return convId ?? "";
    } finally {
      runInAction(() => {
        this.isSending = false;
      });
    }
  };

  /**
   * Streams a document summary, updating the cached summary as deltas arrive.
   */
  @action
  summarize = async (documentId: string): Promise<string> => {
    let text = "";
    runInAction(() => this.summaries.set(documentId, ""));

    await this.streamRequest("/api/ai.summary", { documentId }, (event) => {
      if (event.type === "delta") {
        text += event.text as string;
        runInAction(() => this.summaries.set(documentId, text));
      } else if (event.type === "error") {
        throw new Error((event.message as string) || "AI request failed");
      }
    });

    return text;
  };

  /**
   * POSTs to a Server-Sent Events endpoint and dispatches each parsed JSON
   * payload to `onEvent`. Adds the CSRF token the same way ApiClient does.
   */
  private streamRequest = async (
    url: string,
    body: object,
    onEvent: (event: Record<string, unknown>) => void
  ) => {
    const csrfToken = getCookie(CSRF.cookieName);
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "x-api-version": "4",
        ...(csrfToken ? { [CSRF.headerName]: csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      let message = "AI request failed";
      try {
        const data = await response.json();
        message = data?.message || message;
      } catch (_err) {
        // ignore
      }
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!line) {
          continue;
        }
        const data = line.slice(5).trim();
        if (!data) {
          continue;
        }
        try {
          onEvent(JSON.parse(data));
        } catch (_err) {
          // ignore malformed event
        }
      }
    }
  };

  @action
  clear = () => {
    this.config = undefined;
    this.conversations.clear();
    this.messages.clear();
    this.summaries.clear();
    this.isSending = false;
  };
}
