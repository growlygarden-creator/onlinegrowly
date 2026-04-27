import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, type AuthSession } from "../lib/api";

type LoginPageProps = {
  setSession: (session: AuthSession | null) => void;
};

export function LoginPage({ setSession }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { registrationSuccess?: boolean; username?: string } | null;
  const [username, setUsername] = useState(locationState?.username ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(
    locationState?.registrationSuccess ? "Konto opprettet. Logg inn for å fortsette." : "",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Logger inn...");
    try {
      const session = await login(username, password);
      setSession(session);
      setStatus("Innlogging vellykket.");
      navigate("/");
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_error";
      if (code === "invalid_credentials") {
        setStatus("Feil brukernavn eller passord.");
        return;
      }

      if (code === "admin_web_only") {
        setStatus("Admin-kontoen brukes i Growly Management på web.");
        return;
      }

      if (code === "backend_unavailable") {
        setStatus("Backend svarer ikke akkurat nå. Du kan fortsatt teste app-designet i simulatoren.");
        return;
      }

      setStatus("Kunne ikke logge inn.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-shell auth-page">
      <section className="auth-hero">
        <span className="section-kicker">Growly Garden</span>
        <h1>Velkommen tilbake</h1>
        <p>Logg inn for å åpne drivhuset ditt og se statusen på ett sted.</p>
      </section>

      <section className="settings-section">
        <p className="section-kicker">Konto</p>
        <section className="soft-card auth-card auth-card--settings auth-panel premium-section-card">
        <div>
          <h2>Growly Garden</h2>
          <p className="lead">Bruk kontoen din for å åpne drivhuset.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Brukernavn</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          </label>

          <label className="field">
            <span>Passord</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Logger inn..." : "Logg inn"}
          </button>
        </form>

        <p className="auth-status">{status}</p>
        <p className="auth-link-row">
          Har du ikke konto ennå? <a href="/register">Opprett konto</a>
        </p>
        </section>
      </section>
    </main>
  );
}
