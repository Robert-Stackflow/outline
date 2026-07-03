import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { CollapsedIcon, CollapseIcon, ExpandIcon } from "outline-icons";
import { useEffect, useMemo, useState } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import { SidebarCollectionsStyle, TeamPreference } from "@shared/types";
import type Collection from "~/models/Collection";
import { ActionSeparator, createAction } from "~/actions";
import { createCollection } from "~/actions/definitions/collections";
import { CollectionSection } from "~/actions/sections";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuTrigger,
} from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import type { CollectionMenuAction } from "~/hooks/useCollectionMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import type { DragObject } from "../hooks/useDragAndDrop";
import CollectionLinkChildren from "./CollectionLinkChildren";
import DraggableCollectionLink from "./DraggableCollectionLink";
import DropCursor from "./DropCursor";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

function Collections() {
  const { documents, auth, collections, ui } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(auth.team?.id);
  const orderedCollections = collections.allActive;
  const sidebarCollectionsStyle = auth.team?.getPreference(
    TeamPreference.SidebarCollectionsStyle
  );
  const useDropdown =
    sidebarCollectionsStyle === SidebarCollectionsStyle.Dropdown;
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | undefined
  >(ui.activeCollectionId ?? orderedCollections[0]?.id);
  const selectedCollection =
    orderedCollections.find(
      (collection) => collection.id === selectedCollectionId
    ) ?? orderedCollections[0];

  const params = useMemo(
    () => ({
      limit: 100,
    }),
    []
  );

  const extraCollectionMenuActions = useMemo(
    () => [
      createCollection,
      ActionSeparator,
      createAction({
        name: ({ t }) => t("Collapse all"),
        analyticsName: "Collapse all collections",
        section: CollectionSection,
        icon: <CollapseIcon />,
        perform: () => {
          window.dispatchEvent(new CustomEvent("sidebar:collapse-all"));
        },
      }),
      createAction({
        name: ({ t }) => t("Expand all"),
        analyticsName: "Expand all collections",
        section: CollectionSection,
        icon: <ExpandIcon />,
        perform: () => {
          window.dispatchEvent(new CustomEvent("sidebar:expand-all"));
        },
      }),
    ],
    []
  );

  useEffect(() => {
    if (ui.activeCollectionId) {
      setSelectedCollectionId(ui.activeCollectionId);
    }
  }, [ui.activeCollectionId]);

  useEffect(() => {
    if (!orderedCollections.length) {
      setSelectedCollectionId(undefined);
      return;
    }

    if (
      !selectedCollectionId ||
      !orderedCollections.some(
        (collection) => collection.id === selectedCollectionId
      )
    ) {
      setSelectedCollectionId(orderedCollections[0].id);
    }
  }, [orderedCollections, selectedCollectionId]);

  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: async (item: DragObject) => {
      void collections.move(
        item.id,
        fractionalIndex(null, orderedCollections[0].index)
      );
    },
    canDrop: (item) => item.id !== orderedCollections[0].id,
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.getItemType() === "collection",
    }),
  });

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollectionId(collection.id);
    void collection.fetchDocuments();
    history.push({
      pathname: collection.path,
      state: { sidebarContext: "collections" },
    });
  };

  return (
    <SidebarContext.Provider value="collections">
      <Flex column>
        {useDropdown ? (
          <Relative>
            <CollectionsDropdown
              collections={orderedCollections}
              selectedCollection={selectedCollection}
              extraCollectionMenuActions={extraCollectionMenuActions}
              onSelectCollection={handleSelectCollection}
            />
          </Relative>
        ) : (
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
                  extraMenuActions={extraCollectionMenuActions}
                />
              )}
            />
          </Relative>
        )}
      </Flex>
    </SidebarContext.Provider>
  );
}

