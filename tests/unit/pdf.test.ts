import { mkdir, writeFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { answerMarkdown, pdfFilename } from "@/lib/pdf/content";
import { markdownHtml } from "@/lib/pdf/html";
import { renderPdf } from "@/lib/pdf/render";

export const sampleNotes = `# Cell division

A clear explanation with a searchable answer and a [reference](https://example.com/biology).

## Comparison

| Process | Result |
| --- | --- |
| Mitosis | Two identical cells |
| Meiosis | Four different cells |

## Maths

The famous equation is $E = mc^2$.

$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Process diagram

\`\`\`mermaid
flowchart LR
  A[Parent cell] --> B[DNA replication]
  B --> C[Two daughter cells]
\`\`\`

## Code

\`\`\`python
def daughter_cells(parents):
    return parents * 2
\`\`\`

## Languages

हिंदी: कोशिका विभाजन

ગુજરાતી: કોષ વિભાજન
`;

describe("PDF exports", () => {
  it("excludes reasoning and tool inputs while preserving text and sources", () => {
    const result = answerMarkdown([
      { text: "Visible answer", type: "text" },
      { text: "private reasoning", type: "reasoning" },
      { input: "private input", type: "tool-saveMemory" },
      { title: "Source", type: "source-url", url: "https://example.com" },
      { type: "source-url", url: "javascript:alert(1)" },
    ]);
    expect(result).toContain("Visible answer");
    expect(result).toContain("https://example.com/");
    expect(result).not.toContain("private");
    expect(result).not.toContain("javascript:");
    expect(answerMarkdown("malformed stored JSON")).toBe("");
    expect(pdfFilename('..\\a"\r\nreport')).toBe("a-report.pdf");
  });
  it("strips active HTML and remote images and blocks unsafe links", async () => {
    const html = await markdownHtml(
      'Hello\n\n<script>alert(1)</script>\n\n![x](http://127.0.0.1/private)\n\n[click](javascript:alert%281%29)\n\n<iframe src="file:///secret"></iframe>'
    );
    expect(html).toContain("Hello");
    expect(html).not.toMatch(
      /<script|<iframe|<img|href="javascript|127\.0\.0\.1/
    );
  });
  it("prints a real PDF with text, a table, maths and a rendered diagram", async () => {
    const bytes = await renderPdf({
      content: sampleNotes,
      title: "Biology revision",
    });
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    await mkdir("test-results/pdf", { recursive: true });
    await writeFile("test-results/pdf/biology-revision.pdf", bytes);
    const document = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(document, { mergePages: true });
    expect(text).toContain("Biology revision");
    expect(text).toContain("Mitosis");
    expect(text).toMatch(/daughter\s+cells/i);
    expect(text).not.toContain("flowchart LR");
    expect(text).not.toContain("could not be drawn");
    await mkdir("test-results/pdf", { recursive: true });
    await writeFile("test-results/pdf/biology-revision.pdf", bytes);
  }, 60_000);
});
