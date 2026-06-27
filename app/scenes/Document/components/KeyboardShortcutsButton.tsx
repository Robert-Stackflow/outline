import { observer } from "mobx-react";
import { KeyboardIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useEditingFocus from "~/hooks/useEditingFocus";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const { ui } = useStores();
  const isEditingFocus = useEditingFocus();
  const query = useQuery();
  const shortcutsQuery = query.get("shortcuts");

  const handleOpenKeyboardShortcuts = () => {
    ui.set({ rightSidebar: "shortcuts" });
  };

  useEffect(() => {
    if (shortcutsQuery !== null) {
      handleOpenKeyboardShortcuts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutsQuery]);

  return (
    <Tooltip content={t("Keyboard shortcuts")} shortcut="?">
      <Button
        onClick={() => handleOpenKeyboardShortcuts()}
        $hidden={isEditingFocus}
        aria-label={t("Keyboard shortcuts")}
      >
        <KeyboardIcon />
      </Button>
    </Tooltip>
  );
}

const Button = styled(NudeButton)<{ $hidden: boolean }>`
  display: none;
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default observer(KeyboardShortcutsButton);
