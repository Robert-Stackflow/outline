import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import {
  CommentIcon,
  DatabaseIcon,
  ImageIcon,
  SmileyIcon,
} from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useRef, useState, useCallback, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { AttachmentPreset } from "@shared/types";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import type Template from "~/models/Template";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import breakpoint from "styled-components-breakpoint";
import { documentPath } from "~/utils/routeHelpers";
import { uploadFile } from "~/utils/files";
import lazyWithRetry from "~/utils/lazyWithRetry";
import Tooltip from "~/components/Tooltip";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

const DEFAULT_DOCUMENT_ICONS = ["🏠", "📄", "💡", "📌", "🧭", "✨"] as const;

type Props = {
  /* The document to display meta data for */
  document: Document | Template;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
  readOnly?: boolean;
  iconColor: string;
  onChangeIcon?: (icon: string | null, color: string | null) => void;
  propertiesVisible?: boolean;
  onToggleProperties?: () => void;
};

function TitleDocumentMeta({
  document,
  iconColor,
  onChangeIcon,
  propertiesVisible,
  onToggleProperties,
  readOnly,
  rtl,
}: Props) {
  const { comments, ui } = useStores();
  const { i18n, t } = useTranslation();
  const sidebarContext = useLocationSidebarContext();
  const team = useCurrentTeam();
  const isChinese =
    i18n.language.startsWith("zh") || i18n.resolvedLanguage?.startsWith("zh");
  const addIconLabel = isChinese
    ? `${t("Add")}${t("Icon")}`
    : `${t("Add")} ${t("Icon").toLowerCase()}`;
  const articlePropertiesLabel = i18n.exists("Article properties")
    ? t("Article properties")
    : isChinese
      ? "文章属性"
      : "Article properties";
  const articlePropertiesTooltip = `${articlePropertiesLabel} · ${
    propertiesVisible ? t("Collapse") : t("Expand")
  }`;
  const can = usePolicy(document);
  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);
  const commentingEnabled = team.commentingEnabled;
  const defaultIconRef = useRef(getDefaultDocumentIcon());
  const [addIconPickerOpen, setAddIconPickerOpen] = useState(false);
  const canAddIcon =
    !readOnly &&
    can.update &&
    !!onChangeIcon &&
    (!document.icon || addIconPickerOpen);
  const canAddCover =
    isDocument(document) && !readOnly && can.update && !document.coverImage;
  const hasDocumentProperties = isDocument(document) && hasProperties(document);
  const canToggleProperties =
    isDocument(document) &&
    !!onToggleProperties &&
    ((!readOnly && can.update) || hasDocumentProperties);
  const canComment = commentingEnabled && can.comment && isDocument(document);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAddIconOpen = useCallback(() => {
    setAddIconPickerOpen(true);
    if (document.icon) {
      return;
    }

    onChangeIcon?.(defaultIconRef.current, null);
  }, [document.icon, onChangeIcon]);

  const handleAddIconClose = useCallback(() => {
    setAddIconPickerOpen(false);
  }, []);

  const handlePickCover = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !isDocument(document)) {
        return;
      }

      setUploading(true);
      try {
        const attachment = await uploadFile(file, {
          name: file.name,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
        });
        const coverImage = `${attachment.url}#y=50`;
        document.coverImage = coverImage;
        await document.save({ coverImage });
      } catch (_err) {
        toast.error(t("Failed to upload cover image"));
      } finally {
        setUploading(false);
      }
    },
    [document, t]
  );

  if (!canAddIcon && !canAddCover && !canToggleProperties && !canComment) {
    return null;
  }

  return (
    <Meta className="document-meta-line" $rtl={rtl}>
      {canAddIcon && (
        <React.Suspense
          fallback={
            <ActionButton type="button" disabled>
              <SmileyIcon size={18} />
              {addIconLabel}
            </ActionButton>
          }
        >
          <AddIconPicker
            icon={document.icon ?? defaultIconRef.current}
            color={iconColor}
            initial={document.initial}
            size={28}
            ariaLabel={addIconLabel}
            popoverPosition="bottom-start"
            allowDelete={!!document.icon || addIconPickerOpen}
            onChange={onChangeIcon}
            onOpen={handleAddIconOpen}
            onClose={handleAddIconClose}
          >
            <SmileyIcon size={18} />
            {addIconLabel}
          </AddIconPicker>
        </React.Suspense>
      )}
      {canAddCover && (
        <>
          <ActionButton
            type="button"
            onClick={handlePickCover}
            disabled={uploading}
          >
            <ImageIcon size={18} />
            {uploading ? t("Uploading…") : t("Add cover")}
          </ActionButton>
          <HiddenInput
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
          />
        </>
      )}
      {canToggleProperties && (
        <Tooltip content={articlePropertiesTooltip}>
          <ActionButton
            type="button"
            onClick={onToggleProperties}
            aria-label={articlePropertiesLabel}
            aria-pressed={propertiesVisible}
            $active={propertiesVisible}
          >
            <DatabaseIcon size={18} />
            {articlePropertiesLabel}
          </ActionButton>
        </Tooltip>
      )}
      {canComment && (
        <CommentLink
          to={{
            pathname: documentPath(document),
            state: { sidebarContext },
          }}
          onClick={() =>
            ui.set({
              rightSidebar: ui.rightSidebar === "comments" ? null : "comments",
            })
          }
        >
          <CommentIcon size={18} />
          {commentsCount
            ? t("{{ count }} comment", { count: commentsCount })
            : t("Comment")}
        </CommentLink>
      )}
    </Meta>
  );
}

function isDocument(document: Document | Template): document is Document {
  return "coverImage" in document;
}

function hasProperties(document: Document): boolean {
  return !!document.properties && Object.keys(document.properties).length > 0;
}

function getDefaultDocumentIcon(): string {
  const index = Math.floor(Math.random() * DEFAULT_DOCUMENT_ICONS.length);

  return DEFAULT_DOCUMENT_ICONS[index] ?? DEFAULT_DOCUMENT_ICONS[0];
}

const ActionButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: ${(props) =>
    props.$active
      ? transparentize(props.theme.isDark ? 0.78 : 0.88, props.theme.accent)
      : "transparent"};
  color: ${(props) =>
    props.$active ? props.theme.accent : props.theme.textTertiary};
  font-size: 14px;
  font-weight: 500;
  line-height: 28px;
  cursor: var(--pointer);

  &:hover {
    background: ${(props) =>
      props.$active
        ? transparentize(props.theme.isDark ? 0.72 : 0.84, props.theme.accent)
        : props.theme.listItemHoverBackground};
    color: ${(props) =>
      props.$active ? props.theme.accent : props.theme.text};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

const AddIconPicker = styled(IconPicker)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${s("textTertiary")};
  font-size: 14px;
  font-weight: 500;
  line-height: 28px;
  cursor: var(--pointer);

  &:hover,
  &:active,
  &[aria-expanded="true"] {
    background: ${s("listItemHoverBackground")};
    box-shadow: none;
    color: ${s("text")};
  }
`;

const CommentLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  color: ${s("textTertiary")};
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
    text-decoration: none;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

export const Meta = styled.div<{ $rtl?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$rtl ? "flex-end" : "flex-start")};
  gap: 2px;
  margin: -12px 0 8px 0;
  min-height: 28px;
  position: relative;
  user-select: none;
  z-index: 1;

  ${breakpoint("mobile", "tablet")`
    flex-wrap: wrap;
  `}

  @media print {
    display: none;
  }
`;

export default observer(TitleDocumentMeta);
