import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAccount, type AuthSession } from "../lib/api";
import { useI18n, type TranslationKey } from "../lib/i18n";

const errorMap: Record<string, TranslationKey> = {
  password_mismatch: "auth.register.error.passwordMismatch",
  missing_full_name: "auth.register.error.missingFullName",
  full_name_too_short: "auth.register.error.fullNameTooShort",
  missing_phone: "auth.register.error.missingPhone",
  phone_too_short: "auth.register.error.phoneTooShort",
  missing_email: "auth.register.error.missingEmail",
  invalid_email: "auth.register.error.invalidEmail",
  email_exists: "auth.register.error.emailExists",
  password_too_short: "auth.register.error.passwordTooShort",
  user_exists: "auth.register.error.emailExists",
};

type RegisterPageProps = {
  setSession: (session: AuthSession | null) => void;
};

export function RegisterPage({ setSession }: RegisterPageProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(t("auth.register.creating"));
    try {
      const result = await registerAccount(form);
      if (result.email_verification_required) {
        setSession(null);
        setStatus(t("auth.register.verifyEmailFor", { email: result.email ?? form.email }));
        return;
      }

      if (result.session) {
        setSession(result.session);
        setStatus(t("auth.register.created"));
        navigate("/", { replace: true });
        return;
      }

      setSession(null);
      setStatus(t("auth.register.verifyEmail"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_error";
      if (code === "backend_unavailable") {
        setStatus(t("auth.register.backendUnavailable"));
        return;
      }

      if (code === "verification_email_failed") {
        setStatus(t("auth.register.verificationEmailFailed"));
        return;
      }

      setStatus(errorMap[code] ? t(errorMap[code]) : t("auth.register.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="page-shell auth-shell auth-page">
      <section className="auth-hero">
        <span className="section-kicker">{t("auth.register.kicker")}</span>
        <h1>{t("auth.register.heroTitle")}</h1>
        <p>{t("auth.register.heroBody")}</p>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{t("auth.register.kicker")}</p>
        <section className="soft-card auth-card auth-card--settings auth-panel premium-section-card">
        <div>
          <h2>{t("auth.register.cardTitle")}</h2>
          <p className="lead">{t("auth.register.cardBody")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t("auth.register.name")}</span>
            <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} autoComplete="name" required />
          </label>

          <label className="field">
            <span>{t("auth.register.phone")}</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" required />
          </label>

          <label className="field">
            <span>{t("auth.register.email")}</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required />
          </label>

          <label className="field">
            <span>{t("auth.register.password")}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span>{t("auth.register.repeatPassword")}</span>
            <input
              type="password"
              value={form.password_confirm}
              onChange={(event) => updateField("password_confirm", event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>

        <p className="auth-status">{status}</p>
        <p className="auth-link-row">
          {t("auth.register.hasAccount")} <Link to="/login">{t("auth.login.submit")}</Link>
        </p>
        </section>
      </section>
    </main>
  );
}
