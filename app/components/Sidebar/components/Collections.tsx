import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { CollapseIcon, ExpandIcon, PlusIcon } from "outline-icons";
import { useMemo } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Collection from "~/models/Collection";
import Flex from "~/components/Flex";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import Tooltip from "~/components/Tooltip";
import { createCollection } from "~/actions/definitions/collections";
import useActionContext from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";
import type { DragObject } from "../hooks/useDragAndDrop";
import DraggableCollectionLink from "./DraggableCollectionLink";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import Text from "@shared/components/Text";
import usePolicy from "~/hooks/usePolicy";

function Collections() {
  const { documents, auth, collections } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(auth.team?.id);
  const orderedCollections = collections.allActive;
  const actionContext = useActionContext({ isMenu: false });

  const params = useMemo(
    () => ({
      limit: 100,
    }),
    [],
  );

  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: async (item: DragObject) => {
      void collections.move(
        item.id,
        fractionalIndex(null, orderedCollections[0].index),
      );
    },
    canDrop: (item) => item.id !== orderedCollections[0].id,
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.getItemType() === "collection",
    }),
  });

  const handleCreate = (event: React.MouseEvent) => {
    createCollection.perform({ ...actionContext, event: event.nativeEvent });
  };

  const handleExpandAll = (event: React.MouseEvent) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("sidebar:expand-all"));
  };

  const handleCollapseAll = (event: React.MouseEvent) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("sidebar:collapse-all"));
  };

  const headerActions = (
    <>
      <Tooltip content={t("Collapse all")} placement="bottom">
        <HeaderIconButton
          type="button"
          onClick={handleCollapseAll}
          aria-label={t("Collapse all")}
        >
          <CollapseIcon />
        </HeaderIconButton>
      </Tooltip>
      <Tooltip content={t("Expand all")} placement="bottom">
        <HeaderIconButton
          type="button"
          onClick={handleExpandAll}
          aria-label={t("Expand all")}
        >
          <ExpandIcon />
        </HeaderIconButton>
      </Tooltip>
      {can.createCollection && (
        <Tooltip content={t("New collection")} placement="bottom">
          <HeaderIconButton
            type="button"
            onClick={handleCreate}
            aria-label={t("New collection")}
          >
            <PlusIcon />
          </HeaderIconButton>
        </Tooltip>
      )}
    </>
  );

  return (
    <SidebarContext.Provider value="collections">
      <Flex column>
        <Header
          id="collections"
          title={t("Collections")}
          actions={headerActions}
        >
          <Relative>
            <PaginatedList<Collection>
              options={params}
              aria-label={t("Collections")}
              items={orderedCollections}
              loading={<PlaceholderCollections />}
              heading={
                isDraggingAnyCollection ? (
                  <DropCursor
                    isActiveDrop={isCollectionDropping}
                    innerRef={dropToReorderCollection}
                    position="top"
                  />
                ) : undefined
              }
              empty={
                // No need for empty state if we're displaying the createCollection action
                can.createCollection ? null : (
                  <SidebarLink
                    label={
                      <Text type="tertiary" size="small" italic>
                        {t("No collections")}
                      </Text>
                    }
                    onClick={() => {}}
                    depth={1.5}
                  />
                )
              }
              renderError={(props) => <StyledError {...props} />}
              renderItem={(item, index) => (
                <DraggableCollectionLink
                  key={item.id}
                  collection={item}
                  activeDocument={documents.active}
                  belowCollection={orderedCollections[index + 1]}
                />
              )}
            />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
}

const HeaderIconButton = styled.button`
  appearance: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  outline: 0;
  border-radius: 6px;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  transition: background 100ms ease;
  padding: 0;

  svg {
    color: ${s("textSecondary")};
    opacity: 0.6;
    transition:
      opacity 120ms ease,
      color 120ms ease;
  }

  &:hover,
  &[data-state="open"] {
    background: ${s("sidebarControlHoverBackground")};

    svg {
      opacity: 1;
      color: ${s("text")};
    }
  }
`;

export const StyledError = styled(Error)`
  font-size: 15px;
  padding: 0 8px;
`;

export default observer(Collections);
