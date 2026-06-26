import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { JSONObject, JSONValue } from "@shared/types";
import {
  parseFrontmatter,
  stringifyPropertyValue,
} from "@shared/utils/frontmatter";
import { useDocumentContext } from "~/components/DocumentContext";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import type Document from "~/models/Document";

type Props = {
  /** The document whose properties are displayed and edited. */
  document: Document;
  /** Whether the document is read-only. */
  readOnly?: boolean;
};

type Row = { key: string; value: string };

/**
 * A Notion-style document properties editor rendered beneath the title. Properties
 * are stored as a free-form key-value map on the document and can be seeded from
 * the document's frontmatter.
 */
function DocumentProperties({ document, readOnly }: Props) {
  const { t } = useTranslation();
  const { editor } = useDocumentContext();

  const rows = React.useMemo<Row[]>(
    () =>
      Object.entries(document.properties ?? {}).map(([key, value]) => ({
        key,
        value: stringifyPropertyValue(value),
      })),
    [document.properties]
  );

  const persist = React.useCallback(
    (next: Row[]) => {
      const properties: JSONObject = {};
      for (const row of next) {
        const key = row.key.trim();
        if (key) {
          properties[key] = row.value;
        }
      }
      document.properties = properties;
      void document.save({ properties });
    },
    [document]
  );

  const handleChange = (index: number, patch: Partial<Row>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    persist(next);
  };

  const handleRemove = (index: number) => {
    persist(rows.filter((_row, i) => i !== index));
  };

  const handleAdd = () => {
    persist([...rows, { key: "", value: "" }]);
  };

  const handleImportFrontmatter = () => {
    const markdown = editor?.value() ?? "";
    const parsed = parseFrontmatter(markdown);
    if (!parsed) {
      return;
    }
    const merged: JSONObject = { ...(document.properties ?? {}) };
    for (const [key, value] of Object.entries(parsed)) {
      merged[key] = value as JSONValue;
    }
    document.properties = merged;
    void document.save({ properties: merged });
  };

  const hasFrontmatter = React.useMemo(
    () => !!parseFrontmatter(editor?.value() ?? ""),
    [editor]
  );

  if (readOnly && rows.length === 0) {
    return null;
  }

  return (
    <Wrapper>
      {rows.map((row, index) => (
        <PropertyRow key={index}>
          <KeyInput
            value={row.key}
            placeholder={t("Property")}
            disabled={readOnly}
            onChange={(e) => handleChange(index, { key: e.target.value })}
          />
          <ValueInput
            value={row.value}
            placeholder={t("Empty")}
            disabled={readOnly}
            onChange={(e) => handleChange(index, { value: e.target.value })}
          />
          {!readOnly && (
            <Tooltip content={t("Remove")}>
              <RemoveButton
                onClick={() => handleRemove(index)}
                aria-label={t("Remove")}
              >
                <CloseIcon size={16} />
              </RemoveButton>
            </Tooltip>
          )}
        </PropertyRow>
      ))}
      {!readOnly && (
        <Actions>
          <AddButton type="button" onClick={handleAdd}>
            <PlusIcon size={16} />
            {t("Add property")}
          </AddButton>
          {hasFrontmatter && (
            <AddButton type="button" onClick={handleImportFrontmatter}>
              {t("Import from frontmatter")}
            </AddButton>
          )}
        </Actions>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 4px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PropertyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KeyInput = styled.input`
  flex: 0 0 160px;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: ${s("textSecondary")};
  padding: 4px 6px;
  border-radius: 4px;

  &:hover:not(:disabled),
  &:focus {
    background: ${s("listItemHoverBackground")};
  }
  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const ValueInput = styled.input`
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${s("text")};
  padding: 4px 6px;
  border-radius: 4px;

  &:hover:not(:disabled),
  &:focus {
    background: ${s("listItemHoverBackground")};
  }
  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const RemoveButton = styled(NudeButton)`
  width: 24px;
  height: 24px;
  color: ${s("textTertiary")};
  opacity: 0;
  transition: opacity 120ms ease;

  ${PropertyRow}:hover & {
    opacity: 1;
  }
  &:hover {
    color: ${s("text")};
    background: ${s("listItemHoverBackground")};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 2px;
  opacity: 0.6;
  transition: opacity 120ms ease;

  ${Wrapper}:hover & {
    opacity: 1;
  }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${s("textTertiary")};
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

export default observer(DocumentProperties);
