import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Logger inn...");
    try {
      await login(username, password);
      setStatus("Innlogging vellykket.");
      navigate("/");
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_error";
      setStatus(code === "invalid_credentials" ? "Feil brukernavn eller passord." : "Kunne ikke logge inn.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Innlogging</p>
        <h1>Logg inn i Growly Garden.</h1>
        <p className="lead">Denne flyten bruker nå frontend-appen direkte, men autentiserer fortsatt mot FastAPI-backenden.</p>

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

        <p className="helper-text">{status}</p>
      </section>
    </main>
  );
}
