import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AiMessageRole } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import Sidebar from "../SidebarLayout";

type Tab = "chat" | "summary";

/**
 * The document-scoped AI panel rendered in the right sidebar, with tabs for
 * chatting about the document and viewing an AI-generated summary.
 */
function DocumentAi() {
  const { t } = useTranslation();
  const { ui, ai, documents } = useStores();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.get(match.params.documentSlug);

  const [tab, setTab] = React.useState<Tab>("chat");
  const [conversationId, setConversationId] = React.useState<string>();
  const [input, setInput] = React.useState("");
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void ai.fetchConfig();
  }, [ai]);

  const messages = conversationId
    ? (ai.messages.get(conversationId) ?? [])
    : [];
  const summary = document ? ai.summaries.get(document.id) : undefined;

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, ai.isSending]);

  const handleSend = React.useCallback(async () => {
    const message = input.trim();
    if (!message || ai.isSending) {
      return;
    }
    setInput("");
    const id = await ai.chat({
      message,
      conversationId,
      documentId: document?.id,
    });
    setConversationId(id);
  }, [input, ai, conversationId, document?.id]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setInput("");
  };

  const handleGenerateSummary = React.useCallback(async () => {
    if (!document) {
      return;
    }
    setSummaryLoading(true);
    try {
      await ai.summarize(document.id);
    } catch (_err) {
      toast.error(t("Failed to generate summary"));
    } finally {
      setSummaryLoading(false);
    }
  }, [ai, document, t]);

  const notConfigured = ai.config && !ai.config.configured;

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" gap={8} auto>
          <div>{t("AI assistant")}</div>
          {tab === "chat" && (
            <Tooltip content={t("New conversation")}>
              <NudeButton
                onClick={handleNewConversation}
                aria-label={t("New conversation")}
              >
                <PlusIcon />
              </NudeButton>
            </Tooltip>
          )}
        </Flex>
      }
      onClose={() => ui.set({ rightSidebar: null })}
      scrollable={false}
    >
      <Container>
        <Tabs>
          <TabButton
            type="button"
            $active={tab === "chat"}
            onClick={() => setTab("chat")}
          >
            {t("Chat")}
          </TabButton>
          <TabButton
            type="button"
            $active={tab === "summary"}
            onClick={() => setTab("summary")}
          >
            {t("Summary")}
          </TabButton>
        </Tabs>

        {notConfigured ? (
          <Notice>
            <Text as="p" type="secondary">
              {t("The AI assistant has not been configured yet.")}
            </Text>
            {ai.config?.canManage && (
              <Link to={settingsPath("ai")}>{t("Configure AI")}</Link>
            )}
          </Notice>
        ) : tab === "summary" ? (
          <SummaryView>
            <SummaryActions>
              <Button
                neutral
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
              >
                {summaryLoading
                  ? `${t("Generating")}…`
                  : summary
                    ? t("Regenerate")
                    : t("Generate")}
              </Button>
            </SummaryActions>
            {summary ? (
              <SummaryBody>{summary}</SummaryBody>
            ) : (
              <Empty>
                <Text as="p" type="secondary">
                  {t("Generate an AI summary of this document.")}
                </Text>
              </Empty>
            )}
          </SummaryView>
        ) : (
          <>
            <Messages ref={listRef}>
              {messages.length === 0 ? (
                <Empty>
                  <Text as="p" type="secondary">
                    {t("Ask anything about this document.")}
                  </Text>
                </Empty>
              ) : (
                messages.map((message) => (
                  <Message key={message.id} $role={message.role}>
                    {message.role === AiMessageRole.Assistant && (
                      <Role>{t("Assistant")}</Role>
                    )}
                    <Bubble $role={message.role}>{message.content}</Bubble>
                  </Message>
                ))
              )}
              {ai.isSending &&
                messages[messages.length - 1]?.role !==
                  AiMessageRole.Assistant && (
                  <Message $role={AiMessageRole.Assistant}>
                    <Role>{t("Assistant")}</Role>
                    <Bubble $role={AiMessageRole.Assistant}>
                      <Typing>{t("Thinking…")}</Typing>
                    </Bubble>
                  </Message>
                )}
            </Messages>

            <Composer>
              <TextArea
                value={input}
                placeholder={`${t("Send a message")}…`}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || ai.isSending}
              >
                {t("Send")}
              </Button>
            </Composer>
          </>
        )}
      </Container>
    </Sidebar>
  );
}

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid ${s("divider")};
  flex-shrink: 0;
`;

const TabButton = styled.button<{ $active: boolean }>`
  border: 0;
  background: ${(props) =>
    props.$active ? props.theme.listItemHoverBackground : "transparent"};
  color: ${(props) => (props.$active ? props.theme.text : props.theme.textTertiary)};
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: var(--pointer);

  &:hover {
    color: ${s("text")};
  }
`;

const SummaryView = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
`;

const SummaryActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`;

const SummaryBody = styled.div`
  font-size: 14px;
  line-height: 1.7;
  color: ${s("text")};
  white-space: pre-wrap;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Message = styled.div<{ $role: AiMessageRole }>`
  display: flex;
  flex-direction: column;
  align-items: ${(props) =>
    props.$role === AiMessageRole.User ? "flex-end" : "flex-start"};
`;

const Role = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  margin-bottom: 4px;
`;

const Bubble = styled.div<{ $role: AiMessageRole }>`
  max-width: 92%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${s("text")};
  background: ${(props) =>
    props.$role === AiMessageRole.User
      ? props.theme.listItemHoverBackground
      : props.theme.backgroundSecondary};
`;

const Typing = styled.span`
  color: ${s("textTertiary")};
`;

const Empty = styled.div`
  margin-top: 24px;
  text-align: center;
`;

const Notice = styled.div`
  margin-top: 24px;
  text-align: center;
`;

const Composer = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px;
  border-top: 1px solid ${s("divider")};
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  max-height: 160px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  line-height: 1.5;
  background: ${s("background")};
  color: ${s("text")};
  outline: none;

  &:focus {
    border-color: ${s("inputBorderFocused")};
  }
  &::placeholder {
    color: ${s("placeholder")};
  }
`;

export default observer(DocumentAi);
