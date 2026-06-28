import { observer } from "mobx-react";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { stringToColor } from "@shared/utils/color";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useTextSelection from "~/hooks/useTextSelection";
import { useTextStats } from "~/hooks/useTextStats";
import type Document from "~/models/Document";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";

type Props = {
  document: Document;
};

interface InfoRow {
  id: string;
  label: string;
  value: ReactNode;
}

function Insights({ document }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedText = useTextSelection();
  const text = ProsemirrorHelper.toPlainText(document);
  const stats = useTextStats(text ?? "", selectedText);
  const formatNumber = useFormatNumber();
  const importedFrom =
    document.sourceName ??
    (document.sourceMetadata?.fileName
      ? `“${document.sourceMetadata.fileName}”`
      : undefined);

  const sourceRows = useMemo<InfoRow[]>(() => {
    const rows: InfoRow[] = [
      {
        id: "created",
        label: t("Created"),
        value: <Time dateTime={document.createdAt} addSuffix />,
      },
      {
        id: "updated",
        label: t("Last updated"),
        value: <Time dateTime={document.updatedAt} addSuffix />,
      },
    ];

    if (importedFrom) {
      rows.push({
        id: "imported",
        label: t("Imported"),
        value: t("Imported from {{ source }}", {
          source: importedFrom,
        }),
      });
    }

    return rows;
  }, [document.createdAt, document.updatedAt, importedFrom, t]);

  const statItems = useMemo(
    () => [
      ...(stats.total.words > 0
        ? [
            {
              id: "readingTime",
              value: t("{{ number }} minute read", {
                number: formatNumber(stats.total.readingTime),
              }),
            },
          ]
        : []),
      {
        id: "words",
        value: t("{{ number }} words", {
          count: stats.total.words,
          number: formatNumber(stats.total.words),
        }),
      },
      {
        id: "characters",
        value: t("{{ number }} characters", {
          count: stats.total.characters,
          number: formatNumber(stats.total.characters),
        }),
      },
      {
        id: "emoji",
        value: t("{{ number }} emoji", {
          number: formatNumber(stats.total.emoji),
        }),
      },
    ],
    [
      formatNumber,
      stats.total.characters,
      stats.total.emoji,
      stats.total.readingTime,
      stats.total.words,
      t,
    ]
  );

  // Move focus into the modal to account for lazy-loading
  useLayoutEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  return (
    <Root ref={wrapperRef} tabIndex={-1}>
      <Section>
        <SectionTitle>{t("Source")}</SectionTitle>
        <InfoList>
          {sourceRows.map((row) => (
            <InfoItem key={row.id}>
              <InfoLabel>{row.label}</InfoLabel>
              <InfoValue>{row.value}</InfoValue>
            </InfoItem>
          ))}
        </InfoList>
      </Section>

      <Section>
        <SectionTitle>{t("Stats")}</SectionTitle>
        <StatsGrid>
          {statItems.map((item) => (
            <StatItem key={item.id}>
              <StatValue>{item.value}</StatValue>
            </StatItem>
          ))}
        </StatsGrid>
        <SelectionSummary>
          {stats.selected.characters === 0 ? (
            t("No text selected")
          ) : (
            <>
              {t("{{ number }} words selected", {
                count: stats.selected.words,
                number: formatNumber(stats.selected.words),
              })}
              <SelectionDivider aria-hidden />
              {t("{{ number }} characters selected", {
                count: stats.selected.characters,
                number: formatNumber(stats.selected.characters),
              })}
            </>
          )}
        </SelectionSummary>
      </Section>

      <Section>
        <SectionTitle>{t("Contributors")}</SectionTitle>
        <ContributorsList>
          {document.sourceMetadata?.createdByName && (
            <ContributorItem
              title={document.sourceMetadata?.createdByName}
              image={
                <Avatar
                  model={{
                    color: stringToColor(document.sourceMetadata.createdByName),
                    avatarUrl: null,
                    initial: document.sourceMetadata.createdByName[0],
                  }}
                  size={AvatarSize.Large}
                />
              }
              subtitle={t("Creator")}
              border={false}
              small
            />
          )}
          <PaginatedList<User>
            aria-label={t("Contributors")}
            items={document.collaborators}
            renderItem={(model) => (
              <ContributorItem
                key={model.id}
                title={model.name}
                image={<Avatar model={model} size={AvatarSize.Large} />}
                subtitle={
                  model.id === document.createdBy?.id
                    ? document.sourceMetadata?.createdByName
                      ? t("Imported")
                      : t("Creator")
                    : model.id === document.updatedBy?.id
                      ? t("Last edited")
                      : t("Previously edited")
                }
                border={false}
                small
              />
            )}
          />
        </ContributorsList>
      </Section>
    </Root>
  );
}

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;

  &:focus {
    outline: none;
  }
`;

const Section = styled("section")`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionTitle = styled(Text).attrs({
  as: "h2",
})`
  margin: 0;
  color: ${s("text")};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
`;

const InfoList = styled("dl")`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  margin: 0;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
`;

const InfoItem = styled("div")`
  display: grid;
  grid-template-columns: minmax(96px, 0.7fr) minmax(0, 1.3fr);
  gap: 12px;
  align-items: baseline;
  padding: 10px 12px;
  background: ${s("background")};

  & + & {
    border-top: 1px solid ${s("divider")};
  }
`;

const InfoLabel = styled("dt")`
  color: ${s("textTertiary")};
  font-size: 13px;
  line-height: 1.4;
`;

const InfoValue = styled("dd")`
  margin: 0;
  min-width: 0;
  color: ${s("text")};
  font-size: 13px;
  line-height: 1.4;
  text-align: end;
  overflow-wrap: anywhere;
`;

const StatsGrid = styled("div")`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatItem = styled("div")`
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 58px;
  border-radius: 8px;
  border: 1px solid ${s("divider")};
  background: ${s("backgroundSecondary")};
  padding: 10px;
`;

const StatValue = styled("div")`
  color: ${s("text")};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const SelectionSummary = styled("div")`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  color: ${s("textSecondary")};
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 10px;
`;

const SelectionDivider = styled("span")`
  width: 1px;
  height: 14px;
  background: ${s("divider")};
`;

const ContributorItem = styled(ListItem)`
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid ${s("divider")};
  border-bottom: 0;
`;

const ContributorsList = styled("div")`
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;

  &
    > ${ContributorItem}:first-child,
    &
    > div:first-child
    > ${ContributorItem}:first-child {
    border-top: 0;
  }

  &:empty {
    display: none;
  }
`;

export default observer(Insights);
