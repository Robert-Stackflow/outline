import { observer } from "mobx-react";
import { DocumentIcon, GoToIcon } from "outline-icons";
import {
  useCallback,
  useEffect,
  useRef,
  Fragment,
  useMemo,
  useState,
} from "react";
import { Trans } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis, truncateMultiline } from "@shared/styles";
import type { JSONValue, NavigationNode } from "@shared/types";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Document from "~/models/Document";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import Fade from "~/components/Fade";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { determineSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import useClickIntent from "~/hooks/useClickIntent";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import ReferenceListItem from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";
import { flattenTree } from "@shared/utils/tree";

type Props = {
  document: Document;
};

type TabType = "children" | "backlinks";

const descriptionPropertyKeys = [
  "description",
  "desc",
  "summary",
  "digest",
  "excerpt",
  "简介",
  "摘要",
];

const inlineMetadataKeys = [
  "id",
  "title",
  "englishTitle",
  "slug",
  "url",
  "difficulty",
  "tags",
  "categories",
  "source",
  "link",
  "date",
  "draft",
  "aliases",
];

const digestContentMarkers = [
  "题面",
  "描述",
  "思路",
  "解法",
  "代码",
  "正文",
  "分析",
  "示例",
  "答案",
  "solution",
  "description",
  "approach",
  "algorithm",
  "notes",
];

function References({ document }: Props) {
  const { documents } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const locationSidebarContext = useLocationSidebarContext();
  const { sharedTree, isShare } = useShare();
  const [activeTab, setActiveTab] = useState<TabType>("children");

  useEffect(() => {
    if (!isShare) {
      void documents.fetchRelationships(document.id);
    }
  }, [isShare, documents, document.id]);

  const children = useChildren(document, sharedTree);
  const backlinks = useBacklinks(document, sharedTree);
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const shouldFade = useRef(!showBacklinks && !showChildDocuments);
  const previewFetchAttemptIds = useRef(new Set<string>());
  const isBacklinksTab = activeTab === "backlinks" || !showChildDocuments;
  const Component = shouldFade.current ? Fade : Fragment;

  useEffect(() => {
    if (!showChildDocuments) {
      return;
    }

    children.forEach((node) => {
      const childDocument = documents.get(node.id);

      if (childDocument && hasDigestSource(childDocument)) {
        return;
      }

      if (previewFetchAttemptIds.current.has(node.id)) {
        return;
      }

      previewFetchAttemptIds.current.add(node.id);
      void documents
        .fetch(node.id, {
          force: !!childDocument,
          prefetch: true,
        })
        .catch(() => {
          previewFetchAttemptIds.current.delete(node.id);
        });
    });
  }, [children, documents, showChildDocuments]);

  return showBacklinks || showChildDocuments ? (
    <Component>
      <Tabs>
        {showChildDocuments && (
          <Tab
            active={!isBacklinksTab}
            onClick={() => setActiveTab("children")}
          >
            <Trans>Documents</Trans>
          </Tab>
        )}
        {showBacklinks && (
          <Tab
            active={isBacklinksTab}
            onClick={() => setActiveTab("backlinks")}
          >
            <Trans>Backlinks</Trans>
          </Tab>
        )}
      </Tabs>
      <Content>
        {isBacklinksTab ? (
          <List>
            {backlinks.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const backlinkedDocument = documents.get(node.id);
              return (
                <ReferenceListItem
                  anchor={backlinkedDocument?.urlId}
                  key={node.id}
                  document={backlinkedDocument || node}
                  showCollection={
                    backlinkedDocument?.collectionId !== document.collectionId
                  }
                  sidebarContext={
                    user && backlinkedDocument
                      ? determineSidebarContext({
                          document: backlinkedDocument,
                          user,
                          currentContext: locationSidebarContext,
                        })
                      : undefined
                  }
                />
              );
            })}
          </List>
        ) : (
          <ChildDocumentGrid>
            {children.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const childDocument = documents.get(node.id);
              return (
                <ChildDocumentCard
                  key={node.id}
                  node={node}
                  document={childDocument}
                  sidebarContext={locationSidebarContext}
                />
              );
            })}
          </ChildDocumentGrid>
        )}
      </Content>
    </Component>
  ) : null;
}

type ChildDocumentCardProps = {
  node: NavigationNode;
  document?: Document;
  sidebarContext?: SidebarContextType;
};

