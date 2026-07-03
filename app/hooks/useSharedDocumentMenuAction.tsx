import copy from "copy-to-clipboard";
import { useMemo } from "react";
import { CopyIcon, SearchIcon } from "outline-icons";
import { toast } from "sonner";
import { createAction, createActionWithChildren } from "~/actions";
import {
  copyDocumentAsMarkdown,
  copyDocumentAsPlainText,
  downloadDocument,
  presentDocument,
  printDocument,
} from "~/actions/definitions/documents";
import { ActiveDocumentSection } from "~/actions/sections";
import { useMenuAction } from "./useMenuAction";

type Props = {
  /** Document ID for which the actions are generated. */
  documentId: string;
  /** Invoked when the "Search in document" menu item is clicked. */
  onFindAndReplace?: () => void;
};

/**
 * Builds the public-share safe document menu actions.
 *
 * @param props menu action options.
 * @returns a root menu action.
 */
export function useSharedDocumentMenuAction({
  documentId,
  onFindAndReplace,
}: Props) {
  const actions = useMemo(
    () => [
      presentDocument,
      downloadDocument,
      createActionWithChildren({
        name: ({ t: translate }) => translate("Copy"),
        analyticsName: "Copy document",
        section: ActiveDocumentSection,
        icon: <CopyIcon />,
        keywords: "clipboard",
        children: [
          createAction({
            name: ({ t: translate }) => translate("Copy public link"),
            section: ActiveDocumentSection,
            keywords: "clipboard share",
            icon: <CopyIcon />,
            iconInContextMenu: false,
            visible: !!documentId,
            perform: ({ t: translate }) => {
              copy(window.location.href);
              toast.success(translate("Link copied to clipboard"));
            },
          }),
          copyDocumentAsMarkdown,
          copyDocumentAsPlainText,
        ],
      }),
      printDocument,
      createAction({
        name: ({ t: translate }) => translate("Search in document"),
        analyticsName: "Search document",
        section: ActiveDocumentSection,
        shortcut: [`Meta+/`],
        icon: <SearchIcon />,
        visible: !!onFindAndReplace,
        perform: () => onFindAndReplace?.(),
      }),
    ],
    [documentId, onFindAndReplace]
  );

  return useMenuAction(actions);
}
