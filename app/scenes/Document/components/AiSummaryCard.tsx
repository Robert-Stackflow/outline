import { observer } from "mobx-react";
import { SparklesIcon, CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";

type Props = {
  /** The document to summarize. */
  document: Document;
};

/**
 * A collapsible AI-generated summary card displayed at the top of a document.
 * The summary is generated on demand, streamed in, and cached for the session.
 */
function AiSummaryCard({ document }: Props) {
  const { t } = useTranslation();
  const { ai } = useStores();
  const [loading, setLoading] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (!ai.config) {
      void ai.fetchConfig();
    }
  }, [ai]);

  const summary = ai.summaries.get(document.id);

  const handleGenerate = React.useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      setCollapsed(false);
      setLoading(true);
      try {
        await ai.summarize(document.id);
      } catch (_err) {
        toast.error(t("Failed to generate summary"));
      } finally {
        setLoading(false);
      }
    },
    [ai, document.id, t]
  );

  // Only surface the card when AI is configured and available to this user.
  if (!ai.config?.configured || !ai.config.canManage) {
    return null;
  }

  const hasBody = !!summary || loading;

  return (
    <Card>
      <Header
        onClick={() => hasBody && setCollapsed((c) => !c)}
        $clickable={hasBody}
      >
        <Title>
          {hasBody && <Chevron $collapsed={collapsed} size={18} />}
          <SparklesIcon size={16} />
          {t("AI summary")}
        </Title>
        <Action type="button" onClick={handleGenerate} disabled={loading}>
          {loading
            ? `${t("Generating")}…`
            : summary
              ? t("Regenerate")
              : t("Generate")}
        </Action>
      </Header>
      {hasBody && !collapsed && (
        <Body>{summary || <Muted>{t("Generating")}…</Muted>}</Body>
      )}
    </Card>
  );
}

const Card = styled.div`
  margin: 6px 0 18px;
  padding: 12px 16px;
  border: 1px solid ${s("divider")};
  border-radius: 10px;
  background: ${s("backgroundSecondary")};
`;

const Header = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: ${(props) => (props.$clickable ? "var(--pointer)" : "default")};
`;

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${s("textSecondary")};

  > svg:last-of-type {
    color: ${s("accent")};
  }
`;

const Chevron = styled(CollapsedIcon)<{ $collapsed?: boolean }>`
  color: ${s("textTertiary")};
  transition: transform 150ms ease;
  transform: rotate(${(props) => (props.$collapsed ? "-90deg" : "0deg")});
`;

const Action = styled.button`
  border: 0;
  background: transparent;
  color: ${s("accent")};
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${s("listItemHoverBackground")};
  }
  &:disabled {
    color: ${s("textTertiary")};
    cursor: default;
  }
`;

const Body = styled.div`
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: ${s("text")};
  white-space: pre-wrap;
`;

const Muted = styled.span`
  color: ${s("textTertiary")};
`;

export default observer(AiSummaryCard);
