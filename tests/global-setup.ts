import { type FullConfig, request } from "@playwright/test";

/** Compile API routes before timed assertions. Production routes are prebuilt. */
export default async function warmTestRoutes(config: FullConfig) {
  const context = await request.newContext({
    baseURL: config.projects[0].use.baseURL,
    timeout: 180_000,
  });
  try {
    const chat = await context.post("/api/chat", { data: {} });
    if (chat.status() !== 401) {
      throw new Error(`Chat route failed to start (${chat.status()}).`);
    }
    const pdf = await context.post("/api/pdf", { data: {} });
    if (pdf.status() !== 401) {
      throw new Error(`PDF route failed to start (${pdf.status()}).`);
    }
  } finally {
    await context.dispose();
  }
}
