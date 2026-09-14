import { seedUploadsToday } from "../db";
import { expect, test } from "../fixtures";

const NOTES = {
  buffer: Buffer.from("Cell division notes for revision."),
  mimeType: "text/plain",
  name: "notes.txt",
};

test("a Plus student can upload 20 files a day and then learns when the cap resets", async ({
  page,
  studentEmail,
}) => {
  // The fixture student is on Plus, whose cap is 20 uploads a day.
  await seedUploadsToday(studentEmail, 19);

  const twentieth = await page.request.post("/api/files/upload", {
    multipart: { file: NOTES },
  });
  expect(twentieth.status()).toBe(200);

  const blocked = await page.request.post("/api/files/upload", {
    multipart: { file: NOTES },
  });
  expect(blocked.status()).toBe(429);
  expect((await blocked.json()).error).toBe(
    "You've used today's 20 uploads. They reset at midnight India time."
  );
});

test("simultaneous uploads cannot consume the same remaining slot", async ({
  page,
  studentEmail,
}) => {
  await seedUploadsToday(studentEmail, 19);
  const responses = await Promise.all(
    Array.from({ length: 4 }, () =>
      page.request.post("/api/files/upload", { multipart: { file: NOTES } })
    )
  );
  expect(responses.map((response) => response.status()).sort()).toEqual([
    200, 429, 429, 429,
  ]);
});