function CollectionsDropdown({
  collections,
  extraCollectionMenuActions,
  onSelectCollection,
  selectedCollection,
}: {
  collections: Collection[];
  extraCollectionMenuActions: CollectionMenuAction[];
  onSelectCollection: (collection: Collection) => void;
  selectedCollection: Collection | undefined;
}) {
  const { t } = useTranslation();
  const { documents } = useStores();

  if (!selectedCollection) {
    return (
      <DropdownLayout>
        <SelectorRow>
          <EmptySelector>
            <Text type="tertiary" size="small" italic>
              {t("No collections")}
            </Text>
          </EmptySelector>
        </SelectorRow>
      </DropdownLayout>
    );
  }

  return (
    <DropdownLayout>
      <SelectorRow>
        <MenuProvider variant="dropdown">
          <Menu modal={false}>
            <MenuTrigger aria-label={t("Choose collection")}>
              <CollectionSelectorButton type="button">
                <SelectorIcon>
                  <CollectionIcon collection={selectedCollection} expanded />
                </SelectorIcon>
                <SelectorLabel>{selectedCollection.name}</SelectorLabel>
                <SelectorDisclosure aria-hidden>
                  <CollapsedIcon />
                </SelectorDisclosure>
              </CollectionSelectorButton>
            </MenuTrigger>
            <CollectionMenuContent
              align="start"
              aria-label={t("Choose collection")}
            >
              {collections.map((collection) => (
                <CollectionMenuButton
                  key={collection.id}
                  data-selected={
                    collection.id === selectedCollection.id ? "true" : undefined
                  }
                  icon={
                    <CollectionMenuIcon>
                      <CollectionIcon collection={collection} size={20} />
                    </CollectionMenuIcon>
                  }
                  label={collection.name}
                  selected={collection.id === selectedCollection.id}
                  onClick={() => onSelectCollection(collection)}
                />
              ))}
            </CollectionMenuContent>
          </Menu>
        </MenuProvider>
        <CollectionMenuButtonWrapper>
          <CollectionMenu
            collection={selectedCollection}
            align="end"
            extraActions={extraCollectionMenuActions}
          />
        </CollectionMenuButtonWrapper>
      </SelectorRow>

      <CollectionLinkChildren
        collection={selectedCollection}
        expanded
        depth={1}
        prefetchDocument={documents.prefetchDocument}
      />
    </DropdownLayout>
  );
}

const DropdownLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 0;
`;

const SelectorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 3px;
`;

const CollectionSelectorButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: ${s("sidebarHoverBackground")};
  color: ${s("sidebarText")};
  cursor: var(--pointer);
  outline: 0;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    color 120ms ease;

  &:hover,
  &[data-state="open"] {
    background: ${s("sidebarActiveBackground")};
    border-color: ${s("divider")};
    color: ${s("text")};
  }

  &:focus-visible {
    border-color: ${s("accent")};
    box-shadow: 0 0 0 2px ${(props) => props.theme.sidebarBackground};
  }
`;

const EmptySelector = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: ${s("sidebarHoverBackground")};
`;

const SelectorIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`;

const SelectorLabel = styled.span`
  min-width: 0;
  flex: 1;
  margin-inline-start: 7px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-align: start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SelectorDisclosure = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-inline-start: 6px;
  color: ${s("textTertiary")};
  flex-shrink: 0;
  transition:
    color 120ms ease,
    transform 140ms ease;

  [data-state="open"] & {
    color: ${s("textSecondary")};
    transform: rotate(180deg);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const CollectionMenuContent = styled(MenuContent)`
  width: max(var(--radix-dropdown-menu-trigger-width), 220px);
  min-width: 0;
  max-width: min(272px, calc(100vw - 24px));
  min-height: 0;
  padding: 4px;
  border-radius: 8px;
  box-shadow: ${(props) =>
    props.theme.isDark
      ? `0 0 0 1px ${props.theme.divider}, 0 10px 28px rgba(0, 0, 0, 0.42)`
      : `0 0 0 1px ${props.theme.divider}, 0 10px 24px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.06)`};
`;

const CollectionMenuButton = styled(MenuButton)`
  && {
    min-height: 34px;
    margin-block-end: 2px;
    padding: 5px 8px;
    border-radius: 6px;
    color: ${s("sidebarText")};
    font-size: 14px;
    line-height: 22px;
    transition:
      background 100ms ease,
      color 100ms ease;
  }

  &&:last-child {
    margin-block-end: 0;
  }

  &&[data-selected="true"] {
    background: ${s("sidebarActiveBackground")};
    color: ${s("text")};
    font-weight: 600;
  }

  &&[data-highlighted],
  &&:focus-visible {
    background: ${s("sidebarControlHoverBackground")};
    color: ${s("text")};
  }

  && > div {
    min-width: 0;
    line-height: 22px;
  }

  && > span:last-child {
    width: 20px;
    height: 20px;
    margin-inline-end: -2px;
    color: ${s("textSecondary")};
  }

  && > span:last-child svg {
    width: 16px;
    height: 16px;
  }
`;

const CollectionMenuIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-inline-end: 7px;
  margin-inline-start: -1px;
  flex-shrink: 0;
`;

const CollectionMenuButtonWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  button {
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none !important;
    color: ${s("textSecondary")};
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  button:hover,
  button:focus-visible,
  button[aria-expanded="true"] {
    background: ${s("sidebarControlHoverBackground")};
    box-shadow: none !important;
    color: ${s("text")};
  }

  button:focus-visible {
    outline: 1px solid ${s("inputBorderFocused")};
    outline-offset: 1px;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const StyledError = styled(Error)`
  font-size: 15px;
  padding: 0 8px;
`;

export default observer(Collections);
