"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { TabBar } from "@/components/shell/tab-bar";
import { IncomingWatcher } from "@/components/move/incoming-watcher";
import { Button } from "@/components/ui/button";
import { LoadingAnnouncement, Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useBootstrap } from "@/lib/client/hooks";
import { t } from "@/i18n";

/**
 * Signed-in area with the bottom tab bar. Loads state once; signed-out
 * people are sent to Log in (by the API client) and people who haven't
 * finished their profile go to onboarding.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { state, error, retry } = useBootstrap();
  const router = useRouter();
  const needsOnboarding = state && !state.user.profile.onboarded;

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  let body: ReactNode;
  if (error && !state) {
    body = (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-body">{error.message}</p>
        <Button onClick={retry}>{t("app.retry")}</Button>
      </div>
    );
  } else if (!state || needsOnboarding) {
    body = (
      <div className="flex-1 space-y-4 overflow-hidden p-4 pt-6">
        <LoadingAnnouncement label={t("app.loading")} />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard lines={2} />
      </div>
    );
  } else {
    body = children;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      {state && !needsOnboarding && <IncomingWatcher />}
      <TabBar />
    </>
  );
}
