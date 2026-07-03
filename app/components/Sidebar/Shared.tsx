import { useKBar } from "kbar";
import { observer } from "mobx-react";
import {
  CollapsedIcon,
  CollapseIcon,
  ExpandIcon,
  SearchIcon,
  SidebarIcon,
  SidebarReverseIcon,
} from "outline-icons";
import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { s } from "@shared/styles";
import { SidebarCollectionsStyle, type NavigationNode } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { metaDisplay, shortcutSeparator } from "@shared/utils/keyboard";
import type Document from "~/models/Document";
import type Share from "~/models/Share";
import { createAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import Flex from "~/components/Flex";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import Scrollable from "~/components/Scrollable";
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuTrigger,
} from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMenuAction } from "~/hooks/useMenuAction";
import useMobile from "~/hooks/useMobile";
import useShareBranding from "~/hooks/useShareBranding";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { homePath, sharedModelPath } from "~/utils/routeHelpers";
import { AvatarSize } from "../Avatar";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import SidebarExpansionContext, {
  useSidebarExpansion,
  useSidebarExpansionState,
} from "./components/SidebarExpansionContext";
import Section from "./components/Section";
import { SharedCollectionLink } from "./components/SharedCollectionLink";
import { SharedDocumentLink } from "./components/SharedDocumentLink";
import SidebarButton from "./components/SidebarButton";

type Props = {
  share: Share;
};

function SharedSidebar({ share }: Props) {
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { ui, documents, collections } = useStores();
  const { t } = useTranslation();
  const { query } = useKBar();
  const isMobile = useMobile();

  const { displayName, displayLogoUrl, displayLogoModel, brandingAvailable } =
    useShareBranding(share);
  const rootNode = share.tree;
  const shareId = share.urlId || share.id;
  const useDropdown =
    share.team?.sidebarCollectionsStyle === SidebarCollectionsStyle.Dropdown;
  const collection = collections.get(rootNode?.id);
  const hideRootNode = collection
    ? ProsemirrorHelper.isEmptyData(collection?.data)
    : false;

  const handleOpenSearch = useCallback(() => {
    query.toggle();
  }, [query]);

  const handleToggleSidebar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      ui.toggleCollapsedSidebar();
      (document.activeElement as HTMLElement)?.blur();
    },
    [ui]
  );

  const rootChildren = useMemo(
    () => (rootNode ? [rootNode] : undefined),
    [rootNode]
  );
  const expansion = useSidebarExpansionState(rootChildren, ui.activeDocumentId);

  useEffect(() => {
    ui.set({ tocVisible: share.showTOC });
  }, [share.showTOC, ui]);

  if (!rootNode?.children.length) {
    return null;
  }

  const collapseButton = !isMobile ? (
    <Tooltip
      content={t("Toggle sidebar")}
      shortcut={`${metaDisplay}${shortcutSeparator}.`}
    >
      <CollapseButton
        type="button"
        onClick={handleToggleSidebar}
        aria-label={
          ui.sidebarCollapsed ? t("Expand sidebar") : t("Collapse sidebar")
        }
      >
        {ui.sidebarIsClosed ? <SidebarReverseIcon /> : <SidebarIcon />}
      </CollapseButton>
    </Tooltip>
  ) : null;

  return (
    <Sidebar>
      {brandingAvailable && (
        <SidebarButton
          title={displayName}
          image={
            <TeamLogo
              model={displayLogoModel}
              src={displayLogoUrl ?? undefined}
              size={AvatarSize.XLarge}
              alt={t("Logo")}
            />
          }
          disabled={hideRootNode}
          onClick={
            hideRootNode
              ? undefined
              : () => history.push(user ? homePath() : sharedModelPath(shareId))
          }
        />
      )}
      <ScrollContainer topShadow flex>
        <TopSection align="center" gap={8}>
          <SearchButton onClick={handleOpenSearch}>
            <SearchIcon size={20} />
            <SearchLabel>{t("Search")}</SearchLabel>
            <Shortcut>
              {metaDisplay}
              {shortcutSeparator}K
            </Shortcut>
          </SearchButton>
          {collapseButton}
        </TopSection>
        <Section as="nav" aria-label={t("Documents")}>
          <SidebarExpansionContext.Provider value={expansion}>
            {share.collectionId && useDropdown ? (
              <SharedCollectionDropdown
                node={rootNode}
                shareId={shareId}
                activeDocumentId={ui.activeDocumentId}
                activeDocument={documents.active}
                prefetchDocument={documents.prefetchDocument}
              />
            ) : share.collectionId ? (
              <SharedCollectionLink
                node={rootNode}
                shareId={shareId}
                hideRootNode={hideRootNode}
              />
            ) : (
              <SharedDocumentLink
                index={0}
                // If the root node has an icon we need some extra space for it
                depth={rootNode.icon ? 1 : 0}
                shareId={shareId}
                node={rootNode}
                prefetchDocument={documents.prefetchDocument}
                activeDocumentId={ui.activeDocumentId}
                activeDocument={documents.active}
              />
            )}
          </SidebarExpansionContext.Provider>
        </Section>
      </ScrollContainer>
    </Sidebar>
  );
}

