import { useEffect, useState } from "react";

const OAUTH = "https://www.fedpromptly.com/login";
const CLIENT_ID = "fedcenter";
const REDIRECT_URI = "https://fed-os-account-center.fedos.workers.dev/";
const PKCE_KEY = "fedcenter_muse_pkce";
const SESSION_KEY = "fedcenter_muse_session";
const LEGACY_TOKEN_KEY = "fedpromptly_access_token";

type MuseUser = {
  preferred_username?: string;
  email?: string;
};

type MuseSession = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  user: MuseUser;
};

type TokenPair = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

function b64url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

async function challengeOf(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

async function postToken(params: Record<string, string>) {
  const response = await fetch(`${OAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok) throw new Error("Token request failed");
  return (await response.json()) as TokenPair;
}

async function fetchUserinfo(accessToken: string) {
  const response = await fetch(`${OAUTH}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("User info request failed");
  return (await response.json()) as MuseUser;
}

function readSession(): MuseSession | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as MuseSession | null;
  } catch {
    return null;
  }
}

function saveSession(session: MuseSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(LEGACY_TOKEN_KEY, session.access_token);
}

function removeSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

function displayName(user?: MuseUser) {
  return user?.preferred_username || user?.email?.split("@")[0] || "User";
}

interface Props {
  onSignedIn?: (user: MuseUser) => void;
  onSignedOut?: () => void;
  className?: string;
}

export default function MuseLoginButton({ onSignedIn, onSignedOut, className = "primary-button" }: Props) {
  const [session, setSession] = useState<MuseSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function restore() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      if (code || state || error) {
        window.history.replaceState({}, "", window.location.pathname);
        if (error) {
          setMessage(`Muse sign-in did not complete: ${error}`);
          return;
        }

        let stored: { verifier: string; state: string } | null = null;
        try {
          stored = JSON.parse(sessionStorage.getItem(PKCE_KEY) || "null") as { verifier: string; state: string } | null;
          sessionStorage.removeItem(PKCE_KEY);
        } catch {
          stored = null;
        }
        if (!stored || stored.state !== state || !code) {
          setMessage("Muse sign-in expired. Please try again in this tab.");
          return;
        }

        setBusy(true);
        try {
          const pair = await postToken({
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: stored.verifier,
            client_id: CLIENT_ID,
          });
          const user = await fetchUserinfo(pair.access_token);
          const next: MuseSession = {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token || null,
            expires_at: Date.now() + (pair.expires_in || 3600) * 1000,
            user,
          };
          saveSession(next);
          if (active) {
            setSession(next);
            setMessage(`Signed in with Muse as ${displayName(user)}.`);
            onSignedIn?.(user);
          }
        } catch {
          if (active) setMessage("Muse sign-in failed. Please try again.");
        } finally {
          if (active) setBusy(false);
        }
        return;
      }

      const existing = readSession();
      if (!existing) return;
      if (existing.expires_at && Date.now() > existing.expires_at - 60_000) {
        if (!existing.refresh_token) {
          removeSession();
          return;
        }
        try {
          const pair = await postToken({
            grant_type: "refresh_token",
            refresh_token: existing.refresh_token,
            client_id: CLIENT_ID,
          });
          const user = await fetchUserinfo(pair.access_token);
          const next: MuseSession = {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token || existing.refresh_token,
            expires_at: Date.now() + (pair.expires_in || 3600) * 1000,
            user,
          };
          saveSession(next);
          if (active) {
            setSession(next);
            onSignedIn?.(user);
          }
        } catch {
          removeSession();
        }
        return;
      }

      saveSession(existing);
      if (active) {
        setSession(existing);
        onSignedIn?.(existing.user);
      }
    }

    void restore();
    return () => { active = false; };
  }, [onSignedIn]);

  async function startLogin() {
    setBusy(true);
    setMessage("");
    const verifier = randomString(48);
    const state = randomString(24);
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));
    const challenge = await challengeOf(verifier);
    const url = new URL(`${OAUTH}/oauth/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", "openid");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    window.location.href = url.toString();
  }

  function signOut() {
    removeSession();
    setSession(null);
    setMessage("Muse was signed out in this browser.");
    onSignedOut?.();
  }

  return (
    <div className="muse-login-control">
      <button type="button" className={className} onClick={session ? signOut : () => void startLogin()} disabled={busy}>
        {busy ? "Connecting…" : session ? `Sign out ${displayName(session.user)}` : "Sign in with Muse"}
      </button>
      {message && <span className="muse-login-message" role="status">{message}</span>}
    </div>
  );
}
