import { observer } from "mobx-react";
import { GlobeIcon, ShareIcon } from "outline-icons";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useShareDataLoader from "~/hooks/useShareDataLoader";
import useStores from "~/hooks/useStores";
import { preventDefault } from "~/utils/events";
import lazyWithRetry from "~/utils/lazyWithRetry";

const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Document")
);

type Props = {
  /** Document being shared */
  document: Document;
};

function ShareButton({ document }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shares } = useStores();
  const isMobile = useMobile();
  const share = shares.getByDocumentId(document.id);
  const sharedParent = shares.getByDocumentParents(document);
  const domain = share?.domain || sharedParent?.domain;
  const { preload, loading, reset } = useShareDataLoader({ document });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        preload();
      } else {
        reset();
      }
    },
    [preload, reset]
  );

  const closePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  if (isMobile) {
    return null;
  }

  const isShared = document.isPubliclyShared;
  const label = domain ? `${t("Share")} · ${domain}` : t("Share");

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip content={label} placement="bottom">
        <PopoverTrigger>
          <IconTrigger aria-label={label} onMouseEnter={preload}>
            {isShared ? <GlobeIcon /> : <ShareIcon />}
          </IconTrigger>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        aria-label={t("Share")}
        width={400}
        minHeight={175}
        side="bottom"
        align="end"
        onEscapeKeyDown={preventDefault}
      >
        <Suspense fallback={null}>
          <SharePopover
            document={document}
            onRequestClose={closePopover}
            visible={open}
            loading={loading}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

const IconTrigger = styled(NudeButton)`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: ${s("textSecondary")};
  transition: background 120ms ease, color 120ms ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover,
  &[data-state="open"] {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

export default observer(ShareButton);
