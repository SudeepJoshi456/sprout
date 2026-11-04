import { Sprout } from "lucide-react";
import { Screen } from "./screen";
import { ButtonLink } from "@/components/ui/button";

/** Temporary screen for sections still being built, so no tab ever 404s. */
export function ComingSoon({ title, body, back }: { title: string; body: string; back?: boolean }) {
  return (
    <Screen title={title} back={back}>
      <div className="flex flex-col items-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Sprout className="size-8" aria-hidden />
        </span>
        <p className="mt-4 text-title font-semibold">Growing soon</p>
        <p className="mt-1 max-w-xs text-body text-muted-foreground">{body}</p>
        <ButtonLink href="/move" variant="secondary" className="mt-6">
          Try Move money
        </ButtonLink>
      </div>
    </Screen>
  );
}
