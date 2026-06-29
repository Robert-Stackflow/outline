import { observer } from "mobx-react";
import { PlusIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { getAiConversationPath } from "~/scenes/Ai/aiNavigation";

/**
 * Sidebar panel listing the user's AI conversation history. Surfaced from the
 * CompactNav "AI" entry; each item opens the full AI page at that conversation.
 */
function AiPanel() {
  const { i18n, t } = useTranslation();
  const { ai } = useStores();
  const history = useHistory();
  const location = useLocation();
  const activeConversationId = React.useMemo(
    () => new URLSearchParams(location.search).get("c"),
    [location.search]
  );

  React.useEffect(() => {
    void ai.fetchConfig();
    void ai.fetchConversations();
  }, [ai]);

  const conversations = ai.orderedConversations;
  const conversationListTitle =
    i18n.language.startsWith("zh") || i18n.resolvedLanguage?.startsWith("zh")
      ? `${t("Chat")}${t("Lists")}`
      : `${t("Chat")} ${t("List").toLowerCase()}`;

  const handleDelete = React.useCallback(
    async (id: string) => {
      await ai.deleteConversation(id);
      if (activeConversationId === id) {
        history.replace(getAiConversationPath());
      }
    },
    [activeConversationId, ai, history]
  );

  return (
    <Scrollable flex shadow>
      <Inner>
        <Header>
          <Title>{conversationListTitle}</Title>
          <Tooltip content={t("New conversation")} placement="bottom">
            <NewLink
              to={getAiConversationPath()}
              aria-label={t("New conversation")}
              $active={
                !activeConversationId &&
                location.pathname === getAiConversationPath()
              }
            >
              <PlusIcon size={18} />
            </NewLink>
          </Tooltip>
        </Header>

        {conversations.length === 0 ? (
          <Empty>
            <Text as="p" type="tertiary" size="small">
              {t("No conversations yet")}
            </Text>
          </Empty>
        ) : (
          <List>
            {conversations.map((c) => (
              <Item key={c.id} $active={c.id === activeConversationId}>
                <ItemLink to={getAiConversationPath(c.id)}>
                  {c.title || t("Untitled")}
                </ItemLink>
                <Tooltip content={t("Delete")}>
                  <DeleteButton
                    aria-label={t("Delete")}
                    onClick={() => void handleDelete(c.id)}
                  >
                    <TrashIcon size={15} />
                  </DeleteButton>
                </Tooltip>
              </Item>
            ))}
          </List>
        )}
      </Inner>
    </Scrollable>
  );
}

const Inner = styled.div`
  padding: 8px 12px 16px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 46px;
  padding: 0 0 10px;
`;

const Title = styled.div`
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${s("text")};
`;

const NewLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  color: ${s("textTertiary")};
  border-radius: 6px;
  background: ${(props) =>
    props.$active ? props.theme.sidebarActiveBackground : "transparent"};

  &:hover {
    background: ${s("sidebarControlHoverBackground")};
    color: ${s("text")};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const Item = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  background: ${(props) =>
    props.$active ? props.theme.sidebarActiveBackground : "transparent"};

  &:hover {
    background: ${s("sidebarHoverBackground")};
  }
`;

const ItemLink = styled(Link)`
  display: block;
  min-width: 0;
  flex: 1;
  padding: 7px 8px;
  font-size: 14px;
  color: ${s("textSecondary")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: ${s("text")};
  }
`;

const DeleteButton = styled(NudeButton)`
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-inline-end: 3px;
  color: ${s("textTertiary")};
  opacity: 0;

  ${Item}:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const Empty = styled.div`
  padding: 16px 8px;
`;

export default observer(AiPanel);
