import { observer } from "mobx-react";
import { PlusIcon, SparklesIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { aiPath } from "~/utils/routeHelpers";

/**
 * Sidebar panel listing the user's AI conversation history. Surfaced from the
 * CompactNav "AI" entry; each item opens the full AI page at that conversation.
 */
function AiPanel() {
  const { t } = useTranslation();
  const { ai } = useStores();

  React.useEffect(() => {
    void ai.fetchConfig();
    void ai.fetchConversations();
  }, [ai]);

  const conversations = ai.orderedConversations;

  return (
    <Scrollable flex shadow>
      <Inner>
        <Header>
          <Title>
            <SparklesIcon size={18} />
            {t("AI")}
          </Title>
          <NewLink to={aiPath()}>
            <PlusIcon size={16} />
            {t("New")}
          </NewLink>
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
              <Item key={c.id} to={`${aiPath()}?c=${c.id}`}>
                {c.title || t("Untitled")}
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
  padding: 4px 8px 8px;
`;

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: ${s("text")};

  svg {
    color: ${s("accent")};
  }
`;

const NewLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: ${s("textTertiary")};
  padding: 4px 6px;
  border-radius: 6px;

  &:hover {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const Item = styled(Link)`
  display: block;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: ${s("textSecondary")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
  }
`;

const Empty = styled.div`
  padding: 16px 8px;
`;

export default observer(AiPanel);
