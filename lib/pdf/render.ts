import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type Browser, chromium } from "playwright-core";
import { escapeHtml, markdownHtml, printCss } from "./html";

const modules = path.join(process.cwd(), "node_modules");
let cssPromise: Promise<string> | undefined;

async function embeddedCss(): Promise<string> {
  const katexDir = path.join(modules, "katex/dist");
  let katex = await readFile(path.join(katexDir, "katex.min.css"), "utf8");
  const fonts = [
    ...new Set(katex.match(/fonts\/[A-Za-z0-9_-]+\.woff2/g) ?? []),
  ];
  const encoded = await Promise.all(
    fonts.map(async (font) => [
      font,
      (await readFile(path.join(katexDir, font))).toString("base64"),
    ])
  );
  for (const [font, data] of encoded) {
    katex = katex.replaceAll(font, `data:font/woff2;base64,${data}`);
  }
  const families = [
    ["Noto Sans", "noto-sans", "latin"],
    ["Noto Devanagari", "noto-sans-devanagari", "devanagari"],
    ["Noto Gujarati", "noto-sans-gujarati", "gujarati"],
  ];
  const faces = await Promise.all(
    families.map(async ([name, pkg, subset]) => {
      const file = path.join(
        modules,
        "@fontsource",
        pkg,
        "files",
        `${pkg}-${subset}-400-normal.woff2`
      );
      return `@font-face { font-family: '${name}'; src: url(data:font/woff2;base64,${(await readFile(file)).toString("base64")}) format('woff2'); font-weight: 400; font-style: normal; }`;
    })
  );
  return `${faces.join("\n")}\n${katex}\n${printCss}`;
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const { default: serverChromium } = await import("@sparticuz/chromium");
    return chromium.launch({
      args: serverChromium.args,
      executablePath: await serverChromium.executablePath(),
      timeout: 20_000,
    });
  }
  return chromium.launch({
    ...(process.env.PDF_CHROMIUM_PATH
      ? { executablePath: process.env.PDF_CHROMIUM_PATH }
      : {}),
    timeout: 20_000,
  });
}

/** Isolated browser: no cookies, file URLs, remote assets or untrusted scripts. */
export async function renderPdf({
  title,
  content,
  signal,
}: {
  title: string;
  content: string;
  signal?: AbortSignal;
}): Promise<Buffer> {
  signal?.throwIfAborted();
  cssPromise ??= embeddedCss().catch((error) => {
    cssPromise = undefined;
    throw error;
  });
  const [html, css] = await Promise.all([markdownHtml(content), cssPromise]);
  let browser: Browser | undefined;
  let timedOut = false;
  const close = () => {
    browser?.close().catch(() => undefined);
  };
  const timer = setTimeout(() => {
    timedOut = true;
    close();
  }, 45_000);
  signal?.addEventListener("abort", close, { once: true });
  try {
    browser = await launchBrowser();
    signal?.throwIfAborted();
    if (timedOut) {
      throw new Error("PDF preparation timed out");
    }
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { height: 1123, width: 794 },
    });
    await context.route("**/*", (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const body = `<div class="brand">ABLE / STUDY NOTES</div><header class="document-title">${escapeHtml(title.slice(0, 300))}</header><main>${html}</main>`;
    await page.setContent(
      `<!doctype html><html><head><meta charset="UTF-8"><title>${escapeHtml(title.slice(0, 300))}</title><style>${css}</style></head><body>${body}</body></html>`,
      { waitUntil: "load" }
    );
    if (await page.locator("code.language-mermaid").count()) {
      await page.addScriptTag({
        path: path.join(modules, "mermaid/dist/mermaid.min.js"),
      });
      await page.evaluate(async () => {
        const { mermaid } = window as unknown as {
          mermaid: {
            initialize: (config: object) => void;
            render: (id: string, source: string) => Promise<{ svg: string }>;
          };
        };
        mermaid.initialize({
          flowchart: { htmlLabels: false },
          htmlLabels: false,
          maxTextSize: 30_000,
          securityLevel: "strict",
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "neutral",
        });
        const diagrams = [
          ...document.querySelectorAll("code.language-mermaid"),
        ];
        // Mermaid has shared internal state; diagrams must render sequentially.
        for (const [index, code] of diagrams.entries()) {
          try {
            if (index >= 20) {
              throw new Error("Too many diagrams");
            }
            // biome-ignore lint/performance/noAwaitInLoops: Mermaid's renderer uses shared state.
            const rendered = await mermaid.render(
              `able-diagram-${index}`,
              code.textContent ?? ""
            );
            const figure = document.createElement("div");
            figure.className = "diagram";
            figure.innerHTML = rendered.svg;
            code.parentElement?.replaceWith(figure);
          } catch {
            const note = document.createElement("p");
            note.className = "diagram-warning";
            note.textContent =
              "This diagram could not be drawn. Its source is included below.";
            code.parentElement?.before(note);
          }
        }
      });
    }
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.emulateMedia({ media: "print" });
    return await page.pdf({
      displayHeaderFooter: true,
      footerTemplate:
        '<div style="font-family:Arial;font-size:9px;color:#71717a;width:100%;padding:0 17mm;display:flex;justify-content:space-between"><span>Able</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      format: "A4",
      headerTemplate: "<span></span>",
      margin: { bottom: "20mm", left: "17mm", right: "17mm", top: "18mm" },
      printBackground: true,
      tagged: true,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", close);
    await browser?.close().catch(() => undefined);
  }
}
