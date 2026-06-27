import { observer } from "mobx-react";
import { m } from "framer-motion";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { richExtensions, withComments } from "@shared/editor/nodes";
import { colorPalette } from "@shared/utils/collections";
import Comment from "~/models/Comment";
import type Document from "~/models/Document";
import type Template from "~/models/Template";
import type { RefHandle } from "~/components/ContentEditable";
import { useDocumentContext } from "~/components/DocumentContext";
import type { Props as EditorProps } from "~/components/Editor";
import Editor from "~/components/Editor";
import type { Editor as SharedEditor } from "~/editor";
import Flex from "~/components/Flex";
import Time from "~/components/Time";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import {
  documentHistoryPath,
  documentPath,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import DocumentMeta from "./DocumentMeta";
import DocumentProperties from "./DocumentProperties";
import DocumentTitle from "./DocumentTitle";
import { first } from "es-toolkit/compat";
import { getLangFor } from "~/utils/language";
import useShare from "@shared/hooks/useShare";

const extensions = withUIExtensions(withComments(richExtensions));

type Props = Omit<EditorProps, "editorStyle"> & {
  onChangeTitle: (title: string) => void;
  onChangeIcon: (icon: string | null, color: string | null) => void;
  id: string;
  document: Document | Template;
  isDraft: boolean;
  multiplayer?: boolean;
  onSave: (options: {
    done?: boolean;
    autosave?: boolean;
    publish?: boolean;
  }) => void;
  children?: React.ReactNode;
};

/**
 * The main document editor includes an editable title with metadata below it,
 * and support for commenting.
 */
function DocumentEditor(props: Props, ref: React.ForwardedRef<SharedEditor>) {
  const editorRef = React.useRef<SharedEditor>(null);
  const titleRef = React.useRef<RefHandle>(null);
  const { t } = useTranslation();
  const match = useRouteMatch();
  const { setFocusedCommentId } = useDocumentContext();
  const focusedComment = useFocusedComment();
  const { ui, comments } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const sidebarContext = useLocationSidebarContext();
  const params = useQuery();
  const { shareId, showLastUpdated } = useShare();
  const {
    document,
    onChangeTitle,
    onChangeIcon,
    isDraft,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;
  const can = usePolicy(document);
  const commentingEnabled = !!team?.commentingEnabled;

  const iconColor = document.color ?? (first(colorPalette) as string);
  const childRef = React.useRef<HTMLDivElement>(null);
  const [propertiesVisible, setPropertiesVisible] = React.useState(false);
  const focusAtStart = React.useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focusAtStart();
    }
  }, []);

  React.useEffect(() => {
    if (focusedComment && focusedComment.documentId === document.id) {
      const viewingResolved = params.get("resolved") === "";
      if (
        (focusedComment.isResolved && !viewingResolved) ||
        (!focusedComment.isResolved && viewingResolved)
      ) {
        setFocusedCommentId(focusedComment.id);
      }
      ui.set({ rightSidebar: "comments" });
    }
  }, [focusedComment, ui, document.id, params, setFocusedCommentId]);

  React.useEffect(() => {
    setPropertiesVisible(false);
  }, [document.id]);

  // Save document when blurring title, but delay so that if clicking on a
  // button this is allowed to execute first.
  const handleBlur = React.useCallback(() => {
    setTimeout(() => props.onSave({ autosave: true }), 250);
  }, [props]);

  const handleGoToNextInput = React.useCallback(
    (insertParagraph: boolean) => {
      if (insertParagraph && editorRef.current) {
        const { view } = editorRef.current;
        const { dispatch, state } = view;
        dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
      }

      focusAtStart();
    },
    [focusAtStart]
  );

  // Create a Comment model in local store when a comment mark is created, this
  // acts as a local draft before submission.
  const handleDraftComment = React.useCallback(
    (commentId: string, createdById: string, options?: { focus: boolean }) => {
      if (comments.get(commentId) || createdById !== user?.id) {
        return;
      }

      const comment = new Comment(
        {
          documentId: props.id,
          createdAt: new Date(),
          createdById,
          reactions: [],
        },
        comments
      );
      comment.id = commentId;
      comments.add(comment);

      if (options?.focus) {
        setFocusedCommentId(commentId);
      }
    },
    [comments, user?.id, props.id, setFocusedCommentId]
  );

  // Soft delete the Comment model when associated mark is totally removed.
  const handleRemoveComment = React.useCallback(
    async (commentId: string) => {
      const comment = comments.get(commentId);
      if (comment?.isNew) {
        await comment?.delete();
      }
    },
    [comments]
  );

  const {
    setEditor,
    setEditorInitialized,
    updateState: updateDocState,
  } = useDocumentContext();
  const handleRefChanged = React.useCallback(setEditor, [setEditor]);
  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = React.useMemo(
    () => ({
      paddingBottom: `calc(30vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );

  const handleInit = React.useCallback(
    () => setEditorInitialized(true),
    [setEditorInitialized]
  );

  const handleDestroy = React.useCallback(
    () => setEditorInitialized(false),
    [setEditorInitialized]
  );

  const direction = titleRef.current?.getComputedDirection();
  const showTitleActions = !document.icon && !readOnly && can.update;
  const hasCover = "coverImage" in document && !!document.coverImage;

  return (
    <Flex auto column>
      <TitleGroup $hasCover={hasCover}>
        {shareId ? (
          showLastUpdated && document.updatedAt ? (
            <HoverMeta>
              <SharedMeta type="tertiary">
                {t("Last updated")}{" "}
                <Time dateTime={document.updatedAt} addSuffix />
              </SharedMeta>
            </HoverMeta>
          ) : null
        ) : !rest.template ? (
          <HoverMeta $visible={showTitleActions}>
            <DocumentMeta
              document={document as Document}
              to={{
                pathname:
                  match.path === matchDocumentHistory
                    ? documentPath(document as Document)
                    : documentHistoryPath(document as Document),
                state: { sidebarContext },
              }}
              iconColor={iconColor}
              onChangeIcon={onChangeIcon}
              propertiesVisible={propertiesVisible}
              onToggleProperties={() =>
                setPropertiesVisible((visible) => !visible)
              }
              readOnly={readOnly}
              rtl={direction === "rtl"}
            />
          </HoverMeta>
        ) : null}
        <DocumentTitle
          ref={titleRef}
          readOnly={readOnly}
          documentId={document.id}
          title={
            !document.title && readOnly
              ? document.titleWithDefault
              : document.title
          }
          icon={document.icon}
          color={iconColor}
          onChangeTitle={onChangeTitle}
          onChangeIcon={onChangeIcon}
          onGoToNextInput={handleGoToNextInput}
          onBlur={handleBlur}
          placeholder={t("Untitled")}
        />
      </TitleGroup>
      {!rest.template && (
        <PropertiesDisclosure
          $visible={propertiesVisible}
          aria-hidden={!propertiesVisible}
        >
          <PropertiesDisclosureInner>
            <DocumentProperties
              document={document as Document}
              readOnly={readOnly}
            />
          </PropertiesDisclosureInner>
        </PropertiesDisclosure>
      )}
      <EditorComponent
        ref={mergeRefs([ref, editorRef, handleRefChanged])}
        lang={getLangFor(document.language)}
        autoFocus={!!document.title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        scrollTo={decodeURIComponentSafe(window.location.hash)}
        readOnly={readOnly}
        userId={user?.id}
        focusedCommentId={focusedComment?.id}
        onClickCommentMark={
          commentingEnabled && can.comment ? setFocusedCommentId : undefined
        }
        onCreateCommentMark={
          commentingEnabled && can.comment ? handleDraftComment : undefined
        }
        onDeleteCommentMark={
          commentingEnabled && can.comment ? handleRemoveComment : undefined
        }
        onOpenCommentsSidebar={
          commentingEnabled
            ? () => ui.set({ rightSidebar: "comments" })
            : undefined
        }
        onInit={handleInit}
        onDestroy={handleDestroy}
        onChange={updateDocState}
        extensions={extensions}
        editorStyle={editorStyle}
        {...rest}
      />
      <div ref={childRef}>{children}</div>
    </Flex>
  );
}

const SharedMeta = styled(Text)`
  margin: 0;
  font-size: 14px;
`;

// Groups the (hover-revealed) meta row with the title so the meta only appears
// when the user is interacting with the document header — Notion-style.
const TitleGroup = styled.div<{ $hasCover?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: ${(props) => (props.$hasCover ? 8 : 56)}px;
  margin-bottom: 14px;
`;

const HoverMeta = styled.div<{ $visible?: boolean }>`
  min-height: 28px;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 150ms ease;

  ${TitleGroup}:hover &,
  &:focus-within {
    opacity: 1;
  }

  /* The meta components carry their own top/bottom margins; neutralize them so
     the hover row sits compactly above the title. */
  & > * {
    margin: 0;
  }
`;

const PropertiesDisclosure = styled(m.div).attrs<{ $visible?: boolean }>(
  (props) => ({
    animate: {
      height: props.$visible ? "auto" : 0,
      opacity: props.$visible ? 1 : 0,
    },
    initial: false,
    transition: {
      duration: 0.18,
      ease: "easeInOut",
    },
  })
)<{ $visible?: boolean }>`
  overflow: hidden;
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
`;

const PropertiesDisclosureInner = styled.div`
  min-height: 0;
  overflow: hidden;
`;

export default observer(React.forwardRef(DocumentEditor));
