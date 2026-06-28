import yaml from "js-yaml";
import type { ProsemirrorData } from "../types";

const FRONTMATTER_REGEX = /^\s*---\n([\s\S]*?)\n---\s*(?:\n|$)/;

export interface ExtractedFrontmatter {
  /** The parsed frontmatter properties. */
  properties: Record<string, unknown>;
  /** The markdown content without the leading frontmatter block. */
  body: string;
}

export interface ExtractedProsemirrorFrontmatter {
  /** The parsed frontmatter properties. */
  properties: Record<string, unknown>;
  /** The ProseMirror document without the leading frontmatter block. */
  body: ProsemirrorData;
}

/**
 * Parses a leading YAML frontmatter block from a markdown string into a plain
 * object of properties. Mirrors the frontmatter syntax recognized elsewhere in
 * the editor (a `---` fenced block at the very start of the document).
 *
 * @param markdown The markdown source to parse.
 * @returns A record of parsed properties, or null if no valid frontmatter was found.
 */
export function parseFrontmatter(
  markdown: string
): Record<string, unknown> | null {
  const match = markdown.match(FRONTMATTER_REGEX);
  if (!match) {
    return null;
  }

  if (!match[1].trim()) {
    return {};
  }

  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (_err) {
    return null;
  }

  return null;
}

/**
 * Extracts valid leading YAML frontmatter and returns the remaining markdown.
 *
 * @param markdown The markdown source to inspect.
 * @returns Parsed properties and body, or null if no valid frontmatter exists.
 */
export function extractFrontmatter(
  markdown: string
): ExtractedFrontmatter | null {
  const match = markdown.match(FRONTMATTER_REGEX);
  if (!match) {
    return null;
  }

  const properties = parseFrontmatter(markdown);
  if (!properties) {
    return null;
  }

  return {
    properties,
    body: markdown.slice(match[0].length),
  };
}

/**
 * Extracts a legacy leading YAML code block from ProseMirror document data.
 *
 * @param data The ProseMirror document data to inspect.
 * @returns Parsed properties and document data without the code block.
 */
export function extractProsemirrorFrontmatter(
  data: ProsemirrorData
): ExtractedProsemirrorFrontmatter | null {
  if (data.type !== "doc" || !data.content?.length) {
    return null;
  }

  const [firstNode, ...remainingContent] = data.content;
  if (!isYamlCodeBlock(firstNode)) {
    return null;
  }

  const properties = yamlToObject(getTextContent(firstNode));
  if (properties === null) {
    return null;
  }

  return {
    properties,
    body: {
      ...data,
      content: remainingContent.length
        ? remainingContent
        : [{ type: "paragraph" }],
    },
  };
}

function getTextContent(node: ProsemirrorData): string {
  if (node.text) {
    return node.text;
  }
  return node.content?.map(getTextContent).join("") ?? "";
}

function isYamlCodeBlock(node: ProsemirrorData): boolean {
  if (node.type !== "code_fence" && node.type !== "code_block") {
    return false;
  }

  const language = node.attrs?.language;
  if (typeof language !== "string") {
    return false;
  }

  return ["yaml", "yml"].includes(language.trim().toLowerCase());
}

/**
 * Formats a property value for display in an input field. Arrays are joined with
 * commas; objects are JSON-encoded; everything else is stringified.
 *
 * @param value The property value to format.
 * @returns A string representation suitable for editing.
 */
export function stringifyPropertyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Serializes a properties object to a YAML document for the frontmatter editor.
 *
 * @param obj The properties to serialize.
 * @returns A YAML string (empty string when there are no properties).
 */
export function objectToYaml(obj: Record<string, unknown>): string {
  if (!obj || Object.keys(obj).length === 0) {
    return "";
  }
  try {
    return yaml.dump(obj, { lineWidth: -1 }).trimEnd();
  } catch (_err) {
    return "";
  }
}

/**
 * Parses a YAML document (the body of a frontmatter block) into a properties
 * object.
 *
 * @param text The YAML source.
 * @returns The parsed object, or null if the YAML is invalid or not a mapping.
 */
export function yamlToObject(text: string): Record<string, unknown> | null {
  if (!text.trim()) {
    return {};
  }
  try {
    const parsed = yaml.load(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (_err) {
    return null;
  }
}
