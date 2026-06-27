import { observer } from "mobx-react";
import { ImageIcon, TrashIcon, MoveIcon, DoneIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { AttachmentPreset } from "@shared/types";
import type Document from "~/models/Document";
import Flex from "~/components/Flex";
import { uploadFile } from "~/utils/files";

type Props = {
  /** The document to display and edit the cover image for. */
  document: Document;
  /** Whether the document is read-only. */
  readOnly?: boolean;
};

/** Splits a stored cover value into its URL and vertical focal point (0-100). */
function parseCover(value: string | null | undefined): {
  url: string;
  posY: number;
} {
  if (!value) {
    return { url: "", posY: 50 };
  }
  const match = value.match(/#y=(\d+(?:\.\d+)?)$/);
  if (match) {
    return { url: value.slice(0, match.index), posY: Number(match[1]) };
  }
  return { url: value, posY: 50 };
}

/** Serializes a URL + focal point back into the stored cover value. */
function serializeCover(url: string, posY: number): string {
  return `${url}#y=${Math.round(posY)}`;
}

/**
 * A Notion-style full-bleed cover image banner displayed above the document
 * title. When editable it supports uploading, repositioning (drag to set the
 * vertical focal point), and removing the cover.
 */
function DocumentCover({ document, readOnly }: Props) {
  const { t } = useTranslation();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [repositioning, setRepositioning] = React.useState(false);
  const dragState = React.useRef<{ startY: number; startPos: number } | null>(
    null
  );

  const { url, posY } = parseCover(document.coverImage);
  const [draftPosY, setDraftPosY] = React.useState(posY);

  React.useEffect(() => {
    setDraftPosY(posY);
  }, [posY]);

  const handlePick = React.useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFile = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }
      setUploading(true);
      try {
        const attachment = await uploadFile(file, {
          name: file.name,
          documentId: document.id,
          preset: AttachmentPreset.DocumentAttachment,
        });
        const value = serializeCover(attachment.url, 50);
        document.coverImage = value;
        await document.save({ coverImage: value });
      } catch (_err) {
        toast.error(t("Failed to upload cover image"));
      } finally {
        setUploading(false);
      }
    },
    [document, t]
  );

  const handleRemove = React.useCallback(async () => {
    document.coverImage = null;
    setRepositioning(false);
    await document.save({ coverImage: null });
  }, [document]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!repositioning) {
      return;
    }
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragState.current = { startY: event.clientY, startPos: draftPosY };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragState.current) {
      return;
    }
    const deltaPx = event.clientY - dragState.current.startY;
    // Translate vertical drag into a 0-100 focal point; dragging down reveals
    // the top of the image.
    const next = Math.max(
      0,
      Math.min(100, dragState.current.startPos - (deltaPx / 320) * 100)
    );
    setDraftPosY(next);
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleSavePosition = React.useCallback(async () => {
    setRepositioning(false);
    const value = serializeCover(url, draftPosY);
    document.coverImage = value;
    await document.save({ coverImage: value });
  }, [document, url, draftPosY]);

  const input = (
    <HiddenInput
      ref={fileRef}
      type="file"
      accept="image/*"
      onChange={handleFile}
    />
  );

  if (url) {
    return (
      <Banner $repositioning={repositioning}>
        <CoverImage
          src={url}
          alt=""
          draggable={false}
          style={{ objectPosition: `center ${draftPosY}%` }}
          $repositioning={repositioning}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {!readOnly &&
          (repositioning ? (
            <Controls gap={6}>
              <Hint>{t("Drag image to reposition")}</Hint>
              <PillButton type="button" onClick={handleSavePosition}>
                <DoneIcon size={16} />
                {t("Save position")}
              </PillButton>
            </Controls>
          ) : (
            <Controls gap={2}>
              <PillButton type="button" onClick={handlePick}>
                <ImageIcon size={16} />
                {t("Change cover")}
              </PillButton>
              <PillButton
                type="button"
                onClick={() => setRepositioning(true)}
              >
                <MoveIcon size={16} />
                {t("Reposition")}
              </PillButton>
              <PillButton type="button" onClick={handleRemove}>
                <TrashIcon size={16} />
              </PillButton>
            </Controls>
          ))}
        {input}
      </Banner>
    );
  }

  if (readOnly) {
    return null;
  }

  return (
    <AddBar>
      <AddButton type="button" onClick={handlePick} disabled={uploading}>
        <ImageIcon size={18} />
        {uploading ? t("Uploading…") : t("Add cover")}
      </AddButton>
      {input}
    </AddBar>
  );
}

const Banner = styled.div<{ $repositioning?: boolean }>`
  position: relative;
  width: 100%;
  height: 30vh;
  max-height: 280px;
  min-height: 160px;
  margin-bottom: 12px;
  overflow: hidden;
  background: ${s("backgroundSecondary")};

  &:hover > div {
    opacity: 1;
  }
`;

const CoverImage = styled.img<{ $repositioning?: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: ${(props) => (props.$repositioning ? "ns-resize" : "default")};
  touch-action: none;
`;

const Controls = styled(Flex)`
  position: absolute;
  bottom: 14px;
  right: 16px;
  align-items: center;
  padding: 3px;
  border-radius: 8px;
  background: ${(props) =>
    props.theme.isDark ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.9)"};
  backdrop-filter: blur(6px);
  box-shadow: ${s("menuShadow")};
  opacity: 0;
  transition: opacity 150ms ease;
`;

const Hint = styled.span`
  font-size: 13px;
  color: ${s("textSecondary")};
  padding: 0 8px;
`;

const PillButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${s("textSecondary")};
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

const AddBar = styled.div`
  display: flex;
  align-items: center;
  height: 28px;
  margin: 0 auto 4px;
  padding: 0 32px;
  max-width: calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter});
  opacity: 0.6;
  transition: opacity 150ms ease;

  ${breakpoint("tablet")`
    padding: 0 44px;
  `}

  &:hover,
  &:focus-within {
    opacity: 1;
  }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${s("textTertiary")};
  font-size: 14px;
  font-weight: 500;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

export default observer(DocumentCover);
