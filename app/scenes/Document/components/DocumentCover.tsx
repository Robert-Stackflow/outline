import { observer } from "mobx-react";
import { ImageIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { uploadFile } from "~/utils/files";
import { toast } from "sonner";

type Props = {
  /** The document to display and edit the cover image for. */
  document: Document;
  /** Whether the document is read-only. */
  readOnly?: boolean;
};

/**
 * A Notion-style cover image banner displayed above the document title. When
 * editable it exposes affordances to add, change, or remove the cover.
 */
function DocumentCover({ document, readOnly }: Props) {
  const { t } = useTranslation();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

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
        document.coverImage = attachment.url;
        await document.save({ coverImage: attachment.url });
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
    await document.save({ coverImage: null });
  }, [document]);

  const input = (
    <HiddenInput
      ref={fileRef}
      type="file"
      accept="image/*"
      onChange={handleFile}
    />
  );

  if (document.coverImage) {
    return (
      <Banner>
        <CoverImage src={document.coverImage} alt="" />
        {!readOnly && (
          <Controls gap={6}>
            <Button neutral icon={<ImageIcon />} onClick={handlePick}>
              {t("Change cover")}
            </Button>
            <Button neutral icon={<TrashIcon />} onClick={handleRemove}>
              {t("Remove")}
            </Button>
          </Controls>
        )}
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

const Banner = styled.div`
  position: relative;
  width: 100%;
  height: 30vh;
  max-height: 280px;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  background: ${s("backgroundSecondary")};

  &:hover > div {
    opacity: 1;
  }
`;

const CoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Controls = styled(Flex)`
  position: absolute;
  bottom: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 150ms ease;
`;

const AddBar = styled.div`
  display: flex;
  align-items: center;
  height: 28px;
  margin-bottom: 4px;
  opacity: 0.6;
  transition: opacity 150ms ease;

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
