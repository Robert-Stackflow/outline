import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { CloseIcon } from "outline-icons";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import type SearchQuery from "~/models/SearchQuery";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";

type Props = {
  searchQuery: SearchQuery;
};

function RecentSearchListItem({ searchQuery }: Props) {
  const { t } = useTranslation();
  const { ui } = useStores();

  const ref = useRef<HTMLButtonElement>(null);

  const { focused, ...rovingTabIndex } = useRovingTabIndex(ref, false);
  useFocusEffect(focused, ref);

  return (
    <RecentSearch
      type="button"
      onClick={() => ui.openSearchDialog({ query: searchQuery.query })}
      ref={ref}
      {...rovingTabIndex}
    >
      {searchQuery.query}
      <Tooltip content={t("Remove search")}>
        <RemoveButton
          aria-label={t("Remove search")}
          onClick={async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            await searchQuery.delete();
          }}
        >
          <CloseIcon />
        </RemoveButton>
      </Tooltip>
    </RecentSearch>
  );
}

const RemoveButton = styled(NudeButton)`
  opacity: 0;
  color: ${s("textTertiary")};

  &:focus,
  &:${hover} {
    opacity: 1;
    color: ${s("text")};
  }
`;

const RecentSearch = styled.button`
  display: flex;
  width: 100%;
  justify-content: space-between;
  border: 0;
  background: transparent;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  padding: 1px 8px;
  border-radius: 4px;
  line-height: 24px;
  font-size: 14px;
  margin: 0 -8px;
  text-align: left;

  &:focus-visible {
    outline: none;
  }

  &:focus,
  &:${hover} {
    color: ${s("text")};
    background: ${s("backgroundSecondary")};

    ${RemoveButton} {
      opacity: 1;
    }
  }
`;

export default RecentSearchListItem;
