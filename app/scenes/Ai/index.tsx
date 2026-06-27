import { observer } from "mobx-react";
import { SparklesIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AiMessageRole } from "@shared/types";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import NudeButton from "~/components/NudeButton";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import useQuery from "~/hooks/useQuery";
import { settingsPath } from "~/utils/routeHelpers";

/**
 * A standalone page listing the user's AI conversation history with an inline
 * chat view for the selected conversation.
 */
function Ai() {
  const { t } = useTranslation();
  const { ai } = useStores();
  const params = useQuery();
  const [activeId, setActiveId] = React.useState<string>();
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  // Preselect a conversation when arrived at via ?c=<id> (sidebar history).
  const queryConversationId = params.get("c") ?? undefined;
  React.useEffect(() => {
    if (queryConversationId) {
      setActiveId(queryConversationId);
    }
  }, [queryConversationId]);

  React.useEffect(() => {
    void ai.fetchConfig();
    void ai.fetchConversations();
  }, [ai]);

  const conversations = ai.orderedConversations;
  const messages = activeId ? (ai.messages.get(activeId) ?? []) : [];

  React.useEffect(() => {
    if (activeId) {
      void ai.fetchConversation(activeId);
    }
  }, [activeId, ai]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, ai.isSending]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || ai.isSending) {
      return;
    }
    setInput("");
    const id = await ai.chat({ message, conversationId: activeId });
    setActiveId(id);
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await ai.deleteConversation(id);
    if (activeId === id) {
      setActiveId(undefined);
    }
  };

  const notConfigured = ai.config && !ai.config.configured;

  return (
    <Scene title={t("AI")} icon={<SparklesIcon />}>
      <Heading>{t("AI")}</Heading>

      {notConfigured ? (
        <Text as="p" type="secondary">
          {t("The AI assistant has not been configured yet.")}{" "}
          {ai.config?.canManage && (
            <Link to={settingsPath("ai")}>{t("Configure AI")}</Link>
          )}
        </Text>
      ) : (
        <Layout>
          <History>
            <NewButton
              onClick={() => {
                setActiveId(undefined);
                setInput("");
              }}
            >
              + {t("New conversation")}
            </NewButton>
            {conversations.length === 0 ? (
              <Empty>{t("No conversations yet")}</Empty>
            ) : (
              conversations.map((c) => (
                <HistoryItem
                  key={c.id}
                  $active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                >
                  <ItemBody>
                    <ItemTitle>{c.title || t("Untitled")}</ItemTitle>
                    <ItemTime type="tertiary" size="xsmall">
                      <Time dateTime={c.updatedAt} addSuffix />
                    </ItemTime>
                  </ItemBody>
                  <Tooltip content={t("Delete")}>
                    <NudeButton
                      onClick={(e) => handleDelete(c.id, e)}
                      aria-label={t("Delete")}
                    >
                      <TrashIcon size={16} />
                    </NudeButton>
                  </Tooltip>
                </HistoryItem>
              ))
            )}
          </History>

          <Chat>
            <ChatMessages ref={listRef}>
              {messages.length === 0 ? (
                <Empty>{t("Ask anything to get started.")}</Empty>
              ) : (
                messages.map((m) => (
                  <Message key={m.id} $role={m.role}>
                    <Bubble $role={m.role}>{m.content}</Bubble>
                  </Message>
                ))
              )}
              {ai.isSending &&
                messages[messages.length - 1]?.role !==
                  AiMessageRole.Assistant && (
                  <Message $role={AiMessageRole.Assistant}>
                    <Bubble $role={AiMessageRole.Assistant}>
                      <Typing>{t("Thinking…")}</Typing>
                    </Bubble>
                  </Message>
                )}
            </ChatMessages>
            <Composer align="flex-end" gap={8}>
              <TextArea
                value={input}
                placeholder={`${t("Send a message")}…`}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
              />
              <Button onClick={handleSend} disabled={!input.trim() || ai.isSending}>
                {t("Send")}
              </Button>
            </Composer>
          </Chat>
        </Layout>
      )}
    </Scene>
  );
}

const Layout = styled.div`
  display: flex;
  gap: 16px;
  height: calc(100vh - 160px);
`;

const History = styled.div`
  flex: 0 0 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NewButton = styled.button`
  text-align: left;
  border: 1px solid ${s("divider")};
  background: transparent;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const HistoryItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: var(--pointer);
  background: ${(props) =>
    props.$active ? props.theme.listItemHoverBackground : "transparent"};

  &:hover {
    background: ${s("listItemHoverBackground")};
  }
`;

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.div`
  font-size: 14px;
  color: ${s("text")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemTime = styled(Text)`
  display: block;
`;

const Chat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid ${s("divider")};
  border-radius: 12px;
  overflow: hidden;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Message = styled.div<{ $role: AiMessageRole }>`
  display: flex;
  justify-content: ${(props) =>
    props.$role === AiMessageRole.User ? "flex-end" : "flex-start"};
`;

const Bubble = styled.div<{ $role: AiMessageRole }>`
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
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

const Composer = styled(Flex)`
  padding: 12px;
  border-top: 1px solid ${s("divider")};
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  max-height: 200px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 15px;
  line-height: 1.5;
  background: ${s("background")};
  color: ${s("text")};
  outline: none;

  &:focus {
    border-color: ${s("inputBorderFocused")};
  }
`;

export default observer(Ai);