const ChildDocumentCard = observer(function ChildDocumentCard({
  node,
  document,
  sidebarContext,
}: ChildDocumentCardProps) {
  const { documents } = useStores();
  const { shareId } = useShare();
  const item = document ?? node;
  const prefetchDocument = useCallback(async () => {
    await documents.prefetchDocument(item.id);
  }, [documents, item.id]);
  const { handleMouseEnter, handleMouseLeave } =
    useClickIntent(prefetchDocument);
  const { icon, color } = item;
  const isEmoji = determineIconType(icon) === IconType.Emoji;
  const title = document?.titleWithDefault ?? node.title;
  const initial = title.charAt(0).toUpperCase();
  const digest = document ? getDocumentDigest(document) : "";
  const childPreviewNodes = getChildPreviewNodes(node, document);

  return (
    <ChildDocumentLink
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      to={{
        pathname: shareId ? sharedModelPath(shareId, item.url) : item.url,
        state: {
          title: item.title,
          sidebarContext,
        },
      }}
    >
      <ChildDocumentHeader dir="auto">
        <ChildDocumentTitleGroup>
          <ChildDocumentIcon>
            {icon ? (
              <Icon value={icon} color={color ?? undefined} initial={initial} />
            ) : (
              <DocumentIcon />
            )}
          </ChildDocumentIcon>
          <ChildDocumentTitle>
            {isEmoji && icon ? title.replace(icon, "") : title}
          </ChildDocumentTitle>
        </ChildDocumentTitleGroup>
        <ChildDocumentArrow aria-hidden>
          <GoToIcon />
        </ChildDocumentArrow>
      </ChildDocumentHeader>
      {digest ? (
        <ChildDocumentDigest dir="auto">{digest}</ChildDocumentDigest>
      ) : childPreviewNodes.length ? (
        <ChildDocumentChildrenPreview>
          {childPreviewNodes.map((node) => (
            <ChildDocumentChild key={node.id} dir="auto">
              {node.title}
            </ChildDocumentChild>
          ))}
        </ChildDocumentChildrenPreview>
      ) : (
        <ChildDocumentPlaceholder>
          <Trans>No description</Trans>
        </ChildDocumentPlaceholder>
      )}
    </ChildDocumentLink>
  );
});

/**
 * Hook to get the children of a document, filtering from the shared tree if available.
 *
 * @param document - the document to get children for.
 * @param sharedTree - the shared tree to filter from, if available.
 * @returns the children of the document.
 */
function useChildren(
  document: Document,
  sharedTree: NavigationNode | undefined
): NavigationNode[] {
  return useMemo(() => {
    if (!sharedTree) {
      return document.children;
    }

    function findChildren(node: NavigationNode): NavigationNode[] | undefined {
      if (node.id === document.id) {
        return node.children;
      }

      for (const child of node.children) {
        const result = findChildren(child);
        if (result) {
          return result;
        }
      }

      return undefined;
    }

    return findChildren(sharedTree) || [];
  }, [document.id, document.children, sharedTree]);
}

/**
 * Hook to get backlinks for a document, filtering from the shared tree if available.
 *
 * @param document - the document to get backlinks for.
 * @returns documents that link to this document.
 */
function useBacklinks(
  document: Document,
  sharedTree: NavigationNode | undefined
): Document[] {
  if (sharedTree) {
    return flattenTree(sharedTree).filter((node) =>
      document.backlinkIds?.includes(node.id)
    ) as Document[];
  }
  return document.backlinks;
}

function getDocumentDigest(document: Document): string {
  const propertyDigest = getPropertyDigest(document);

  if (propertyDigest) {
    return truncateDigest(propertyDigest);
  }

  return truncateDigest(getBodyDigest(document));
}

