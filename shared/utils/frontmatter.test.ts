import { extractProsemirrorFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  describe("extractProsemirrorFrontmatter", () => {
    it("extracts a leading legacy YAML code block into properties", () => {
      const result = extractProsemirrorFrontmatter({
        type: "doc",
        content: [
          {
            type: "code_fence",
            attrs: {
              language: "yaml",
            },
            content: [
              {
                type: "text",
                text: "status: draft\ntags:\n  - outline",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Body",
              },
            ],
          },
        ],
      });

      expect(result).toEqual({
        properties: {
          status: "draft",
          tags: ["outline"],
        },
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Body",
                },
              ],
            },
          ],
        },
      });
    });

    it("leaves non-leading YAML code blocks as document content", () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Intro",
              },
            ],
          },
          {
            type: "code_fence",
            attrs: {
              language: "yaml",
            },
            content: [
              {
                type: "text",
                text: "status: draft",
              },
            ],
          },
        ],
      };

      expect(extractProsemirrorFrontmatter(data)).toBeNull();
    });
  });
});
