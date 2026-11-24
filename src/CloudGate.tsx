import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  activateCloud, clearCloudSession, cloudEnabled, cloudLogin, cloudMeta,
  cloudRegister, loadCloudSession,
} from "./cloud";
import { useApp } from "./store";

const fr = (navigator.language || "").toLowerCase().startsWith("fr");
const text = fr
  ? {
      title: "Ton compte Studigo", lead: "Connecte-toi pour retrouver ton espace d'étude. L'accès à l'IA est déjà géré par l'administration.",
      email: "Adresse email", password: "Mot de passe", name: "Prénom", login: "Se connecter",
      register: "Créer un compte", needAccount: "Pas encore de compte ?", haveAccount: "Déjà un compte ?",
      signIn: "Se connecter", signUp: "Créer un compte", close: "La création de compte est fermée. Demande un compte à l'administrateur.",
      loading: "Connexion à ton compte", failed: "La connexion a échoué.",
    }
  : {
      title: "Your Studigo account", lead: "Sign in to continue studying. AI access is already managed for you.",
      email: "Email address", password: "Password", name: "First name", login: "Sign in",
      register: "Create account", needAccount: "No account yet?", haveAccount: "Already have an account?",
      signIn: "Sign in", signUp: "Create account", close: "Account creation is closed. Ask the administrator for an account.",
      loading: "Connecting to your account", failed: "Sign-in failed.",
    };

export function CloudGate({ children }: { children: ReactNode }) {
  const { setAi } = useApp();
  const [ready, setReady] = useState(!cloudEnabled);
  const [loading, setLoading] = useState(cloudEnabled);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registration, setRegistration] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) return;
    let live = true;
    (async () => {
      const saved = loadCloudSession();
      if (saved) {
        try {
          const cfg = await activateCloud(saved);
          await setAi(cfg);
          if (live) { setReady(true); setLoading(false); }
          return;
        } catch {
          clearCloudSession();
        }
      }
      const meta = await cloudMeta().catch(() => ({ registrationEnabled: false }));
      if (!live) return;
      setRegistration(meta.registrationEnabled);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = mode === "register"
        ? await cloudRegister(name.trim(), email.trim(), password)
        : await cloudLogin(email.trim(), password);
      const cfg = await activateCloud(session);
      await setAi(cfg);
      setReady(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.failed);
    } finally {
      setBusy(false);
    }
  };

  if (!cloudEnabled) return <>{children}</>;
  if (ready) return <>{children}</>;
  if (loading) {
    return (
      <div className="cloud-gate">
        <div className="cloud-card cloud-loading" role="status">
          <span className="cloud-mark" aria-hidden="true">S</span>
          <span>{text.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cloud-gate">
      <form className="cloud-card" onSubmit={submit}>
        <div className="cloud-brand">
          <span className="cloud-mark" aria-hidden="true">S</span>
          <span>
            <b>Studigo</b>
            <small>{fr ? "Compte" : "Account"}</small>
          </span>
        </div>
        <h1>{text.title}</h1>
        <p className="cloud-lead">{text.lead}</p>

        {error && <div className="cloud-error" role="alert">{error}</div>}

        {mode === "register" && (
          <label className="cloud-field">
            <span>{text.name}</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="given-name" />
          </label>
        )}
        <label className="cloud-field">
          <span>{text.email}</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" autoFocus />
        </label>
        <label className="cloud-field">
          <span>{text.password}</span>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} />
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? "…" : mode === "register" ? text.register : text.login}
        </button>

        {registration ? (
          <button className="cloud-switch" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? text.needAccount : text.haveAccount} <b>{mode === "login" ? text.register : text.signIn}</b>
          </button>
        ) : (
          <p className="cloud-note">{text.close}</p>
        )}
      </form>
    </div>
  );
}
