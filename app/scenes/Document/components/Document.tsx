import { CloseIcon, SparklesIcon } from "outline-icons";
import { observer } from "mobx-react";
import { AllSelection } from "prosemirror-state";
import { useRef, useCallback } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Prompt, useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType, TOCPosition, TeamPreference } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import { isModKey } from "@shared/utils/keyboard";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import DocumentMove from "~/components/DocumentExplorer/DocumentMove";
import DocumentPublish from "~/scenes/DocumentPublish";
import ErrorBoundary from "~/components/ErrorBoundary";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import type { Editor as TEditor } from "~/editor";
import type { Properties } from "~/types";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { useDocumentDisplay } from "~/hooks/useDocumentDisplay";
import Tooltip from "~/components/Tooltip";
import { fadeAndScaleIn } from "~/styles/animations";
import isTextInput from "~/utils/isTextInput";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import { documentHistoryPath, documentEditPath } from "~/utils/routeHelpers";
import { useDocumentSave } from "../hooks/useDocumentSave";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import DocumentCover from "./DocumentCover";
import Notices from "./Notices";
import References from "./References";
import RevisionViewer from "./RevisionViewer";
import SharedHeader from "./SharedHeader";

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

interface Props {
  /** Tree of navigation nodes for shared documents. */
  sharedTree?: NavigationNode;
  /** Map of ability names to booleans representing current user permissions. */
  abilities: Record<string, boolean>;
  /** The document model being viewed or edited. */
  document: Document;
  /** An optional revision to display instead of the live document. */
  revision?: Revision;
  /** Whether the document is in read-only mode. */
  readOnly: boolean;
  /** The share ID when viewing a publicly shared document. */
  shareId?: string;
  /** Override for the table of contents position, or false to hide it. */
  tocPosition?: TOCPosition | false;
  /** Callback to create a linked document from the editor. */
  onCreateLink?: (
    params: Properties<Document>,
    nested?: boolean
  ) => Promise<string>;
  /** Optional children rendered after the main document content. */
  children?: React.ReactNode;
}

