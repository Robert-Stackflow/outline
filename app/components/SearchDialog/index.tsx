import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { depths, s } from "@shared/styles";
import type {
  SortFilter as TSortFilter,
  DirectionFilter as TDirectionFilter,
  DateFilter as TDateFilter,
} from "@shared/types";
import { StatusFilter as TStatusFilter } from "@shared/types";
import { Pagination } from "@shared/constants";
import { fadeAndScaleIn, fadeIn } from "~/styles/animations";
import DocumentListItem from "~/components/DocumentListItem";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import { Portal } from "~/components/Portal";
import Text from "~/components/Text";
import useKeyDown from "~/hooks/useKeyDown";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import type { PaginationParams, SearchResult } from "~/types";
import CollectionFilter from "~/scenes/Search/components/CollectionFilter";
import DateFilter from "~/scenes/Search/components/DateFilter";
import DocumentTypeFilter from "~/scenes/Search/components/DocumentTypeFilter";
import { SortInput } from "~/scenes/Search/components/SortInput";
import UserFilter from "~/scenes/Search/components/UserFilter";
import RecentSearchListItem from "~/scenes/Search/components/RecentSearchListItem";

const DEBOUNCE_MS = 250;

/**
 * A global, Notion-style search dialog. This is intentionally independent from
 * the kbar command palette: it focuses purely on full-text document search with
 * the same filter capabilities as the legacy `/search` page, surfaced as an
 * overlay that can be summoned from anywhere.
 */
