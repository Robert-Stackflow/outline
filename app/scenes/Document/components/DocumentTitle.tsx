import { observer } from "mobx-react";
import { Slice } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { __parseFromClipboard } from "prosemirror-view";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Icon from "@shared/components/Icon";
import isMarkdown from "@shared/editor/lib/isMarkdown";
import normalizePastedMarkdown from "@shared/editor/lib/markdown/normalize";
import { s } from "@shared/styles";
import { light } from "@shared/styles/theme";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "@shared/utils/date";
import { isModKey } from "@shared/utils/keyboard";
import { DocumentValidation } from "@shared/validations";
import type { RefHandle } from "~/components/ContentEditable";
import ContentEditable from "~/components/ContentEditable";
import { useDocumentContext } from "~/components/DocumentContext";
import { PopoverButton } from "~/components/IconPicker/components/PopoverButton";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import { useTranslation } from "react-i18next";
import lazyWithRetry from "~/utils/lazyWithRetry";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

type Props = {
  /** ID of the associated document */
  documentId: string;
  /** Title to display */
  title: string;
  /** Icon to display */
  icon?: string | null;
  /** Icon color */
  color: string;
  /** Placeholder to display when the document has no title */
  placeholder?: string;
  /** Should the title be editable, policies will also be considered separately */
  readOnly?: boolean;
  /** Callback called on any edits to text */
  onChangeTitle?: (text: string) => void;
  /** Callback called when the user selects an icon */
  onChangeIcon?: (icon: string | null, color: string | null) => void;
  /** Callback called when the user expects to move to the "next" input */
  onGoToNextInput?: (insertParagraph?: boolean) => void;
  /** Callback called when the user expects to save (CMD+S) */
  onSave?: (options: { publish?: boolean; done?: boolean }) => void;
  /** Callback called when focus leaves the input */
  onBlur?: React.FocusEventHandler<HTMLSpanElement>;
};

const lineHeight = "1.25";
const fontSize = "2.25em";