/** Scene component responsible for rendering and interacting with a document. */
function DocumentScene({
  document,
  revision,
  readOnly,
  abilities,
  shareId,
  tocPosition,
  onCreateLink,
  children,
}: Props) {
  const { auth, ui, dialogs } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<LocationState>();
  const { state: displayPref } = useDocumentDisplay(document?.id);
  const sidebarContext = useLocationSidebarContext();
  const { team, user } = auth;

  const editorRef = useRef<TEditor>(null);

  const {
    isUploading,
    isSaving,
    isPublishing,
    isEditorDirty,
    isEmpty,
    onSave,
    replaceSelection,
    handleSelectTemplate,
    handleChangeTitle,
    handleChangeIcon,
    onFileUploadStart,
    onFileUploadStop,
  } = useDocumentSave({ document, editorRef, readOnly });

  const onSynced = useCallback(async () => {
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    // Highlight search term when navigating from search results
    const params = new URLSearchParams(location.search);
    const searchTerm = params.get("q");
    if (searchTerm) {
      editor.commands.find({ text: searchTerm });
    }

    if (!restore) {
      return;
    }

    history.replace(document.url, {
      ...location.state,
      restore: undefined,
      revisionId: undefined,
    });

    if (!revisionId) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      await replaceSelection(
        response.data,
        new AllSelection(editor.view.state.doc)
      );
      toast.success(t("Document restored"));
    }
  }, [location, replaceSelection, t, history, document.url]);

  const onUndoRedo = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event)) {
        const target =
          event.target instanceof Element ? event.target : undefined;

        // The editor handles undo/redo through its own keymap when focused
        if (
          editorRef.current?.view?.hasFocus() ||
          (target && (isTextInput(target) || !!target.closest(".ProseMirror")))
        ) {
          return;
        }

        event.preventDefault();

        if (event.shiftKey) {
          if (!readOnly) {
            editorRef.current?.commands.redo?.();
          }
        } else {
          if (!readOnly) {
            editorRef.current?.commands.undo?.();
          }
        }
      }
    },
    [readOnly]
  );

  const onMove = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      if (abilities.move) {
        dialogs.openModal({
          title: t("Move document"),
          content: <DocumentMove document={document} />,
        });
      }
    },
    [document, dialogs, t, abilities.move]
  );

  const goToEdit = useCallback(
    (ev: KeyboardEvent) => {
      if (readOnly) {
        ev.preventDefault();
        if (abilities.update) {
          history.push({
            pathname: documentEditPath(document),
            state: { sidebarContext },
          });
        }
      } else if (editorRef.current?.isBlurred) {
        ev.preventDefault();
        editorRef.current?.focus();
      }
    },
    [readOnly, abilities.update, history, document, sidebarContext]
  );

  const goToHistory = useCallback(
    (ev: KeyboardEvent) => {
      if (!readOnly) {
        return;
      }
      if (ev.ctrlKey) {
        return;
      }
      ev.preventDefault();

      if (location.pathname.endsWith("history")) {
        history.push({
          pathname: document.path,
          state: { sidebarContext },
        });
      } else {
        history.push({
          pathname: documentHistoryPath(document),
          state: { sidebarContext },
        });
      }
    },
    [readOnly, location.pathname, history, document, sidebarContext]
  );

  const onPublish = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (document.publishedAt) {
        return;
      }

      if (document?.collectionId) {
        void onSave({
          publish: true,
          done: true,
        });
      } else {
        dialogs.openModal({
          title: t("Publish document"),
          content: <DocumentPublish document={document} />,
        });
      }
    },
    [document, dialogs, t, onSave]
  );

  const handlePublishShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event) && event.shiftKey) {
        onPublish(event);
      }
    },
    [onPublish]
  );

  const goBack = useCallback(() => {
    if (!readOnly) {
      history.push({
        pathname: document.url,
        state: { sidebarContext },
      });
    }
  }, [readOnly, history, document, sidebarContext]);

  // Render
  const isShare = !!shareId;
  const embedsDisabled =
    (team && team.documentEmbeds === false) || document.embedsDisabled;

  const tocPos =
    tocPosition ??
    ((team?.getPreference(TeamPreference.TocPosition) as TOCPosition) ||
      TOCPosition.Left);
  // The table of contents is always shown (as a Notion-style minimap that
  // expands on hover); visibility is determined solely by the TOC position.
  const showContents = !!tocPos;

  const multiplayerEditor =
    !document.isArchived && !document.isDeleted && !revision && !isShare;

  const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;
  const pageTitle = hasEmojiInTitle
    ? document.titleWithDefault.replace(document.icon!, "")
    : document.titleWithDefault;
  const favicon = hasEmojiInTitle ? emojiToUrl(document.icon!) : undefined;

  // The table of contents floats over the gutter and no longer occupies layout
  // space, so full-width breakout elements need no horizontal compensation.
  const fullWidthTransformOffsetStyle = {
    ["--full-width-transform-offset"]: "0px",
  } as React.CSSProperties;

  return (
    <ErrorBoundary showTitle>
      <RegisterKeyDown trigger="m" handler={onMove} />
      <RegisterKeyDown trigger="z" handler={onUndoRedo} />
      <RegisterKeyDown trigger="e" handler={goToEdit} />
      <RegisterKeyDown trigger="Escape" handler={goBack} />
      <RegisterKeyDown trigger="h" handler={goToHistory} />
      <RegisterKeyDown
        trigger="p"
        options={{
          allowInInput: true,
        }}
        handler={handlePublishShortcut}
      />
      <MeasuredContainer
        as={Background}
        name="container"
        key={revision ? revision.id : document.id}
        column
        auto
        data-document-display=""
        data-font-family={displayPref.fontFamily}
        data-smaller-text={String(displayPref.smallerText)}
        data-document-locked={String(displayPref.locked)}
      >
        <PageTitle title={pageTitle} favicon={favicon} />
        {(isUploading || isSaving) && <LoadingIndicator />}
        {ui.isReadingMode && (
          <Tooltip content={t("Exit reading mode")} placement="left">
            <ExitReadingMode
              type="button"
              onClick={() => {
                ui.isReadingMode = false;
              }}
              aria-label={t("Exit reading mode")}
            >
              <CloseIcon />
            </ExitReadingMode>
          </Tooltip>
        )}
        {!isShare && !ui.isReadingMode && ui.rightSidebar !== "ai" && (
          <Tooltip content={t("Ask AI")} placement="left">
            <FloatingAi
              type="button"
              onClick={() => ui.set({ rightSidebar: "ai" })}
              aria-label={t("Ask AI")}
            >
              <SparklesIcon />
            </FloatingAi>
          </Tooltip>
        )}
        <Container column>
          {!readOnly && (
            <Prompt
              when={isUploading && !isEditorDirty}
              message={t(
                `Images are still uploading.\nAre you sure you want to discard them?`
              )}
            />
          )}
          {isShare ? (
            <SharedHeader document={document} />
          ) : (
            <Header
              editorRef={editorRef}
              document={document}
              revision={revision}
              isDraft={document.isDraft}
              isEditing={!readOnly && !!user?.separateEditMode}
              isSaving={isSaving}
              isPublishing={isPublishing}
              publishingIsDisabled={
                document.isSaving || isPublishing || isEmpty
              }
              savingIsDisabled={document.isSaving || isEmpty}
              onSelectTemplate={handleSelectTemplate}
              onSave={onSave}
            />
          )}
          <Main style={fullWidthTransformOffsetStyle}>
            {!isShare && (
              <DocumentCover document={document} readOnly={readOnly} />
            )}
            <BodyWrapper>
              <React.Suspense
                fallback={
                  <EditorContainer docFullWidth={document.fullWidth}>
                    <PlaceholderDocument />
                  </EditorContainer>
                }
              >
                <MeasuredContainer
                  name="document"
                  as={EditorContainer}
                  docFullWidth={document.fullWidth}
                >
                  {revision ? (
                    <RevisionViewer
                      ref={editorRef}
                      document={document}
                      revision={revision}
                      id={revision.id}
                    />
                  ) : (
                    <>
                      <Notices document={document} readOnly={readOnly} />

                      {showContents && (
                        <PrintContentsContainer>
                          <Contents />
                        </PrintContentsContainer>
                      )}
                      <Editor
                        id={document.id}
                        key={embedsDisabled ? "disabled" : "enabled"}
                        ref={editorRef}
                        multiplayer={multiplayerEditor}
                        isDraft={document.isDraft}
                        document={document}
                        value={readOnly ? document.data : undefined}
                        defaultValue={document.data}
                        embedsDisabled={embedsDisabled}
                        onSynced={onSynced}
                        onFileUploadStart={onFileUploadStart}
                        onFileUploadStop={onFileUploadStop}
                        onCreateLink={onCreateLink}
                        onChangeTitle={handleChangeTitle}
                        onChangeIcon={handleChangeIcon}
                        onSave={onSave}
                        onPublish={onPublish}
                        onCancel={goBack}
                        readOnly={readOnly}
                        canUpdate={abilities.update}
                        canComment={abilities.comment}
                        autoFocus={document.createdAt === document.updatedAt}
                      >
                        <ReferencesWrapper>
                          <References document={document} />
                        </ReferencesWrapper>
                      </Editor>
                    </>
                  )}
                </MeasuredContainer>
                {showContents && <Contents />}
              </React.Suspense>
            </BodyWrapper>
          </Main>
          {children}
        </Container>
      </MeasuredContainer>
    </ErrorBoundary>
  );
}

