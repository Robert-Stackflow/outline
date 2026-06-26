import { observer } from "mobx-react";
import { SparklesIcon } from "outline-icons";
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
 * The summary is generated on demand and cached for the session.
 */
function AiSummaryCard({ document }: Props) {
  const { t } = useTranslation();
  const { ai } = useStores();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!ai.config) {
      void ai.fetchConfig();
    }
  }, [ai]);

  const summary = ai.summaries.get(document.id);

  const handleGenerate = React.useCallback(async () => {
    setLoading(true);
    try {
      await ai.summarize(document.id);
    } catch (_err) {
      toast.error(t("Failed to generate summary"));
    } finally {
      setLoading(false);
    }
  }, [ai, document.id, t]);

  // Only surface the card when AI is configured for the workspace.
  if (!ai.config?.configured) {
    return null;
  }

  return (
    <Card>
      <Header>
        <Title>
          <SparklesIcon size={16} />
          {t("AI summary")}
        </Title>
        <Action
          type="button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? `${t("Generating")}…`
            : summary
              ? t("Regenerate")
              : t("Generate")}
        </Action>
      </Header>
      {summary ? (
        <Body>{summary}</Body>
      ) : (
        <Placeholder>{t("Generate an AI summary of this document.")}</Placeholder>
      )}
    </Card>
  );
}

const Card = styled.div`
  margin: 8px 0 16px;
  padding: 12px 16px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};

  svg {
    color: ${s("accent")};
  }
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

  &:hover:not(:disabled) {
    background: ${s("listItemHoverBackground")};
  }
  &:disabled {
    color: ${s("textTertiary")};
    cursor: default;
  }
`;

const Body = styled.div`
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: ${s("text")};
  white-space: pre-wrap;
`;

const Placeholder = styled.div`
  margin-top: 6px;
  font-size: 14px;
  color: ${s("textTertiary")};
`;

export default observer(AiSummaryCard);
