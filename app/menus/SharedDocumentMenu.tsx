import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useSharedDocumentMenuAction } from "~/hooks/useSharedDocumentMenuAction";
import type Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";

type Props = {
  /** Document for which the menu is shown. */
  document: Document;
  /** Alignment with respect to the trigger. */
  align?: "start" | "end";
  /** Whether to render a neutral trigger. */
  neutral?: boolean;
  /** Invoked when the "Search in document" menu item is clicked. */
  onFindAndReplace?: () => void;
};

function SharedDocumentMenu({
  document,
  align,
  neutral,
  onFindAndReplace,
}: Props) {
  const { t } = useTranslation();
  const rootAction = useSharedDocumentMenuAction({
    documentId: document.id,
    onFindAndReplace,
  });

  return (
    <ActionContextProvider value={{ activeModels: [document] }}>
      <DropdownMenu
        action={rootAction}
        align={align}
        ariaLabel={t("Document options")}
        contentWidth={260}
      >
        <OverflowMenuButton neutral={neutral} />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(SharedDocumentMenu);
