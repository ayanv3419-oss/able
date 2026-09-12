import { randomUUID } from "node:crypto";
import postgres from "postgres";

function connect() {
  const url = process.env.TEST_POSTGRES_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("Project fixtures require the isolated test database.");
  }
  return postgres(url, { max: 1 });
}

export async function seedProjectNavigation(email: string) {
  const sql = connect();
  try {
    const [student] = await sql`SELECT id FROM "User" WHERE email = ${email}`;
    const projectId = randomUUID();
    const emptyId = randomUUID();
    const chatId = randomUUID();
    const outsideChatId = randomUUID();
    const name = `Biology ${projectId.slice(0, 8)}`;
    const emptyName = `Chemistry ${emptyId.slice(0, 8)}`;
    await sql`INSERT INTO "Project" (id,"userId",name,instructions) VALUES (${projectId},${student.id},${name},'Use SI units.'),(${emptyId},${student.id},${emptyName},NULL)`;
    await sql`INSERT INTO "Chat" (id,"userId","projectId",title,"createdAt") VALUES (${chatId},${student.id},${projectId},'Cell division notes','2026-09-10T10:00:00Z'),(${outsideChatId},${student.id},NULL,'Unfiled notes',now())`;
    const parts = sql.json([
      { text: "These are my saved cell division notes.", type: "text" },
    ]);
    await sql`INSERT INTO "Message_v2" (id,"chatId",role,parts,attachments,"createdAt") VALUES (${randomUUID()},${chatId},'user',${parts},'[]'::json,now())`;
    return { chatId, emptyId, emptyName, name, outsideChatId, projectId };
  } finally {
    await sql.end();
  }
}

export async function projectChatIds(projectId: string) {
  const sql = connect();
  try {
    const rows =
      await sql`SELECT id FROM "Chat" WHERE "projectId"=${projectId} ORDER BY id`;
    return rows.map((row) => row.id as string);
  } finally {
    await sql.end();
  }
}
