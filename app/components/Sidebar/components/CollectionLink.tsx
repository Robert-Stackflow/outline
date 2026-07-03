import { observer } from "mobx-react";
import { CollapseIcon, ExpandIcon } from "outline-icons";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { UserPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import { ActionSeparator, createAction } from "~/actions";
import { createCollection } from "~/actions/definitions/collections";
import { CollectionSection } from "~/actions/sections";
import type { RefHandle } from "~/components/EditableTitle";
import useCurrentUser from "~/hooks/useCurrentUser";
import {
  useCollectionMenuAction,
  type CollectionMenuAction,
} from "~/hooks/useCollectionMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import CollectionMenu from "~/menus/CollectionMenu";
import useBoolean from "~/hooks/useBoolean";
import { documentEditPath } from "~/utils/routeHelpers";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import CollectionLinkChildren from "./CollectionLinkChildren";
import CollectionRow from "./CollectionRow";
import { useSidebarContext } from "./SidebarContext";

type Props = {
  collection: Collection;
  expanded?: boolean;
  onDisclosureClick: (ev?: React.MouseEvent<HTMLElement>) => void;
  activeDocument: Document | undefined;
  isDraggingAnyCollection?: boolean;
  depth?: number;
  extraMenuActions?: CollectionMenuAction[];
  onCollapseAll?: () => void;
  onClick?: () => void;
  onExpandAll?: () => void;
};

const CollectionLink: React.FC<Props> = ({
  collection,
  expanded,
  onDisclosureClick,
  isDraggingAnyCollection,
  depth,
  extraMenuActions,
  onCollapseAll,
  onClick,
  onExpandAll,
}: Props) => {
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const { documents } = useStores();
  const history = useHistory();
  const can = usePolicy(collection);
  const sidebarContext = useSidebarContext();
  const user = useCurrentUser();
  const editableTitleRef = React.useRef<RefHandle>(null);

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({ name });
    },
    [collection]
  );

  const handleExpand = React.useCallback(() => {
    if (!expanded) {
      onDisclosureClick();
    }
  }, [expanded, onDisclosureClick]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDropToChangeCollection(
    collection,
    handleExpand,
    parentRef
  );

  const handlePrefetch = React.useCallback(() => {
    void collection.fetchDocuments();
  }, [collection]);

  const handleRename = React.useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const handleNewDoc = React.useCallback(
    async (input: string) => {
      const newDocument = await documents.create(
        {
          collectionId: collection.id,
          title: input,
          fullWidth: user.getPreference(UserPreference.FullWidthDocuments),
          data: ProsemirrorHelper.getEmptyDocument(),
        },
        { publish: true }
      );
      collection?.addDocument(newDocument);
      history.push({
        pathname: documentEditPath(newDocument),
        state: { sidebarContext },
      });
    },
    [user, sidebarContext, history, collection, documents]
  );

  const collectionNavigationActions = React.useMemo<
    CollectionMenuAction[] | undefined
  >(() => {
    if (!onCollapseAll || !onExpandAll) {
      return extraMenuActions;
    }

    return [
      createCollection,
      ActionSeparator,
      createAction({
        name: ({ t }) => t("Collapse all"),
        analyticsName: "Collapse all collection documents",
        section: CollectionSection,
        icon: <CollapseIcon />,
        perform: onCollapseAll,
      }),
      createAction({
        name: ({ t }) => t("Expand all"),
        analyticsName: "Expand all collection documents",
        section: CollectionSection,
        icon: <ExpandIcon />,
        perform: onExpandAll,
      }),
    ];
  }, [extraMenuActions, onCollapseAll, onExpandAll]);

  const contextMenuAction = useCollectionMenuAction({
    collectionId: collection.id,
    extraActions: collectionNavigationActions,
    onRename: handleRename,
  });

  const menu = !isDraggingAnyCollection ? (
    <CollectionMenu
      collection={collection}
      extraActions={collectionNavigationActions}
      onRename={handleRename}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    />
  ) : undefined;

  return (
    <CollectionRow
      collection={collection}
      depth={depth}
      to={{ pathname: collection.path, state: { sidebarContext } }}
      onClick={onClick}
      onClickIntent={handlePrefetch}
      expanded={expanded}
      onDisclosureClick={onDisclosureClick}
      onExpand={handleExpand}
      canEdit={can.update}
      labelText={collection.name}
      onTitleChange={handleTitleChange}
      editableTitleRef={editableTitleRef}
      contextAction={contextMenuAction}
      menu={menu}
      menuOpen={menuOpen}
      canCreateChild={!isDraggingAnyCollection && can.createDocument}
      onCreateChild={handleNewDoc}
      parentRef={parentRef}
      dropRef={dropRef}
      isActiveDropTarget={isOver && canDrop}
    >
      <CollectionLinkChildren
        collection={collection}
        expanded={!!expanded}
        prefetchDocument={documents.prefetchDocument}
      />
    </CollectionRow>
  );
};

export default observer(CollectionLink);
