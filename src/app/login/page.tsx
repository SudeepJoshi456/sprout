import { Screen } from "@/components/shell/screen";
import { AuthForm } from "@/components/auth/auth-form";
import { t } from "@/i18n";

export default function LoginPage() {
  return (
    <Screen title={t("login.title")} back="/">
      <p className="mb-5 text-body text-muted-foreground">{t("login.sub")}</p>
      <AuthForm mode="login" />
    </Screen>
  );
}
