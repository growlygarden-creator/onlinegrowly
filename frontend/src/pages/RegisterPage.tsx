import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAccount, type AuthSession } from "../lib/api";

const errorMap: Record<string, string> = {
  password_mismatch: "Passordene er ikke like.",
  missing_username: "Skriv inn et brukernavn.",
  username_too_short: "Brukernavnet må være minst 3 tegn.",
  missing_full_name: "Skriv inn navn.",
  full_name_too_short: "Navnet må være minst 2 tegn.",
  missing_phone: "Skriv inn telefonnummer.",
  phone_too_short: "Telefonnummeret virker for kort.",
  missing_email: "Skriv inn e-postadresse.",
  invalid_email: "Skriv inn en gyldig e-postadresse.",
  email_exists: "Denne e-postadressen er allerede i bruk.",
  password_too_short: "Passordet må være minst 6 tegn.",
  user_exists: "Dette brukernavnet er allerede i bruk.",
};

type RegisterPageProps = {
  setSession: (session: AuthSession | null) => void;
};

export function RegisterPage({ setSession }: RegisterPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    username: "",
    password: "",
    password_confirm: "",
  });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Oppretter konto...");
    try {
      const session = await registerAccount(form);
      setSession(session);
      setStatus("Konto opprettet.");
      navigate("/", { replace: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_error";
      if (code === "backend_unavailable") {
        setStatus("Backend svarer ikke akkurat nå. Registrering virker når API-et er oppe igjen.");
        return;
      }

      setStatus(errorMap[code] ?? "Kunne ikke opprette konto akkurat nå.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Registrering</p>
        <h1>Lag din Growly-konto.</h1>
        <p className="lead">Denne siden brukes når du deler konto-oppsett direkte med en bruker. Kontoen opprettes her, og brukeren sendes videre inn i appen etterpå.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Navn</span>
            <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} autoComplete="name" required />
          </label>

          <label className="field">
            <span>Telefon</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" required />
          </label>

          <label className="field">
            <span>E-post</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required />
          </label>

          <label className="field">
            <span>Brukernavn</span>
            <input value={form.username} onChange={(event) => updateField("username", event.target.value)} autoComplete="username" required />
          </label>

          <label className="field">
            <span>Passord</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span>Gjenta passord</span>
            <input
              type="password"
              value={form.password_confirm}
              onChange={(event) => updateField("password_confirm", event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Oppretter..." : "Opprett konto"}
          </button>
        </form>

        <p className="helper-text">{status}</p>
      </section>
    </main>
  );
}