const DocumentTitle = React.forwardRef(function DocumentTitle_(
  {
    documentId,
    title,
    icon,
    color,
    readOnly,
    onChangeTitle,
    onChangeIcon,
    onSave,
    onGoToNextInput,
    onBlur,
    placeholder,
  }: Props,
  externalRef: React.RefObject<RefHandle>
) {
  const { t } = useTranslation();
  const ref = React.useRef<RefHandle>(null);
  const [iconPickerIsOpen, handleOpen, setIconPickerClosed] = useBoolean();
  const { editor } = useDocumentContext();
  const can = usePolicy(documentId);

  const handleClick = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  const restoreFocus = React.useCallback(() => {
    ref.current?.focusAtEnd();
  }, [ref]);

  const handleBlur = React.useCallback(
    (ev: React.FocusEvent<HTMLSpanElement>) => {
      // Do nothing and simply return if the related target is the parent
      // or a sibling of the current target element(the <span>
      // containing document title)
      if (
        ev.currentTarget.parentElement === ev.relatedTarget ||
        (ev.relatedTarget &&
          ev.currentTarget.parentElement === ev.relatedTarget.parentElement)
      ) {
        return;
      }
      if (onBlur) {
        onBlur(ev);
      }
    },
    [onBlur]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();

        if (isModKey(event)) {
          onSave?.({
            done: true,
          });
          return;
        }

        onGoToNextInput?.(true);
        return;
      }

      if (event.key === "Tab" || event.key === "ArrowDown") {
        event.preventDefault();
        onGoToNextInput?.();
        return;
      }

      if (event.key === "s" && isModKey(event)) {
        event.preventDefault();
        onSave?.({});
        return;
      }
    },
    [onGoToNextInput, onSave]
  );

  const handleChange = React.useCallback(
    (input: string) => {
      let value = input;

      if (/\/date\s$/.test(input)) {
        value = getCurrentDateAsString();
        ref?.current?.focusAtEnd();
      } else if (/\/time$/.test(input)) {
        value = getCurrentTimeAsString();
        ref?.current?.focusAtEnd();
      } else if (/\/datetime$/.test(input)) {
        value = getCurrentDateTimeAsString();
        ref?.current?.focusAtEnd();
      }

      onChangeTitle?.(value);
    },
    [ref, onChangeTitle]
  );

  // Custom paste handling so that if a multiple lines are pasted we
  // only take the first line and insert the rest directly into the editor.
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();

      const text = event.clipboardData.getData("text/plain");
      const html = event.clipboardData.getData("text/html");
      const [firstLine, ...rest] = text.split(`\n`);
      const content = rest.join(`\n`).trim();

      window.document.execCommand(
        "insertText",
        false,
        firstLine.replace(/^#+\s?/, "")
      );

      if (editor && content) {
        const { view, pasteParser } = editor;
        let slice;

        if (isMarkdown(text)) {
          const paste = pasteParser.parse(normalizePastedMarkdown(content));
          if (paste) {
            slice = paste.slice(0);
          }
        } else {
          const defaultSlice = __parseFromClipboard(
            view,
            text,
            html,
            false,
            view.state.selection.$from
          );

          // remove first node from slice
          slice = defaultSlice.content.firstChild
            ? new Slice(
                defaultSlice.content.cut(
                  defaultSlice.content.firstChild.nodeSize
                ),
                defaultSlice.openStart,
                defaultSlice.openEnd
              )
            : defaultSlice;
        }

        if (slice) {
          view.dispatch(
            view.state.tr
              .setSelection(Selection.atStart(view.state.doc))
              .replaceSelection(slice)
          );
        }
      }
    },
    [editor]
  );

  const handleClose = React.useCallback(() => {
    setIconPickerClosed();
    restoreFocus();
  }, [setIconPickerClosed, restoreFocus]);

  const handleIconChange = React.useCallback(
    (chosenIcon: string | null, iconColor: string | null) => {
      if (icon !== chosenIcon || color !== iconColor) {
        onChangeIcon?.(chosenIcon, iconColor);
      }
    },
    [icon, color, onChangeIcon]
  );

  const dir = ref.current?.getComputedDirection();
  const initial = title.charAt(0).toUpperCase();
  const fallbackIcon = icon ? (
    <Icon value={icon} initial={initial} color={color} size={40} />
  ) : null;

  return (
    <TitleBlock>
      {can.update && !readOnly && icon ? (
        <TitleIconRow dir={dir} $isOpen={iconPickerIsOpen}>
          <React.Suspense fallback={fallbackIcon}>
            <StyledIconPicker
              icon={icon ?? null}
              color={color}
              initial={initial}
              size={40}
              ariaLabel={t("Icon Picker")}
              popoverPosition="bottom-start"
              onChange={handleIconChange}
              onOpen={handleOpen}
              onClose={handleClose}
              allowDelete
              borderOnHover
            />
          </React.Suspense>
        </TitleIconRow>
      ) : icon ? (
        <TitleIconRow dir={dir} aria-hidden>
          {fallbackIcon}
        </TitleIconRow>
      ) : null}
      <Title
        className="document-title"
        onClick={handleClick}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder}
        value={title}
        autoFocus={!title}
        maxLength={DocumentValidation.maxTitleLength}
        readOnly={readOnly}
        aria-label={t("Document title")}
        dir="auto"
        ref={mergeRefs([ref, externalRef])}
      />
    </TitleBlock>
  );
});

const StyledIconPicker = styled(IconPicker)``;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const TitleIconRow = styled.div<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 40px;
  margin-bottom: 10px;

  ${PopoverButton} {
    opacity: ${(props) => (props.$isOpen ? 1 : 0.8)};
  }

  ${breakpoint("tablet")`
    &:hover {
      ${PopoverButton} {
        opacity: 0.65;

        &:hover,
        &[aria-expanded="true"] {
          opacity: 1;
        }
      }
    }
  `};
`;

const Title = styled(ContentEditable)<{ readOnly?: boolean }>`
  line-height: ${lineHeight};
  margin: 0;
  font-size: ${fontSize};
  font-weight: 600;
  border: 0;
  padding: 0;
  cursor: ${(props) => (props.readOnly ? "default" : "text")};

  > span {
    outline: none;
  }

  &::placeholder {
    color: ${s("placeholder")};
    -webkit-text-fill-color: ${s("placeholder")};
    opacity: 1;
  }

  ${breakpoint("tablet")`
    margin-left: 0;
  `};

  @media print {
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

export default observer(DocumentTitle);
