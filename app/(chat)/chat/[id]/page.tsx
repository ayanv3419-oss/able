import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { gateStudent } from "@/lib/access";

/**
 * The chat renders in the layout. A student whose plan ended can still read
 * it; a student who never had a plan or is blocked is sent away.
 */
async function ChatGate() {
  const session = await auth();

  if (session?.user?.id) {
    await gateStudent(session.user.id, "chat");
  }

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatGate />
    </Suspense>
  );
}
