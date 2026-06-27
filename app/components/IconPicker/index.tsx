import * as Tabs from "@radix-ui/react-tabs";
import { PlusIcon, SmileyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover } from "@shared/styles";
import theme from "@shared/styles/theme";
import { AttachmentPreset, IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import { EmojiValidation } from "@shared/validations";
import Input, { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import { Drawer, DrawerContent, DrawerTrigger } from "../primitives/Drawer";
import EmojiPanel from "./components/EmojiPanel";
import IconPanel from "./components/IconPanel";
import { PopoverButton } from "./components/PopoverButton";
import useStores from "~/hooks/useStores";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import {
  EmojiImageDropZone,
  useEmojiFileUpload,
} from "~/components/EmojiDialog/Components";
import { compressImage } from "~/utils/compressImage";
import { generateEmojiNameFromFilename } from "~/utils/emoji";
import { uploadFile } from "~/utils/files";

const TAB_NAMES = {
  Icon: "icon",
  Emoji: "emoji",
  Upload: "upload",
} as const;

type TabName = (typeof TAB_NAMES)[keyof typeof TAB_NAMES];

const POPOVER_WIDTH = 520;

type Props = {
  icon: string | null;
  color: string;
  size?: number;
  initial: string;
  ariaLabel?: string;
  className?: string;
  popoverPosition: "bottom-start" | "right";
  allowDelete?: boolean;
  borderOnHover?: boolean;
  onChange: (icon: string | null, color: string | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
};

const IconPicker = ({
  icon,
  color,
  size = 24,
  initial,
  ariaLabel,
  className,
  popoverPosition,
  allowDelete,
  onChange,
  onOpen,
  onClose,
  borderOnHover,
  children,
}: Props) => {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const { width: windowWidth } = useWindowSize();
  const isMobile = useMobile();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [chosenColor, setChosenColor] = React.useState(color);

  const iconType = determineIconType(icon);
  const defaultTab = React.useMemo(
    () => (iconType === IconType.SVG ? TAB_NAMES["Icon"] : TAB_NAMES["Emoji"]),
    [iconType]
  );

  const [activeTab, setActiveTab] = React.useState<TabName>(defaultTab);

  // The Drawer's inner content has 6px padding on each side; subtract it
  // so the panel doesn't overflow horizontally and itemsPerRow is correct.
  const popoverWidth = isMobile ? windowWidth - 12 : POPOVER_WIDTH;

  const handleTabChange = React.useCallback((value: string) => {
    setActiveTab(value as TabName);
  }, []);

  const resetDefaultTab = React.useCallback(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        onOpen?.();
      } else {
        onClose?.();
        setQuery("");
        resetDefaultTab();
      }
    },
    [onOpen, onClose, resetDefaultTab]
  );

  const handleIconChange = React.useCallback(
    (ic: string) => {
      const icType = determineIconType(ic);
      const finalColor = icType === IconType.SVG ? chosenColor : null;
      onChange(ic, finalColor);
    },
    [onChange, chosenColor]
  );

  const handleIconColorChange = React.useCallback(
    (c: string) => {
      setChosenColor(c);

      const icType = determineIconType(icon);
      if (icType === IconType.SVG) {
        onChange(icon, c);
      }
    },
    [icon, onChange]
  );

  const handleIconRemove = React.useCallback(() => {
    setOpen(false);
    onChange(null, null);
  }, [setOpen, onChange]);

  const pickerTrigger = (
    <PopoverButton
      aria-label={ariaLabel ?? t("Show menu")}
      className={className}
      size={size}
      $borderOnHover={borderOnHover}
    >
      {children ? (
        children
      ) : iconType && icon ? (
        <Icon value={icon} color={color} size={size} initial={initial} />
      ) : (
        <StyledSmileyIcon color={theme.placeholder} size={size} />
      )}
    </PopoverButton>
  );

  const pickerContent = (
    <Content
      open={open}
      activeTab={activeTab}
      iconColor={chosenColor}
      iconInitial={initial ?? ""}
      previewIcon={icon}
      query={query}
      panelWidth={popoverWidth}
      allowDelete={!!(allowDelete && icon)}
      onTabChange={handleTabChange}
      onQueryChange={setQuery}
      onIconChange={handleIconChange}
      onIconColorChange={handleIconColorChange}
      onIconRemove={handleIconRemove}
    />
  );

  // Update selected tab when default tab changes
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  React.useEffect(() => {
    if (open) {
      void emojis.fetchAll();
    }
  }, [open, emojis]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{pickerTrigger}</DrawerTrigger>
        <DrawerContent aria-label={t("Icon Picker")}>
          {pickerContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger>{pickerTrigger}</PopoverTrigger>
      <StyledPopoverContent
        aria-label={t("Icon Picker")}
        width={popoverWidth}
        side={popoverPosition === "right" ? "right" : "bottom"}
        align={popoverPosition === "bottom-start" ? "start" : "center"}
        scrollable={false}
        shrink
      >
        {pickerContent}
      </StyledPopoverContent>
    </Popover>
  );
};

type ContentProps = {
  open: boolean;
  activeTab: TabName;
  query: string;
  iconColor: string;
  iconInitial: string;
  previewIcon: string | null;
  panelWidth: number;
  allowDelete: boolean;
  onTabChange: (tab: string) => void;
  onQueryChange: (query: string) => void;
  onIconChange: (icon: string) => void;
  onIconColorChange: (color: string) => void;
  onIconRemove: () => void;
};

const Content = ({
  open,
  activeTab,
  iconColor,
  iconInitial,
  previewIcon,
  query,
  panelWidth,
  allowDelete,
  onTabChange,
  onQueryChange,
  onIconChange,
  onIconColorChange,
  onIconRemove,
}: ContentProps) => {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);

  return (
    <Tabs.Root value={activeTab} onValueChange={onTabChange}>
      {previewIcon && (
        <Preview>
          <Icon
            value={previewIcon}
            color={iconColor}
            initial={iconInitial}
            size={72}
          />
        </Preview>
      )}
      <TabActionsWrapper justify="space-between" align="center">
        <TabsList>
          <StyledTab
            value={TAB_NAMES["Emoji"]}
            aria-label={t("Emoji")}
            $active={activeTab === TAB_NAMES["Emoji"]}
          >
            {t("Emoji")}
          </StyledTab>
          <StyledTab
            value={TAB_NAMES["Icon"]}
            aria-label={t("Icons")}
            $active={activeTab === TAB_NAMES["Icon"]}
          >
            {t("Icons")}
          </StyledTab>
          {can.update && (
            <StyledTab
              value={TAB_NAMES["Upload"]}
              aria-label={t("Upload")}
              $active={activeTab === TAB_NAMES["Upload"]}
            >
              {t("Upload")}
            </StyledTab>
          )}
        </TabsList>
        {allowDelete && (
          <RemoveButton onClick={onIconRemove}>{t("Remove")}</RemoveButton>
        )}
      </TabActionsWrapper>
      <StyledTabContent value={TAB_NAMES["Emoji"]}>
        <EmojiPanel
          panelWidth={panelWidth}
          query={query}
          panelActive={open && activeTab === TAB_NAMES["Emoji"]}
          onEmojiChange={onIconChange}
          onQueryChange={onQueryChange}
          showRandomButton
          showUploadButton={false}
        />
      </StyledTabContent>
      <StyledTabContent value={TAB_NAMES["Icon"]}>
        <IconPanel
          panelWidth={panelWidth}
          initial={iconInitial}
          color={iconColor}
          query={query}
          panelActive={open && activeTab === TAB_NAMES["Icon"]}
          onIconChange={onIconChange}
          onColorChange={onIconColorChange}
          onQueryChange={onQueryChange}
        />
      </StyledTabContent>
      <StyledTabContent value={TAB_NAMES["Upload"]}>
        <EmojiUploadPanel onIconChange={onIconChange} />
      </StyledTabContent>
    </Tabs.Root>
  );
};

const EmojiUploadPanel = ({
  onIconChange,
}: {
  onIconChange: (icon: string) => void;
}) => {
  const { t } = useTranslation();
  const { emojis } = useStores();
  const [name, setName] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileSelected = React.useCallback((selected: File) => {
    setName((currentName) => {
      if (!currentName.trim()) {
        const generatedName = generateEmojiNameFromFilename(selected.name);
        return generatedName || currentName;
      }
      return currentName;
    });
  }, []);

  const { file, getRootProps, getInputProps, isDragActive } =
    useEmojiFileUpload({ onFileSelected: handleFileSelected });

  const handleNameChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setName(event.target.value);
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!name.trim()) {
        toast.error(t("Please enter a name for the emoji"));
        return;
      }

      if (!file) {
        toast.error(t("Please select an image file"));
        return;
      }

      setIsUploading(true);
      try {
        const fileToUpload =
          file.type === "image/gif"
            ? file
            : await compressImage(file, {
                maxHeight: 64,
                maxWidth: 64,
              });

        const attachment = await uploadFile(fileToUpload, {
          name: file.name,
          preset: AttachmentPreset.Emoji,
        });

        const emoji = await emojis.create({
          name: name.trim(),
          attachmentId: attachment.id,
        });

        toast.success(t("Emoji created successfully"));
        onIconChange(emoji.id);
      } finally {
        setIsUploading(false);
      }
    },
    [emojis, file, name, onIconChange, t]
  );

  const isValidName = EmojiValidation.allowedNameCharacters.test(name);
  const isValid = name.trim().length > 0 && !!file && isValidName;

  return (
    <UploadForm onSubmit={handleSubmit}>
      <Text as="p" type="secondary" size="small">
        {t(
          "Square images with transparent backgrounds work best. If your image is too large, we'll try to resize it for you."
        )}
      </Text>

      <LabelText as="label">{t("Upload an image")}</LabelText>
      <EmojiImageDropZone
        file={file}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
      />

      <Input
        label={t("Choose a name")}
        value={name}
        onChange={handleNameChange}
        placeholder="my_custom_emoji"
        required
        error={
          !isValidName
            ? t(
                "name can only contain lowercase letters, numbers, and underscores."
              )
            : undefined
        }
      />

      {name.trim() && isValidName && (
        <Text type="secondary" size="small">
          {t("This emoji will be available as")} <code>:{name}:</code>
        </Text>
      )}

      <UploadActions>
        <UploadButton type="submit" disabled={!isValid || isUploading}>
          <PlusIcon size={18} />
          {isUploading ? `${t("Uploading")}…` : t("Add emoji")}
        </UploadButton>
      </UploadActions>
    </UploadForm>
  );
};

