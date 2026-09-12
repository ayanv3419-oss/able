import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { SignOutForm } from "@/components/chat/sign-out-form";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { InstructionsForm } from "@/components/settings/instructions-form";
import { MemoryList } from "@/components/settings/memory-list";
import { PlanStatusSection } from "@/components/settings/plan-status-section";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  getUserSettings,
  listMemories,
} from "@/lib/db/personalization-queries";
import { getEntitlement } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Settings",
};

async function SettingsContent() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [settings, memories, entitlement] = await Promise.all([
    getUserSettings(userId),
    listMemories({ userId }),
    getEntitlement(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-12">
      <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>

      <SettingsSection
        description="Able uses these details only when they help, and never guesses anything you leave blank."
        title="Your profile"
      >
        <ProfileForm profile={settings.profile} />
      </SettingsSection>

      <SettingsSection
        description="Able uses this for every chat, alongside a project's own instructions."
        title="Custom instructions"
      >
        <InstructionsForm settings={settings} />
      </SettingsSection>

      <SettingsSection
        description="Facts Able saved when you asked it to remember something. Project memories are only used inside their project."
        title="Memory"
      >
        <MemoryList initialMemories={memories} />
      </SettingsSection>

      <SettingsSection title="Plan">
        <PlanStatusSection entitlement={entitlement} />
      </SettingsSection>

      <SettingsSection title="Account">
        <div className="flex flex-col items-start gap-3">
          {!session.localPreview && <SignOutForm />}
          <DeleteAccountDialog />
        </div>
      </SettingsSection>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading settings…</p>}>
      <SettingsContent />
    </Suspense>
  );
}
