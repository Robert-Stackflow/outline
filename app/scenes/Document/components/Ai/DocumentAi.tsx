import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
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

/**
 * The document-scoped AI chat panel rendered in the right sidebar. Chats are
 * grounded in the current document's content and persisted as conversations.
 */
function DocumentAi() {
  const { t } = useTranslation();
  const { ui, ai, documents } = useStores();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.get(match.params.documentSlug);

  const [conversationId, setConversationId] = React.useState<string>();
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void ai.fetchConfig();
  }, [ai]);

  const messages = conversationId
    ? (ai.messages.get(conversationId) ?? [])
    : [];

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

  const notConfigured = ai.config && !ai.config.configured;

  return (
    <Sidebar
      title={
        <Flex align="center" justify="space-between" gap={8} auto>
          <div>{t("AI assistant")}</div>
          <Tooltip content={t("New conversation")}>
            <NudeButton onClick={handleNewConversation} aria-label={t("New conversation")}>
              <PlusIcon />
            </NudeButton>
          </Tooltip>
        </Flex>
      }
      onClose={() => ui.set({ rightSidebar: null })}
      scrollable={false}
    >
      <Container>
        <Messages ref={listRef}>
          {notConfigured ? (
            <Notice>
              <Text as="p" type="secondary">
                {t("The AI assistant has not been configured yet.")}
              </Text>
              {ai.config?.canManage && (
                <Link to={settingsPath("ai")}>{t("Configure AI")}</Link>
              )}
            </Notice>
          ) : messages.length === 0 ? (
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
          {ai.isSending && (
            <Message $role={AiMessageRole.Assistant}>
              <Role>{t("Assistant")}</Role>
              <Bubble $role={AiMessageRole.Assistant}>
                <Typing>{t("Thinking…")}</Typing>
              </Bubble>
            </Message>
          )}
        </Messages>

        {!notConfigured && (
          <Composer>
            <TextArea
              value={input}
              placeholder={`${t("Send a message")}…`}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <Button onClick={handleSend} disabled={!input.trim() || ai.isSending}>
              {t("Send")}
            </Button>
          </Composer>
        )}
      </Container>
    </Sidebar>
  );
}

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
