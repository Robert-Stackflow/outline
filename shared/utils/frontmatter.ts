import yaml from "js-yaml";

const FRONTMATTER_REGEX = /^\s*---\n([\s\S]*?)\n---\s*(?:\n|$)/;

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
