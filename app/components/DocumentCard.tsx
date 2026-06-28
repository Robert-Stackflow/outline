import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { subDays } from "date-fns";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { CloseIcon, DocumentIcon, ClockIcon } from "outline-icons";
import { useRef, useCallback, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import Squircle from "@shared/components/Squircle";
import { s, hover, ellipsis } from "@shared/styles";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Document from "~/models/Document";
import type Pin from "~/models/Pin";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import CollectionIcon from "./Icons/CollectionIcon";
import Text from "./Text";
import Tooltip from "./Tooltip";
import lazyWithRetry from "~/utils/lazyWithRetry";

const ReadingTime = lazyWithRetry(() => import("./ReadingTime"));

type Props = {
  /** The pin record */
  pin: Pin | undefined;
  /** The document related to the pin */
  document: Document;
  /** Whether the user has permission to delete or reorder the pin */
  canUpdatePin?: boolean;
  /** Whether this pin can be reordered by dragging */
  isDraggable?: boolean;
};

function DocumentCard(props: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const theme = useTheme();
  const { document, pin, canUpdatePin, isDraggable } = props;
  const pinnedToHome = useRef(!pin?.collectionId).current;
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.document.id,
    disabled: !isDraggable || !canUpdatePin,
  });

  const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUnpin = useCallback(
    async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await pin?.delete();
    },
    [pin]
  );

  // If the document was updated within the last 7 days, show a timestamp instead of reading time
  const isRecentlyUpdated =
    new Date(document.updatedAt) > subDays(new Date(), 7);

  const updatedAt = (
    <>
      <Clock size={14} />
      <Time dateTime={document.updatedAt} addSuffix shorten />
    </>
  );

  return (
    <Reorderable
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
      {...listeners}
      tabIndex={-1}
    >
      <AnimatePresence
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            bounce: 0.6,
          },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <DocumentLink
          dir={document.dir}
          $isDragging={isDragging}
          to={{
            pathname: document.path,
            state: {
              title: document.titleWithDefault,
            },
          }}
        >
          <Content>
            {document.icon ? (
              <DocumentSquircle
                icon={document.icon}
                color={document.color ?? undefined}
                initial={document.initial}
              />
            ) : (
              <Squircle
                size={32}
                color={
                  collection?.color ??
                  (pinnedToHome ? theme.slateLight : theme.slateDark)
                }
              >
                {collection?.icon &&
                collection?.icon !== "letter" &&
                collection?.icon !== "collection" &&
                pinnedToHome ? (
                  <CollectionIcon collection={collection} color="white" />
                ) : (
                  <DocumentIcon color="white" />
                )}
              </Squircle>
            )}
            <Details>
              <Heading dir={document.dir}>
                {hasEmojiInTitle
                  ? document.titleWithDefault.replace(document.icon!, "")
                  : document.titleWithDefault}
              </Heading>
              <DocumentMeta size="xsmall">
                {isRecentlyUpdated ? (
                  updatedAt
                ) : (
                  <Suspense fallback={updatedAt}>
                    <ReadingTime document={document} />
                  </Suspense>
                )}
              </DocumentMeta>
            </Details>
          </Content>
          {canUpdatePin && (
            <Actions dir={document.dir} gap={4}>
              {!isDragging && pin && (
                <Tooltip content={t("Unpin")}>
                  <PinButton onClick={handleUnpin} aria-label={t("Unpin")}>
                    <CloseIcon />
                  </PinButton>
                </Tooltip>
              )}
            </Actions>
          )}
        </DocumentLink>
      </AnimatePresence>
    </Reorderable>
  );
}

const DocumentSquircle = ({
  icon,
  initial,
  color,
}: {
  icon: string;
  initial: string;
  color?: string;
}) => {
  const theme = useTheme();
  const iconType = determineIconType(icon)!;
  const squircleColor = iconType === IconType.SVG ? color : theme.slateLight;
  const style = {
    "--background": squircleColor,
  } as React.CSSProperties;

  return (
    <Squircle size={32} color={squircleColor} style={style}>
      <Icon value={icon} color={theme.white} initial={initial} forceColor />
    </Squircle>
  );
};

const Clock = styled(ClockIcon)`
  flex-shrink: 0;
`;

const AnimatePresence = styled(m.div)`
  width: 100%;
  height: 100%;
`;

const PinButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: ${s("background")};
  box-shadow: 0 0 0 1px ${s("divider")};
  color: ${s("textTertiary")};
  transition:
    background 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;

  &:${hover},
  &:active {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
    box-shadow: 0 0 0 1px ${s("inputBorder")};
  }
`;

const Actions = styled(Flex)`
  position: absolute;
  top: 50%;
  right: ${(props) => (props.dir === "rtl" ? "auto" : "8px")};
  left: ${(props) => (props.dir === "rtl" ? "8px" : "auto")};
  transform: translateY(-50%);
  opacity: 0;
  color: ${s("textTertiary")};
  transition: opacity 120ms ease;

  // move actions above content
  z-index: 2;
`;

const Reorderable = styled.div<{ $isDragging: boolean }>`
  position: relative;
  user-select: none;
  touch-action: none;
  width: 100%;
  height: 76px;
  transition:
    opacity 150ms ease,
    box-shadow 150ms ease;

  // move above other cards when dragging
  z-index: ${(props) => (props.$isDragging ? 1 : "inherit")};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};

  &:${hover} ${Actions},
  &:focus-within ${Actions} {
    opacity: 1;
  }
`;

const Content = styled(Flex)`
  align-items: center;
  min-width: 0;
  height: 100%;
  gap: 10px;
`;

const Details = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

const DocumentMeta = styled(Text)`
  ${ellipsis()}
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${s("textTertiary")};
  margin: 0;
`;

const DocumentLink = styled(Link)<{
  $isDragging?: boolean;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px;
  padding-inline-end: 40px;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  cursor: var(--pointer);
  text-decoration: none;
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  box-shadow: ${(props) =>
    props.$isDragging
      ? "rgba(0, 0, 0, 0.1) 0px 8px 24px"
      : "rgba(0, 0, 0, 0.03) 0px 1px 2px"};
  transition:
    background 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;

  ${Actions} {
    opacity: 0;
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("backgroundSecondary")};
    border-color: ${s("inputBorder")};
    box-shadow:
      rgba(0, 0, 0, 0.08) 0px 2px 4px,
      rgba(0, 0, 0, 0.06) 0px 8px 20px;
    z-index: 1;

    ${Actions} {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: none;
    border-color: ${s("inputBorderFocused")};
    box-shadow:
      0 0 0 2px ${s("inputBorderFocused")},
      rgba(0, 0, 0, 0.08) 0px 2px 4px;
  }
`;

const Heading = styled.h3`
  ${ellipsis()}
  margin-top: 0;
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 20px;

  color: ${s("text")};
  font-family: ${s("fontFamily")};
  font-weight: 500;
`;

export default observer(DocumentCard);
