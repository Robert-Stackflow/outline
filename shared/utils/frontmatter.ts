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