const StyledPopoverContent = styled(PopoverContent)`
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
`;

const StyledSmileyIcon = styled(SmileyIcon)`
  flex-shrink: 0;

  @media print {
    display: none;
  }
`;

const RemoveButton = styled(NudeButton)`
  width: auto;
  height: 36px;
  font-weight: 500;
  font-size: 15px;
  color: ${s("textTertiary")};
  padding: 0 16px;
  border-radius: 6px;
  transition: color 100ms ease-in-out;
  &: ${hover} {
    background: ${s("listItemHoverBackground")};
    color: ${s("textSecondary")};
  }
`;

const TabActionsWrapper = styled(Flex)`
  min-height: 48px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid ${s("inputBorder")};
`;

const TabsList = styled(Tabs.List)`
  display: flex;
  align-items: center;
  height: 48px;
`;

const StyledTab = styled(Tabs.Trigger)<{ $active: boolean }>`
  position: relative;
  font-weight: 500;
  font-size: 15px;
  cursor: var(--pointer);
  background: none;
  border: 0;
  height: 48px;
  padding: 0 14px;
  user-select: none;
  color: ${({ $active }) => ($active ? s("textSecondary") : s("textTertiary"))};
  transition: color 100ms ease-in-out;

  &: ${hover} {
    color: ${s("textSecondary")};
  }

  ${({ $active }) =>
    $active &&
    css`
      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 14px;
        right: 14px;
        height: 2px;
        border-radius: 2px;
        background: ${s("textSecondary")};
      }
    `}
`;

const StyledTabContent = styled(Tabs.Content)`
  height: 410px;
  overflow-y: auto;
`;

const Preview = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 76px;
  padding-top: 8px;
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 10px;

  p {
    margin: 0;
  }
`;

const UploadActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const UploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid ${s("buttonNeutralBorder")};
  border-radius: 8px;
  background: ${s("buttonNeutralBackground")};
  color: ${s("text")};
  font-size: 14px;
  font-weight: 500;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

export default React.memo(IconPicker);
