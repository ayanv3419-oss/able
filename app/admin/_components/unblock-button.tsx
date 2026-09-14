import { unblockStudentAction } from "@/app/admin/payments/actions";
import { Button } from "@/components/ui/button";

/** Lifts the block a rejected request put on a student. */
export function UnblockButton({ userId }: { userId: string }) {
  return (
    <form action={unblockStudentAction}>
      <input name="userId" type="hidden" value={userId} />
      <Button size="sm" type="submit" variant="outline">
        Unblock
      </Button>
    </form>
  );
}