function SharedCollectionDropdown({
  activeDocument,
  activeDocumentId,
  node,
  prefetchDocument,
  shareId,
}: {
  activeDocument: Document | undefined;
  activeDocumentId: string | undefined;
  node: NavigationNode;
  prefetchDocument: (documentId: string) => Promise<Document | void>;
  shareId: string;
}) {
  const { t } = useTranslation();
  const expansion = useSidebarExpansion();
  const title = node.title || t("Untitled");
  const icon = node.icon ?? node.emoji;
  const sharedMenuActions = useMemo(
    () => [
      createAction({
        name: ({ t }) => t("Collapse all"),
        analyticsName: "Collapse all shared documents",
        section: NavigationSection,
        icon: <CollapseIcon />,
        perform: () => {
          expansion.collapseAll();
        },
      }),
      createAction({
        name: ({ t }) => t("Expand all"),
        analyticsName: "Expand all shared documents",
        section: NavigationSection,
        icon: <ExpandIcon />,
        perform: () => {
          expansion.expandAll([node]);
        },
      }),
    ],
    [expansion, node]
  );
  const sharedMenuAction = useMenuAction(sharedMenuActions);

  const handleOpenRoot = useCallback(() => {
    history.push(sharedModelPath(shareId));
  }, [shareId]);

  return (
    <SharedCollectionDropdownLayout>
      <SharedCollectionSelectorRow>
        <MenuProvider variant="dropdown">
          <Menu modal={false}>
            <MenuTrigger aria-label={t("Choose collection")}>
              <SharedCollectionSelectorButton type="button">
                <SharedCollectionSelectorIcon>
                  {icon ? (
                    <Icon value={icon} initial={title} color={node.color} />
                  ) : (
                    <Icon
                      value="collection"
                      initial={title}
                      color={node.color}
                    />
                  )}
                </SharedCollectionSelectorIcon>
                <SharedCollectionSelectorLabel>
                  {title}
                </SharedCollectionSelectorLabel>
                <SharedCollectionSelectorDisclosure aria-hidden>
                  <CollapsedIcon />
                </SharedCollectionSelectorDisclosure>
              </SharedCollectionSelectorButton>
            </MenuTrigger>
            <SharedCollectionMenuContent
              align="start"
              aria-label={t("Choose collection")}
            >
              <SharedCollectionMenuButton
                data-selected="true"
                icon={
                  <SharedCollectionMenuIcon>
                    {icon ? (
                      <Icon
                        value={icon}
                        initial={title}
                        color={node.color}
                        size={20}
                      />
                    ) : (
                      <Icon
                        value="collection"
                        initial={title}
                        color={node.color}
                        size={20}
                      />
                    )}
                  </SharedCollectionMenuIcon>
                }
                label={title}
                selected
                onClick={handleOpenRoot}
              />
            </SharedCollectionMenuContent>
          </Menu>
        </MenuProvider>
        <SharedCollectionMenuButtonWrapper>
          <DropdownMenu
            action={sharedMenuAction}
            align="end"
            ariaLabel={t("Collection options")}
          >
            <OverflowMenuButton />
          </DropdownMenu>
        </SharedCollectionMenuButtonWrapper>
      </SharedCollectionSelectorRow>
      {node.children.map((childNode, index) => (
        <SharedDocumentLink
          key={childNode.id}
          index={index}
          depth={1}
          shareId={shareId}
          node={childNode}
          prefetchDocument={prefetchDocument}
          activeDocumentId={activeDocumentId}
          activeDocument={activeDocument}
        />
      ))}
    </SharedCollectionDropdownLayout>
  );
}

const SharedCollectionDropdownLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 0;
`;

const SharedCollectionSelectorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 3px;
`;

const SharedCollectionSelectorButton = styled.button`
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

const SharedCollectionSelectorIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`;

const SharedCollectionSelectorLabel = styled.span`
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

const SharedCollectionSelectorDisclosure = styled.span`
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

const SharedCollectionMenuContent = styled(MenuContent)`
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

const SharedCollectionMenuButton = styled(MenuButton)`
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

const SharedCollectionMenuIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-inline-end: 7px;
  margin-inline-start: -1px;
  flex-shrink: 0;
`;

const SharedCollectionMenuButtonWrapper = styled.div`
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

const ScrollContainer = styled(Scrollable)`
  padding-bottom: 16px;
`;

const TopSection = styled(Flex)`
  padding: 8px;
  flex-shrink: 0;
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 6px 12px;
  margin: 8px 0;
  border: 1px solid ${s("inputBorder")};
  border-radius: 16px;
  background: ${s("background")};
  color: ${s("textTertiary")};
  cursor: var(--pointer);
  font-size: 14px;

  &:hover {
    border-color: ${s("inputBorderFocused")};
    color: ${s("textSecondary")};
  }
`;

const SearchLabel = styled.span`
  flex-grow: 1;
  text-align: start;
`;

const Shortcut = styled.span`
  flex-shrink: 0;
  font-size: 13px;
`;

const CollapseButton = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${s("textTertiary")};
  cursor: var(--pointer);
  flex-shrink: 0;
  opacity: 0.72;
  transition:
    opacity 150ms ease,
    background 120ms ease,
    color 120ms ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover,
  &:focus-visible {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
    opacity: 1;
  }

  [dir="rtl"] & svg {
    transform: scaleX(-1);
  }
`;

export default observer(SharedSidebar);