const Main = styled.div`
  margin-top: 32px;
`;

const BodyWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const PrintContentsContainer = styled.div`
  display: none;
  margin: 0 -12px;

  @media print {
    display: block;
  }
`;

type EditorContainerProps = {
  docFullWidth: boolean;
};

const EditorContainer = styled.div<EditorContainerProps>`
  // Adds space to the gutter to make room for icon & heading annotations
  padding: 0 32px;

  ${breakpoint("tablet")`
    padding: 0 44px;

    ${(props: EditorContainerProps) =>
      props.docFullWidth
        ? // Full-width docs span the available area with generous side padding.
          `
        padding: 0 100px;
        max-width: 100%;
        `
        : // Centered, fixed-width reading column.
          `
        max-width: calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter});
        margin-left: auto;
        margin-right: auto;
        `}
  `};

  @media print {
    padding: 0;
    max-width: 100%;
  }
`;

const Background = styled(Container)`
  position: relative;
  background: ${s("background")};
`;

const ExitReadingMode = styled.button`
  appearance: none;
  position: fixed;
  top: 20px;
  inset-inline-end: 28px;
  z-index: 100;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* Translucent pill so it stays legible over both light content and dark
     cover images. */
  background: ${(props) =>
    props.theme.isDark ? "rgba(40, 40, 40, 0.6)" : "rgba(255, 255, 255, 0.7)"};
  backdrop-filter: blur(8px);
  border: 1px solid ${s("divider")};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  outline: 0;
  padding: 0;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  animation: ${fadeAndScaleIn} 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
  transition:
    background 140ms ease,
    color 140ms ease,
    transform 140ms ease,
    box-shadow 140ms ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: ${s("text")};
    transform: scale(1.06);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18);
  }

  &:focus-visible {
    outline: 0;
    color: ${s("text")};
  }
`;

const FloatingAi = styled.button`
  appearance: none;
  position: fixed;
  bottom: 24px;
  inset-inline-end: 24px;
  z-index: 100;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${s("accent")};
  border: 0;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 6px 16px rgba(0, 0, 0, 0.16);
  padding: 0;
  color: ${s("accentText")};
  cursor: var(--pointer);
  animation: ${fadeAndScaleIn} 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    filter 140ms ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.12),
      0 10px 24px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  @media print {
    display: none;
  }
`;

const ReferencesWrapper = styled.div`
  margin: 12px 0 60px;

  ${breakpoint("tablet")`
    margin-bottom: 12px;
  `}

  @media print {
    display: none;
  }
`;

export default observer(DocumentScene);
