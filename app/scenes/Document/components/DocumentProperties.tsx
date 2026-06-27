import { observer } from "mobx-react";
import { CloseIcon, PlusIcon, CodeIcon, BulletedListIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { JSONObject, JSONValue } from "@shared/types";
import {
  objectToYaml,
  stringifyPropertyValue,
  yamlToObject,
} from "@shared/utils/frontmatter";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import type Document from "~/models/Document";

type Props = {
  /** The document whose properties are displayed and edited. */
  document: Document;
  /** Whether the document is read-only. */
  readOnly?: boolean;
};

type Row = { id: number; key: string; value: string };
type Mode = "list" | "yaml";

let nextRowId = 1;

/** Builds editable rows from a document's stored properties. */
function rowsFromProperties(properties: JSONObject | null | undefined): Row[] {
  return Object.entries(properties ?? {}).map(([key, value]) => ({
    id: nextRowId++,
    key,
    value: stringifyPropertyValue(value),
  }));
}

/** Collapses editable rows into a properties object (drops blank keys). */
function propertiesFromRows(rows: Row[]): JSONObject {
  const properties: JSONObject = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) {
      properties[key] = row.value;
    }
  }
  return properties;
}

/**
 * A Notion-style document properties editor rendered beneath the title. Acts as
 * a frontmatter block that can be edited either as a key-value property list or
 * as raw YAML, with the two views kept in sync.
 */
function DocumentProperties({ document, readOnly }: Props) {
  const { t } = useTranslation();

  const [mode, setMode] = React.useState<Mode>("list");
  const [rows, setRows] = React.useState<Row[]>(() =>
    rowsFromProperties(document.properties)
  );
  const [yamlText, setYamlText] = React.useState("");
  const [yamlError, setYamlError] = React.useState(false);

  // Re-seed local state when navigating between documents.
  React.useEffect(() => {
    setRows(rowsFromProperties(document.properties));
    setMode("list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id]);

  const persist = React.useCallback(
    (properties: JSONObject) => {
      document.properties = properties;
      void document.save({ properties });
    },
    [document]
  );

  const updateRows = (next: Row[]) => {
    setRows(next);
    persist(propertiesFromRows(next));
  };

  const handleChange = (id: number, patch: Partial<Row>) => {
    setRows((current) => {
      const next = current.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      );
      persist(propertiesFromRows(next));
      return next;
    });
  };

  const handleRemove = (id: number) => {
    updateRows(rows.filter((row) => row.id !== id));
  };

  // Adds a blank row that stays visible until the user gives it a key.
  const handleAdd = () => {
    setRows((current) => [...current, { id: nextRowId++, key: "", value: "" }]);
  };

  const handleToggleMode = () => {
    if (mode === "list") {
      setYamlText(objectToYaml(propertiesFromRows(rows)));
      setYamlError(false);
      setMode("yaml");
    } else {
      // Parse the YAML back into rows on the way out; keep editing on error.
      const parsed = yamlToObject(yamlText);
      if (!parsed) {
        setYamlError(true);
        return;
      }
      const properties = parsed as JSONObject;
      setRows(rowsFromProperties(properties));
      persist(properties);
      setMode("list");
    }
  };

  const handleYamlBlur = () => {
    const parsed = yamlToObject(yamlText);
    if (!parsed) {
      setYamlError(true);
      return;
    }
    setYamlError(false);
    const properties = parsed as JSONObject;
    persist(properties);
    setRows(rowsFromProperties(properties));
  };

  if (readOnly && rows.length === 0) {
    return null;
  }

  return (
    <Wrapper>
      {mode === "yaml" ? (
        <YamlArea
          value={yamlText}
          $error={yamlError}
          spellCheck={false}
          placeholder={"key: value"}
          onChange={(e) => setYamlText(e.target.value)}
          onBlur={handleYamlBlur}
        />
      ) : (
        rows.map((row) => (
          <PropertyRow key={row.id}>
            <KeyInput
              value={row.key}
              placeholder={t("Property")}
              disabled={readOnly}
              onChange={(e) => handleChange(row.id, { key: e.target.value })}
            />
            <ValueInput
              value={row.value}
              placeholder={t("Empty")}
              disabled={readOnly}
              onChange={(e) => handleChange(row.id, { value: e.target.value })}
            />
            {!readOnly && (
              <Tooltip content={t("Remove")}>
                <RemoveButton
                  onClick={() => handleRemove(row.id)}
                  aria-label={t("Remove")}
                >
                  <CloseIcon size={16} />
                </RemoveButton>
              </Tooltip>
            )}
          </PropertyRow>
        ))
      )}

      {!readOnly && (
        <Actions>
          {mode === "list" && (
            <ActionButton type="button" onClick={handleAdd}>
              <PlusIcon size={16} />
              {t("Add property")}
            </ActionButton>
          )}
          <ActionButton type="button" onClick={handleToggleMode}>
            {mode === "list" ? (
              <>
                <CodeIcon size={16} />
                {t("Edit as YAML")}
              </>
            ) : (
              <>
                <BulletedListIcon size={16} />
                {t("Edit as list")}
              </>
            )}
          </ActionButton>
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

const YamlArea = styled.textarea<{ $error?: boolean }>`
  width: 100%;
  min-height: 96px;
  resize: vertical;
  border: 1px solid
    ${(props) => (props.$error ? props.theme.brand.red : props.theme.divider)};
  border-radius: 6px;
  padding: 10px 12px;
  font-family: ${s("fontFamilyMono")};
  font-size: 13px;
  line-height: 1.6;
  background: ${s("codeBackground")};
  color: ${s("text")};
  outline: none;
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
  margin-top: 4px;
  opacity: 0.6;
  transition: opacity 120ms ease;

  ${Wrapper}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
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
