import { Screen } from "@/components/shell/screen";
import { AuthForm } from "@/components/auth/auth-form";
import { t } from "@/i18n";

export default function SignupPage() {
  return (
    <Screen title={t("signup.title")} back="/">
      <p className="mb-5 text-body text-muted-foreground">{t("signup.sub")}</p>
      <AuthForm mode="signup" />
    </Screen>
  );
}