function SearchDialog() {
  const { t } = useTranslation();
  const { ui, documents, searches } = useStores();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [collectionId, setCollectionId] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<TDateFilter>(
    "" as TDateFilter
  );
  const [statusFilter, setStatusFilter] = React.useState<TStatusFilter[]>([
    TStatusFilter.Published,
    TStatusFilter.Draft,
  ]);
  const [titleFilter, setTitleFilter] = React.useState(false);
  const [sort, setSort] = React.useState<TSortFilter>("" as TSortFilter);
  const [direction, setDirection] = React.useState<TDirectionFilter>(
    "" as TDirectionFilter
  );

  const close = React.useCallback(() => ui.closeSearchDialog(), [ui]);

  // Reset transient state whenever the dialog is dismissed so it always opens
  // fresh.
  React.useEffect(() => {
    if (!ui.searchDialogOpen) {
      setInputValue("");
      setQuery("");
      setCollectionId("");
      setUserId("");
      setDateFilter("" as TDateFilter);
      setStatusFilter([TStatusFilter.Published, TStatusFilter.Draft]);
      setTitleFilter(false);
      setSort("" as TSortFilter);
      setDirection("" as TDirectionFilter);
    }
  }, [ui.searchDialogOpen]);

  // Debounce the typed value into the active query for search-as-you-type.
  React.useEffect(() => {
    const handle = setTimeout(() => setQuery(inputValue.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputValue]);

  useKeyDown(
    "Escape",
    () => {
      if (ui.searchDialogOpen) {
        close();
      }
    },
    { allowInInput: true }
  );

  const isSearchable = !!(query || collectionId || userId);

  const filters = React.useMemo(
    () => ({
      query: query || undefined,
      statusFilter,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      sort,
      direction,
    }),
    [
      query,
      JSON.stringify(statusFilter),
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      sort,
      direction,
    ]
  );

  const requestFn = React.useMemo(() => {
    if (query) {
      searches.add({
        id: uuidv4(),
        query,
        createdAt: new Date().toISOString(),
      });
    }

    if (isSearchable) {
      return async (params?: PaginationParams) => {
        const paginationParams = {
          offset: params?.offset,
          limit: params?.limit,
        };
        return titleFilter
          ? await documents.searchTitles({ ...filters, ...paginationParams })
          : await documents.search({ ...filters, ...paginationParams });
      };
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, filters, searches, documents, isSearchable]);

  const { data, next, end, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  React.useEffect(() => {
    void searches.fetchPage({ source: "app" });
  }, [searches]);

  if (!ui.searchDialogOpen) {
    return null;
  }

  const showEmpty = !loading && !!query && data?.length === 0;
  const handleResultsClick = (event: React.MouseEvent) => {
    // Any navigation triggered from within the results should dismiss the
    // dialog. Ignore modified clicks (open in new tab).
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      (event.target as HTMLElement).closest("a")
    ) {
      close();
    }
  };

  return (
    <Portal>
      <Backdrop onClick={close} />
      <Positioner onClick={close}>
        <Panel
          role="dialog"
          aria-label={t("Search")}
          onClick={(event) => event.stopPropagation()}
        >
          <InputRow align="center">
            <InputWrapper
              ref={inputRef}
              value={inputValue}
              autoFocus
              spellCheck={false}
              type="search"
              placeholder={`${t("Search")}…`}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setQuery(event.currentTarget.value.trim());
                }
              }}
            />
            <CloseButton onClick={close} aria-label={t("Close")}>
              <CloseIcon />
            </CloseButton>
          </InputRow>

          <Filters align="center" gap={4} wrap>
            <CollectionFilter
              collectionId={collectionId}
              onSelect={(id) => setCollectionId(id ?? "")}
            />
            <UserFilter
              userId={userId}
              onSelect={(id) => setUserId(id ?? "")}
            />
            <DocumentTypeFilter
              statusFilter={statusFilter}
              onSelect={({ statusFilter: sf }) => setStatusFilter(sf)}
            />
            <DateFilter
              dateFilter={dateFilter}
              onSelect={(df) => setDateFilter(df ?? ("" as TDateFilter))}
            />
            <Spacer />
            {isSearchable && (
              <SortInput
                sort={sort}
                direction={direction}
                onSelect={(s2, d2) => {
                  setSort((s2 ?? "") as TSortFilter);
                  setDirection((d2 ?? "") as TDirectionFilter);
                }}
              />
            )}
          </Filters>

          <Results onClickCapture={handleResultsClick}>
            {isSearchable ? (
              <>
                {showEmpty ? (
                  <Empty>
                    <Text as="p" type="secondary">
                      {t("No documents found for your search filters.")}
                    </Text>
                  </Empty>
                ) : (
                  <>
                    {data?.map((result) => (
                      <DocumentListItem
                        key={result.document.id}
                        document={result.document}
                        highlight={query}
                        context={result.context}
                        showCollection
                      />
                    ))}
                    <Waypoint
                      key={data?.length}
                      onEnter={end || loading ? undefined : next}
                    />
                  </>
                )}
              </>
            ) : searches.recent.length ? (
              <>
                <SectionHeading>{t("Recent searches")}</SectionHeading>
                {searches.recent.map((searchQuery) => (
                  <RecentSearchListItem
                    key={searchQuery.id}
                    searchQuery={searchQuery}
                  />
                ))}
              </>
            ) : (
              <Empty>
                <Text as="p" type="secondary">
                  {t("Search for documents, collections and more")}
                </Text>
              </Empty>
            )}
          </Results>
        </Panel>
      </Positioner>
    </Portal>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${depths.overlay};
  background: ${(props) =>
    props.theme.isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.25)"};
  animation: ${fadeIn} 150ms ease;
`;

const Positioner = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${depths.modal};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  overflow-y: auto;
`;

const Panel = styled.div`
  width: 100%;
  max-width: 640px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: ${s("menuBackground")};
  border-radius: 12px;
  box-shadow: ${s("modalShadow")};
  overflow: hidden;
  animation: ${fadeAndScaleIn} 180ms ease;
`;

const InputRow = styled(Flex)`
  padding: 6px 8px 6px 16px;
  border-bottom: 1px solid ${s("divider")};
`;

const InputWrapper = styled.input`
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 18px;
  font-weight: 400;
  padding: 10px 0;
  color: ${s("text")};

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  ::placeholder {
    color: ${s("placeholder")};
  }
`;

const CloseButton = styled(NudeButton)`
  width: 28px;
  height: 28px;
  color: ${s("textTertiary")};
  &:hover {
    color: ${s("text")};
    background: ${s("listItemHoverBackground")};
  }
`;

const Filters = styled(Flex)`
  padding: 8px 12px;
  border-bottom: 1px solid ${s("divider")};
`;

const Spacer = styled.span`
  flex: 1;
`;

const Results = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
`;

const SectionHeading = styled.h3`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  margin: 4px 4px 8px;
`;

const Empty = styled.div`
  padding: 24px 4px;
  text-align: center;
`;

export default observer(SearchDialog);
