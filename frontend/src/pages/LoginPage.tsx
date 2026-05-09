import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, type AuthSession } from "../lib/api";
import { useI18n } from "../lib/i18n";

type LoginPageProps = {
  setSession: (session: AuthSession | null) => void;
};

export function LoginPage({ setSession }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const locationState = location.state as { registrationSuccess?: boolean; emailVerificationRequired?: boolean; username?: string } | null;
  const [username, setUsername] = useState(locationState?.username ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(
    locationState?.emailVerificationRequired
      ? t("auth.login.verifyEmail")
      : locationState?.registrationSuccess ? t("auth.login.successRegistration") : "",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(t("auth.login.signingIn"));
    try {
      const session = await login(username.trim(), password);
      setSession(session);
      setStatus(t("auth.login.success"));
      navigate("/");
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_error";
      if (code === "invalid_credentials") {
        setStatus(t("auth.login.invalid"));
        return;
      }

      if (code === "admin_web_only") {
        setStatus(t("auth.login.adminWebOnly"));
        return;
      }

      if (code === "email_not_verified") {
        setStatus(t("auth.login.emailNotVerified"));
        return;
      }

      if (code === "backend_unavailable") {
        setStatus(t("auth.login.backendUnavailable"));
        return;
      }

      setStatus(t("auth.login.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-shell auth-page">
      <section className="auth-hero">
        <span className="section-kicker">Growly Garden</span>
        <h1>{t("auth.login.heroTitle")}</h1>
        <p>{t("auth.login.heroBody")}</p>
      </section>

      <section className="settings-section">
        <p className="section-kicker">{t("auth.login.account")}</p>
        <section className="soft-card auth-card auth-card--settings auth-panel premium-section-card">
        <div>
          <h2>Growly Garden</h2>
          <p className="lead">{t("auth.login.cardBody")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t("auth.login.email")}</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="field">
            <span>{t("auth.login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? t("auth.login.signingIn") : t("auth.login.submit")}
          </button>
        </form>

        <p className="auth-status">{status}</p>
        <p className="auth-link-row">
          {t("auth.login.noAccount")} <Link to="/register">{t("auth.login.createAccount")}</Link>
        </p>
        </section>
      </section>
    </main>
  );
}
