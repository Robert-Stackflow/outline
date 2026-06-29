import { IconTitleWrapper } from "@shared/components/Icon";
import breakpoint from "styled-components-breakpoint";
import { Suspense, useCallback } from "react";
import styled from "styled-components";
import { CollectionValidation } from "@shared/validations";
import { isRTL } from "@shared/utils/rtl";
import Heading from "~/components/Heading";
import ContentEditable from "~/components/ContentEditable";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type Collection from "~/models/Collection";
import { colorPalette } from "@shared/utils/collections";
import usePolicy from "~/hooks/usePolicy";
import { observer } from "mobx-react";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { useTranslation } from "react-i18next";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

type Props = {
  /** The collection for which to render a header */
  collection: Collection;
  /** Whether the header is in editing mode */
  isEditing?: boolean;
};

export const Header = observer(function Header_({
  collection,
  isEditing,
}: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const canEdit = can.update && isEditing;
  const handleIconChange = useCallback(
    (icon: string | null, color: string | null) =>
      collection?.save({ icon, color }),
    [collection]
  );

  const handleTitleChange = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length > 0 && trimmed !== collection.name) {
        void collection.save({ name: trimmed });
      }
    },
    [collection]
  );

  const fallbackIcon = collection ? (
    <CollectionIcon collection={collection} size={40} expanded />
  ) : null;

  const dir = isRTL(collection.name) ? "rtl" : "ltr";

  return (
    <StyledHeading dir={dir}>
      <IconTitleWrapper dir={dir}>
        {canEdit ? (
          <Suspense fallback={fallbackIcon}>
            <IconPicker
              icon={collection.icon ?? "collection"}
              color={collection.color ?? colorPalette[0]}
              initial={collection.initial}
              size={40}
              ariaLabel={t("Icon Picker")}
              popoverPosition="bottom-start"
              onChange={handleIconChange}
              allowDelete={!!collection.icon}
              borderOnHover
            >
              {fallbackIcon}
            </IconPicker>
          </Suspense>
        ) : (
          fallbackIcon
        )}
      </IconTitleWrapper>
      {canEdit ? (
        <ContentEditable
          value={collection.name}
          onChange={handleTitleChange}
          maxLength={CollectionValidation.maxNameLength}
          dir="auto"
        />
      ) : (
        collection.name
      )}
    </StyledHeading>
  );
});

const StyledHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 16px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;