function getPropertyDigest(document: Document): string {
  for (const key of descriptionPropertyKeys) {
    const value = document.properties?.[key];
    const text = getPrimitiveText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function getPrimitiveText(value: JSONValue): string {
  if (typeof value === "string") {
    return normalizeDigest(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getBodyDigest(document: Document): string {
  if (!document.data) {
    return "";
  }

  try {
    const text = normalizeDigest(
      stripDigestMetadata(ProsemirrorHelper.toPlainText(document))
    );

    if (!text) {
      return "";
    }

    if (text.startsWith(document.title)) {
      return text.slice(document.title.length).trim();
    }

    return text;
  } catch {
    return "";
  }
}

function hasDigestSource(document: Document): boolean {
  if (getPropertyDigest(document)) {
    return true;
  }

  return !!getBodyDigest(document);
}

function getChildPreviewNodes(
  node: NavigationNode,
  document?: Document,
  limit = 4
): NavigationNode[] {
  const children = node.children.length ? node.children : document?.children;

  return (children ?? []).filter((node) => node.title.trim()).slice(0, limit);
}

function normalizeDigest(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripDigestMetadata(text: string): string {
  return stripLeadingInlineMetadata(stripLeadingMetadata(text));
}

function stripLeadingMetadata(text: string): string {
  const lines = text.split(/\r?\n/);
  let index = 0;
  let skipped = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index++;
      continue;
    }

    if (trimmed === "---" || trimmed === "+++" || isMetadataLine(trimmed)) {
      index++;
      skipped++;
      continue;
    }

    break;
  }

  if (skipped < 2) {
    return text;
  }

  return lines.slice(index).join("\n").trim();
}

function stripLeadingInlineMetadata(text: string): string {
  let output = normalizeDigest(text);
  let skipped = 0;

  while (output) {
    const leadingMatch = getLeadingMetadataKeyMatch(output);

    if (!leadingMatch) {
      break;
    }

    const contentMarkerIndex = getContentMarkerIndex(output);
    const nextKeyIndex = getNextMetadataKeyIndex(
      output,
      leadingMatch[0].length
    );

    if (
      nextKeyIndex !== undefined &&
      (contentMarkerIndex === undefined || nextKeyIndex < contentMarkerIndex)
    ) {
      output = output.slice(nextKeyIndex).trimStart();
      skipped++;
      continue;
    }

    if (contentMarkerIndex !== undefined) {
      output = output.slice(contentMarkerIndex).trimStart();
      skipped++;
      break;
    }

    return skipped > 0 ? "" : text;
  }

  return skipped > 0 ? output : text;
}

function isMetadataLine(text: string): boolean {
  return /^[A-Za-z_][\w.-]*\s*:\s+.+$/.test(text);
}

function getLeadingMetadataKeyMatch(text: string): RegExpExecArray | null {
  return getMetadataKeyRegex("^").exec(text);
}

function getNextMetadataKeyIndex(
  text: string,
  offset: number
): number | undefined {
  const match = getMetadataKeyRegex("\\s").exec(text.slice(offset));

  if (!match || match.index === undefined) {
    return undefined;
  }

  return offset + match.index + 1;
}

function getMetadataKeyRegex(prefix: string): RegExp {
  return new RegExp(
    `${prefix}(?:${inlineMetadataKeys.join("|")})\\s*:\\s+`,
    "i"
  );
}

function getContentMarkerIndex(text: string): number | undefined {
  const lowerText = text.toLocaleLowerCase();
  let index: number | undefined;

  for (const marker of digestContentMarkers) {
    const markerIndex = lowerText.indexOf(marker);

    if (markerIndex === -1) {
      continue;
    }

    if (index === undefined || markerIndex < index) {
      index = markerIndex;
    }
  }

  return index;
}

function truncateDigest(text: string, maxLength = 140): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

const Content = styled.div`
  position: relative;
  margin-top: 2px;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ChildDocumentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  `};
`;

const ChildDocumentLink = styled(Link)`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 104px;
  padding: 14px 15px 13px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  background: ${s("background")};
  cursor: var(--pointer);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:${hover},
  &:active,
  &:focus {
    background: ${s("listItemHoverBackground")};
    border-color: ${s("inputBorder")};
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
  }

  &:focus-visible {
    outline: none;
    border-color: ${s("inputBorderFocused")};
    box-shadow: 0 0 0 2px ${s("inputBorderFocused")};
  }
`;

const ChildDocumentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`;

const ChildDocumentTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const ChildDocumentIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: ${s("textTertiary")};
`;

const ChildDocumentTitle = styled.div`
  ${ellipsis()}
  min-width: 0;
  color: ${s("text")};
  font-family: ${s("fontFamily")};
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
`;

const ChildDocumentArrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: ${s("textTertiary")};
  opacity: 0.72;
`;

const ChildDocumentDigest = styled.div`
  ${truncateMultiline(2)}
  margin-top: 10px;
  color: ${s("textSecondary")};
  font-size: 13px;
  line-height: 20px;
`;

const ChildDocumentChildrenPreview = styled.div`
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 46px;
  margin-top: 10px;
  overflow: hidden;
`;

const ChildDocumentChild = styled.span`
  ${ellipsis()}
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  height: 20px;
  padding: 0 7px;
  border-radius: 5px;
  color: ${s("textSecondary")};
  background: ${s("sidebarControlHoverBackground")};
  font-size: 12px;
  line-height: 20px;
`;

const ChildDocumentPlaceholder = styled.div`
  margin-top: 10px;
  color: ${s("textTertiary")};
  font-size: 13px;
  line-height: 20px;
  font-style: italic;
`;

export default observer(References);
