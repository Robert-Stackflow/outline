import { TrashIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import DeleteDocumentsInTrash from "~/scenes/Trash/components/DeleteDocumentsInTrash";
import useStores from "~/hooks/useStores";
import { useMenuAction } from "~/hooks/useMenuAction";
import { createAction } from "~/actions";
import { TrashSection } from "~/actions/sections";
import { trashPath } from "~/utils/routeHelpers";
import SidebarLink from "./SidebarLink";

/**
 * Trash entry rendered through SidebarLink so the row's hover background
 * extends across the row even when the cursor sits over the trailing "..."
 * action. The dropdown menu only exposes the destructive "Empty trash" shortcut.
 */
function TrashEntry() {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const emptyTrash = React.useMemo(
    () =>
      createAction({
        name: ({ t: tt }) => `${tt("Empty trash")}…`,
        analyticsName: "Empty trash",
        section: TrashSection,
        icon: <TrashIcon />,
        dangerous: true,
        perform: () => {
          dialogs.openModal({
            title: t("Empty trash"),
            content: (
              <DeleteDocumentsInTrash
                onSubmit={dialogs.closeAllModals}
                shouldRedirect={false}
              />
            ),
          });
        },
      }),
    [dialogs, t]
  );

  const rootAction = useMenuAction([emptyTrash]);

  return (
    <SidebarLink
      to={trashPath()}
      icon={<TrashIcon />}
      label={t("Trash")}
      menu={
        <DropdownMenu action={rootAction} ariaLabel={t("Trash options")}>
          <OverflowMenuButton aria-label={t("Trash options")} />
        </DropdownMenu>
      }
    />
  );
}

export default observer(TrashEntry);
