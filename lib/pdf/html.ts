import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Raw HTML is discarded. Remote images are omitted; links allow HTTP(S) only. */
function safeElements() {
  type Node = {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: Node[];
  };
  function walk(node: Node) {
    if (!node.children) {
      return;
    }
    node.children = node.children.filter((child) => child.tagName !== "img");
    for (const child of node.children) {
      if (child.tagName === "a" && child.properties) {
        const href = String(child.properties.href ?? "");
        if (!/^https?:\/\//i.test(href)) {
          child.properties.href = undefined;
        }
      }
      walk(child);
    }
  }
  return walk;
}

export async function markdownHtml(content: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(safeElements)
    .use(rehypeKatex, { strict: "ignore", trust: false })
    .use(rehypeStringify)
    .process(content);
  return String(file);
}

export const printCss = `
* { box-sizing: border-box; }
html { color-scheme: light; }
body { margin: 0; color: #20252d; font-family: 'Noto Sans', 'Noto Devanagari', 'Noto Gujarati', sans-serif; font-size: 10.5pt; line-height: 1.6; overflow-wrap: anywhere; }
.brand { font-size: 9pt; letter-spacing: .18em; font-weight: 700; color: #58616e; border-bottom: 1px solid #dce1e7; padding-bottom: 10px; margin-bottom: 24px; }
.document-title { font-size: 25pt; line-height: 1.2; font-weight: 700; margin: 0 0 24px; letter-spacing: -.025em; }
h1 { font-size: 21pt; } h2 { font-size: 16pt; border-bottom: 1px solid #e4e7eb; padding-bottom: 5px; } h3 { font-size: 12pt; }
h1,h2,h3,h4 { line-height: 1.35; margin: 24px 0 9px; break-after: avoid; }
p { margin: 9px 0; orphans: 3; widows: 3; }
a { color: #24599a; text-decoration: underline; }
ul,ol { padding-left: 24px; } li { margin: 4px 0; }
blockquote { margin: 16px 0; padding: 2px 16px; border-left: 3px solid #b7c5d8; color: #475569; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9pt; table-layout: fixed; }
thead { display: table-header-group; } tr { break-inside: avoid; }
th,td { border: 1px solid #d8dee6; text-align: left; padding: 7px 9px; vertical-align: top; }
th { background: #edf1f6; font-weight: 700; }
pre { background: #f3f5f8; border: 1px solid #e0e5eb; border-radius: 5px; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 8.5pt; line-height: 1.5; }
code { font-family: Consolas, 'Liberation Mono', monospace; font-size: .88em; }
:not(pre)>code { padding: 1px 3px; background: #f0f2f5; }
.katex-display { margin: 16px 0; overflow: visible; break-inside: avoid; }
.diagram { text-align: center; margin: 20px 0; break-inside: avoid; }
.diagram svg { max-width: 100%; height: auto; max-height: 850px; }
.diagram-warning { color: #6b7280; font-size: 9pt; }
hr { border: 0; border-top: 1px solid #dce1e7; margin: 22px 0; }
`;
