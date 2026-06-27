import { noop } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { SubscriptionType, DocumentFontFamily } from "@shared/types";
import type Document from "~/models/Document";
import type Template from "~/models/Template";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import Switch from "~/components/Switch";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentDisplay } from "~/hooks/useDocumentDisplay";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { MenuSeparator } from "~/components/primitives/components/Menu";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";

type Props = {
  /** Document for which the menu is to be shown */
  document: Document;
  /** Alignment w.r.t trigger - defaults to start */
  align?: "start" | "end";
  /** Trigger's variant - renders nude variant if unset */
  neutral?: boolean;
  /** Pass true if the document is currently being displayed */
  showDisplayOptions?: boolean;
  /** Whether to include the option of toggling embeds as menu item */
  showToggleEmbeds?: boolean;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Template) => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Invoked when menu is opened */
  onOpen?: () => void;
  /** Invoked when menu is closed */
  onClose?: () => void;
};

function DocumentMenu({
  document,
  align,
  neutral,
  showToggleEmbeds,
  showDisplayOptions,
  onSelectTemplate,
  onRename,
  onOpen,
  onClose,
  onFindAndReplace,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const can = usePolicy(document);
  const { state: display, set: setDisplay } = useDocumentDisplay(document.id);

  const { userMemberships, groupMemberships, subscriptions, pins } =
    useStores();

  const isShared = !!(
    userMemberships.getByDocumentId(document.id) ||
    groupMemberships.getByDocumentId(document.id)
  );

  const {
    loading: auxDataLoading,
    loaded: auxDataLoaded,
    request: auxDataRequest,
  } = useRequest(() =>
    Promise.all([
      subscriptions.fetchOne({
        documentId: document.id,
        event: SubscriptionType.Document,
      }),
      document.collectionId
        ? subscriptions.fetchOne({
            collectionId: document.collectionId,
            event: SubscriptionType.Document,
          })
        : noop,
      pins.fetchOne({
        documentId: document.id,
        collectionId: document.collectionId ?? null,
      }),
    ])
  );

  const handlePointerEnter = React.useCallback(() => {
    if (!auxDataLoading && !auxDataLoaded) {
      void auxDataRequest();
      void document.loadRelations();
    }
  }, [auxDataLoading, auxDataLoaded, auxDataRequest, document]);

  const handleEmbedsToggle = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        document.enableEmbeds();
      } else {
        document.disableEmbeds();
      }
    },
    [document]
  );

  const handleFullWidthToggle = React.useCallback(
    (checked: boolean) => {
      setDisplay("fullWidth", checked);
      // Mirror to the server so layout persists across sessions/devices.
      document.fullWidth = checked;
      void document.save({ fullWidth: checked });
    },
    [setDisplay, document]
  );

  const handleSmallerTextToggle = React.useCallback(
    (checked: boolean) => {
      setDisplay("smallerText", checked);
    },
    [setDisplay]
  );

  const handleFontFamilyChange = React.useCallback(
    (family: DocumentFontFamily) => {
      setDisplay("fontFamily", family);
    },
    [setDisplay]
  );

  const handleLockToggle = React.useCallback(
    (checked: boolean) => {
      setDisplay("locked", checked);
    },
    [setDisplay]
  );

  const handleInsightsToggle = React.useCallback(
    (checked: boolean) => {
      void document.save({ insightsEnabled: checked });
    },
    [document]
  );

  const rootAction = useDocumentMenuAction({
    documentId: document.id,
    onFindAndReplace,
    onRename,
    onSelectTemplate,
  });

  const renderAppearanceGroup = React.useCallback(() => {
    if (!can.update || !showDisplayOptions || isMobile) {
      return null;
    }

    return (
      <>
        <DisplayOptions>
          <Style>
            <FontPicker>
              {(
                [
                  DocumentFontFamily.Default,
                  DocumentFontFamily.Serif,
                  DocumentFontFamily.Mono,
                ] as const
              ).map((family) => {
                const active = display.fontFamily === family;
                const labels: Record<DocumentFontFamily, string> = {
                  [DocumentFontFamily.Default]: t("Default"),
                  [DocumentFontFamily.Serif]: t("Serif"),
                  [DocumentFontFamily.Mono]: t("Mono"),
                };
                return (
                  <FontSwatch
                    key={family}
                    $active={active}
                    $family={family}
                    onClick={() => handleFontFamilyChange(family)}
                    type="button"
                    aria-pressed={active}
                  >
                    <span>Ag</span>
                    <FontLabel>{labels[family]}</FontLabel>
                  </FontSwatch>
                );
              })}
            </FontPicker>
          </Style>
          <Style>
            <ToggleMenuItem
              width={26}
              height={14}
              label={t("Small text")}
              labelPosition="left"
              checked={display.smallerText}
              onChange={handleSmallerTextToggle}
            />
          </Style>
          <Style>
            <ToggleMenuItem
              width={26}
              height={14}
              label={t("Full width")}
              labelPosition="left"
              checked={display.fullWidth}
              onChange={handleFullWidthToggle}
            />
          </Style>
          <Style>
            <ToggleMenuItem
              width={26}
              height={14}
              label={t("Lock page")}
              labelPosition="left"
              checked={display.locked}
              onChange={handleLockToggle}
            />
          </Style>
        </DisplayOptions>
        <MenuSeparator />
      </>
    );
  }, [
    t,
    can.update,
    isMobile,
    showDisplayOptions,
    display.fontFamily,
    display.smallerText,
    display.fullWidth,
    display.locked,
    handleFontFamilyChange,
    handleSmallerTextToggle,
    handleFullWidthToggle,
    handleLockToggle,
  ]);

  const toggleSwitches = React.useMemo<React.ReactNode>(() => {
    if (!can.update || !showToggleEmbeds) {
      return;
    }

    return (
      <>
        <MenuSeparator />
        <DisplayOptions>
          {can.updateInsights && (
            <Style>
              <ToggleMenuItem
                width={26}
                height={14}
                label={t("Enable viewer insights")}
                labelPosition="left"
                checked={document.insightsEnabled}
                onChange={handleInsightsToggle}
              />
            </Style>
          )}
          {showToggleEmbeds && (
            <Style>
              <ToggleMenuItem
                width={26}
                height={14}
                label={t("Enable embeds")}
                labelPosition="left"
                checked={!document.embedsDisabled}
                onChange={handleEmbedsToggle}
              />
            </Style>
          )}
        </DisplayOptions>
      </>
    );
  }, [
    t,
    can.update,
    can.updateInsights,
    document.embedsDisabled,
    document.insightsEnabled,
    showToggleEmbeds,
    handleEmbedsToggle,
    handleInsightsToggle,
  ]);

  return (
    <ActionContextProvider
      value={{
        activeModels: [
          document,
          ...(!isShared && document.collection ? [document.collection] : []),
        ],
      }}
    >
      <DropdownMenu
        action={rootAction}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Document options")}
        contentWidth={280}
        prepend={renderAppearanceGroup}
        append={toggleSwitches}
      >
        <OverflowMenuButton
          neutral={neutral}
          onPointerEnter={handlePointerEnter}
        />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

const ToggleMenuItem = styled(Switch)`
  * {
    font-weight: normal;
    color: ${s("textSecondary")};
  }
`;

const DisplayOptions = styled.div`
  padding: 8px 0 0;
`;

const Style = styled.div`
  padding: 12px;

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `};
`;

const FontPicker = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
`;

const FontSwatch = styled.button<{
  $active: boolean;
  $family: DocumentFontFamily;
}>`
  appearance: none;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: ${(props) => (props.$active ? props.theme.accent : props.theme.text)};
  cursor: var(--pointer);
  transition:
    background 120ms ease,
    color 120ms ease;

  > span:first-child {
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    font-family: ${(props) =>
      props.$family === DocumentFontFamily.Serif
        ? "Georgia, 'Times New Roman', serif"
        : props.$family === DocumentFontFamily.Mono
          ? props.theme.fontFamilyMono
          : props.theme.fontFamily};
  }

  &:hover {
    background: ${(props) => props.theme.listItemHoverBackground};
  }

  ${(props) =>
    props.$active &&
    `
    background: ${props.theme.listItemHoverBackground};
  `}
`;

const FontLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: inherit;
`;

export default observer(DocumentMenu);
