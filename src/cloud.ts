// Browser account session. Users never see the gateway token: it is exchanged
// for their email/password, stored on this origin, and used by the AI provider.
import { setKey, type AiConfig } from "./ai";

const rawApi = (import.meta.env.VITE_CLOUD_API as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
const project = (import.meta.env.VITE_PROJECT as string | undefined) || "studigo";
const STORE = "studigo.cloud.session";

export const cloudEnabled = import.meta.env.VITE_WEB === "1" && !!rawApi;
export const cloudApi = rawApi;

export type CloudSession = {
  token: string;
  userId: string;
  name: string;
  email: string;
  project: string;
};

type ApiUser = { id: string; name: string; email: string };

function save(session: CloudSession) {
  localStorage.setItem(STORE, JSON.stringify(session));
}

export function loadCloudSession(): CloudSession | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const value = JSON.parse(raw) as CloudSession;
    return value.token && value.email ? value : null;
  } catch {
    return null;
  }
}

export function clearCloudSession() {
  localStorage.removeItem(STORE);
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: { message?: string } };
    return data.error?.message ?? `The server returned HTTP ${response.status}.`;
  } catch {
    return `The server returned HTTP ${response.status}.`;
  }
}

async function enter(path: string, body: Record<string, string>): Promise<CloudSession> {
  const response = await fetch(`${cloudApi}/app/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, project }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json() as { token: string; project: string; user: ApiUser };
  const session: CloudSession = {
    token: data.token,
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    project: data.project,
  };
  save(session);
  return session;
}

export const cloudLogin = (email: string, password: string) => enter("login", { email, password });
export const cloudRegister = (name: string, email: string, password: string) => enter("register", { name, email, password });

export async function cloudMeta(): Promise<{ registrationEnabled: boolean }> {
  const response = await fetch(`${cloudApi}/meta`);
  if (!response.ok) return { registrationEnabled: false };
  const data = await response.json() as { registrationEnabled?: boolean };
  return { registrationEnabled: data.registrationEnabled === true };
}

/** Checks the session and stores its token for the hidden provider. */
export async function activateCloud(session: CloudSession): Promise<AiConfig> {
  const response = await fetch(`${cloudApi}/app/me`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!response.ok) throw new Error("The account session has expired.");
  await setKey("nestor", session.token);
  return { provider: "nestor", baseURL: `${cloudApi}/ai/v1`, model: "deepseek-chat" };
}

export async function cloudLogout(): Promise<void> {
  const session = loadCloudSession();
  clearCloudSession();
  if (!session) return;
  try {
    await fetch(`${cloudApi}/app/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    });
  } catch {
    // Local sign-out is enough when the server is unreachable.
  }
}
