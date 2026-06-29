import { observer } from "mobx-react";
import { PlaneIcon, SparklesIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { AiMessageRole } from "@shared/types";
import { HEADER_HEIGHT } from "~/components/Header";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import { getAiConversationPath } from "./aiNavigation";

/**
 * A Notion-style AI workspace. Conversation history lives in the sidebar AI
 * panel; this scene focuses on the active chat and composer.
 */
function Ai() {
  const { t } = useTranslation();
  const { ai } = useStores();
  const history = useHistory();
  const params = useQuery();
  const [activeId, setActiveId] = React.useState<string>();
  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  const queryConversationId = params.get("c") ?? undefined;
  React.useEffect(() => {
    setActiveId(queryConversationId);
  }, [queryConversationId]);

  React.useEffect(() => {
    void ai.fetchConfig();
    void ai.fetchConversations();
  }, [ai]);

  const messages = activeId ? (ai.messages.get(activeId) ?? []) : [];
  const hasMessages = messages.length > 0;
  const notConfigured = ai.config && !ai.config.configured;
  const modelName = ai.config?.model;

  React.useEffect(() => {
    if (!activeId) {
      return;
    }

    void ai.fetchConversation(activeId);
  }, [activeId, ai]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, ai.isSending]);

  const handleSend = React.useCallback(async () => {
    const message = input.trim();
    if (!message || ai.isSending) {
      return;
    }

    setInput("");
    const id = await ai.chat({ message, conversationId: activeId });
    if (!id) {
      return;
    }

    setActiveId(id);
    history.replace(getAiConversationPath(id));
  }, [activeId, ai, history, input]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSend();
    },
    [handleSend]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <Scene title={t("AI")} icon={<SparklesIcon />} centered={false}>
      <Page>
        {notConfigured ? (
          <Notice>
            <NoticeIcon>
              <SparklesIcon />
            </NoticeIcon>
            <Text as="p" type="secondary">
              {t("The AI assistant has not been configured yet.")}{" "}
              {ai.config?.canManage && (
                <Link to={settingsPath("ai")}>{t("Configure AI")}</Link>
              )}
            </Text>
          </Notice>
        ) : (
          <Workspace $empty={!hasMessages}>
            {!hasMessages ? (
              <EmptyState>
                <HeroIcon>
                  <SparklesIcon />
                </HeroIcon>
                <HeroTitle>{t("What can I help with?")}</HeroTitle>
              </EmptyState>
            ) : (
              <MessageStack>
                {messages.map((message) => (
                  <Message key={message.id} $role={message.role}>
                    {message.role === AiMessageRole.User ? (
                      <UserBubble>{message.content}</UserBubble>
                    ) : (
                      <AssistantMessage>{message.content}</AssistantMessage>
                    )}
                  </Message>
                ))}
                {ai.isSending &&
                  messages[messages.length - 1]?.role !==
                    AiMessageRole.Assistant && (
                    <Message $role={AiMessageRole.Assistant}>
                      <AssistantMessage>
                        <Typing>{t("Thinking...")}</Typing>
                      </AssistantMessage>
                    </Message>
                  )}
                <div ref={endRef} />
              </MessageStack>
            )}

            <Composer onSubmit={handleSubmit} $empty={!hasMessages}>
              <TextArea
                value={input}
                placeholder={`${t("Ask AI anything")}...`}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                aria-label={t("Send a message")}
              />
              <ComposerFooter>
                <ModelLabel>{modelName || t("AI")}</ModelLabel>
                <Tooltip content={t("Send")}>
                  <SendButton
                    type="submit"
                    aria-label={t("Send")}
                    disabled={!input.trim() || ai.isSending}
                  >
                    <PlaneIcon size={16} />
                  </SendButton>
                </Tooltip>
              </ComposerFooter>
            </Composer>
          </Workspace>
        )}
      </Page>
    </Scene>
  );
}

const Page = styled.div`
  width: 100%;
  min-height: calc(100vh - ${HEADER_HEIGHT}px);
  padding: 8px 20px 32px;
  display: flex;
  justify-content: center;

  ${breakpoint("tablet")`
    padding: 12px 44px 40px;
  `};
`;

const Workspace = styled.div<{ $empty: boolean }>`
  width: min(100%, 760px);
  min-height: calc(100vh - ${HEADER_HEIGHT + 52}px);
  display: flex;
  flex-direction: column;
  justify-content: ${(props) => (props.$empty ? "center" : "flex-start")};
  gap: ${(props) => (props.$empty ? 22 : 20)}px;
  padding: ${(props) => (props.$empty ? "0 0 9vh" : "12px 0 0")};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
`;

const HeroIcon = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: ${s("text")};
  background: ${s("backgroundSecondary")};
  box-shadow: ${s("divider")} 0 0 0 1px inset;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const HeroTitle = styled.h1`
  margin: 0;
  color: ${s("text")};
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
`;

const MessageStack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding: 8px 0 4px;
`;

const Message = styled.div<{ $role: AiMessageRole }>`
  display: flex;
  justify-content: ${(props) =>
    props.$role === AiMessageRole.User ? "flex-end" : "flex-start"};
`;

const UserBubble = styled.div`
  max-width: min(72%, 520px);
  padding: 8px 13px;
  border-radius: 16px;
  color: ${s("text")};
  background: ${s("backgroundSecondary")};
  box-shadow: ${s("divider")} 0 0 0 1px inset;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
`;

const AssistantMessage = styled.div`
  width: min(100%, 680px);
  color: ${s("text")};
  font-size: 15px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Typing = styled.span`
  color: ${s("textTertiary")};
`;

const Composer = styled.form<{ $empty: boolean }>`
  position: ${(props) => (props.$empty ? "relative" : "sticky")};
  bottom: ${(props) => (props.$empty ? "auto" : "24px")};
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  color: ${s("text")};
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:focus-within {
    border-color: ${s("accent")};
    box-shadow:
      0 0 0 1px ${s("accent")},
      0 18px 50px rgba(0, 0, 0, 0.08),
      0 1px 2px rgba(0, 0, 0, 0.04);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 72px;
  max-height: 220px;
  resize: none;
  border: 0;
  outline: none;
  padding: 2px 2px 0;
  background: transparent;
  color: ${s("text")};
  font-size: 15px;
  line-height: 1.55;
  caret-color: ${s("text")};

  &::placeholder {
    color: ${s("textTertiary")};
  }
`;

const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const ModelLabel = styled.div`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${s("textTertiary")};
  font-size: 12px;
  font-weight: 500;
`;

const SendButton = styled.button`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  color: ${s("accentText")};
  background: ${s("accent")};
  cursor: var(--pointer);
  transition:
    background 160ms ease,
    opacity 160ms ease;

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }

  &:not(:disabled):hover {
    background: ${s("accent")};
  }
`;

const Notice = styled.div`
  width: min(100%, 520px);
  align-self: center;
  margin-top: 18vh;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  box-shadow: ${s("divider")} 0 0 0 1px inset;
`;

const NoticeIcon = styled.div`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${s("textSecondary")};
`;

export default observer(Ai);
