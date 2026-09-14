import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { gateStudent } from "@/lib/access";

/**
 * The chat itself renders in the layout. This page only sends a student
 * without an active plan to the plan page, the waiting screen or the blocked
 * screen, per the owner's payment board.
 */
async function HomeGate() {
  const session = await auth();

  if (session?.user?.id) {
    await gateStudent(session.user.id, "home");
  }

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeGate />
    </Suspense>
  );
}
