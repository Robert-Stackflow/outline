import { action, observable, runInAction } from "mobx";
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
   * Sends a message and returns the conversation id (newly created if needed).
   */
  @action
  chat = async (params: {
    message: string;
    conversationId?: string;
    documentId?: string;
  }): Promise<string> => {
    this.isSending = true;

    // Optimistically append the user's message if we have a conversation.
    if (params.conversationId) {
      const optimistic: AiMessage = {
        id: `temp-${Date.now()}`,
        conversationId: params.conversationId,
        role: AiMessageRole.User,
        content: params.message,
      };
      runInAction(() => {
        const existing = this.messages.get(params.conversationId!) ?? [];
        this.messages.set(params.conversationId!, [...existing, optimistic]);
      });
    }

    try {
      const res = await client.post("/ai.chat", params);
      const conversation = res.data.conversation as AiConversation;
      const newMessages = res.data.messages as AiMessage[];

      runInAction(() => {
        this.conversations.set(conversation.id, conversation);
        // Replace any optimistic messages with the authoritative list tail.
        const existing = (this.messages.get(conversation.id) ?? []).filter(
          (m) => !m.id.startsWith("temp-")
        );
        this.messages.set(conversation.id, [...existing, ...newMessages]);
      });

      return conversation.id;
    } finally {
      runInAction(() => {
        this.isSending = false;
      });
    }
  };

  @action
  summarize = async (documentId: string): Promise<string> => {
    const res = await client.post("/ai.summary", { documentId });
    runInAction(() => {
      this.summaries.set(documentId, res.data.summary);
    });
    return res.data.summary as string;
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
