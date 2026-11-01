import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Globe,
  Heart,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import FedOsFooter from "@/components/FedOsFooter";
import SupportPayments from "@/components/SupportPayments";

type ConnectionState = "checking" | "connected" | "disconnected" | "inactive" | "error";
type DialogKind = "edit" | "disconnect" | "replace" | "backup" | null;

const LOGIN_URL = "https://www.fedpromptly.com/login";
const PROFILE_URL = "https://museai-oauth2.fedos.workers.dev/login/oauth/profile";

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M19.95 7.25c-6.95 0-12.6 5.64-12.6 12.6 0 5.1 3.04 9.48 7.42 11.46-.44-2.45.17-4.43 1.6-6.8 1.64-2.7 3.6-4.2 3.6-7.43 0-3.04-2.02-5.62-5.02-6.3 1.46-.97 3.2-1.54 5.08-1.54 5.25 0 9.5 4.25 9.5 9.5 0 3.05-1.44 5.76-3.68 7.5 5.93-.47 10.6-5.42 10.6-11.47 0-6.36-5.15-11.52-11.5-11.52Z"
        fill="url(#fp-mark)"
      />
      <path
        d="M20.02 13.32c2.83 1.48 4.63 4.45 4.63 7.8 0 4.74-3.84 8.58-8.58 8.58-.36 0-.72-.02-1.07-.07 1.47 2.18 3.97 3.62 6.8 3.62 4.53 0 8.2-3.67 8.2-8.2 0-4.17-3.11-7.61-7.15-8.12a9.9 9.9 0 0 0-2.83-3.61Z"
        fill="#28B58A"
      />
      <defs>
        <linearGradient id="fp-mark" x1="7.35" y1="7.25" x2="34.2" y2="30.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3182F6" />
          <stop offset="1" stopColor="#16A9B6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StatusPill({ state }: { state: ConnectionState }) {
  const labels: Record<ConnectionState, string> = {
    checking: "Checking",
    connected: "Connected",
    disconnected: "Not connected",
    inactive: "Reconnect needed",
    error: "Unavailable",
  };
  return (
    <span className={`status-pill status-${state}`}>
      <span className="status-dot" aria-hidden="true" />
      {labels[state]}
    </span>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Home() {
  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const [retryCount, setRetryCount] = useState(0);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [feedback, setFeedback] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem("fedpromptly_access_token");
    } catch {
      setConnection("error");
      return;
    }
    if (!token) {
      setConnection("disconnected");
      return;
    }

    const controller = new AbortController();
    setConnection("checking");
    fetch(PROFILE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          setConnection("inactive");
          return;
        }
        if (!response.ok) throw new Error("Muse profile could not be reached.");
        const profile = await response.json();
        if (!profile || profile.error) throw new Error("Muse profile could not be verified.");
        // A successful response confirms the connection. Profile fields are deliberately
        // not retained or rendered while Muse is active.
        setConnection("connected");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConnection("error");
      });
    return () => controller.abort();
  }, [retryCount]);

  useEffect(() => {
    if (!dialog) {
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener) window.requestAnimationFrame(() => opener.focus());
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsOutside = !dialogRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog]);

  function openDialog(kind: Exclude<DialogKind, null>, opener: HTMLElement) {
    openerRef.current = opener;
    setDialog(kind);
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialog(null);
    setFeedback("Your draft is only in this preview. No profile changes were sent to or saved by your account.");
  }

  function disconnectThisBrowser() {
    try {
      sessionStorage.removeItem("fedpromptly_access_token");
      setConnection("disconnected");
      setFeedback("Muse was disconnected from this browser session. This did not revoke access with Muse or delete either account.");
    } catch {
      setFeedback("This browser could not clear the saved Muse session. No account changes were made.");
    }
    setDialog(null);
  }

  const currentStatusText = connection === "connected"
    ? "Your active Muse supplies your personal profile information."
    : connection === "checking"
      ? "Checking your Muse connection…"
      : connection === "inactive"
        ? "Your Muse session needs attention. Your FedPromptly account remains yours."
        : connection === "error"
          ? "We couldn’t verify Muse right now. Your FedPromptly account is not affected."
          : "Connect Muse to see your account connection here.";

  return (
    <div className="center-app">
      <a className="skip-link" href="#main-content">Skip to account settings</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="FedPromptly Center home">
          <BrandMark className="brand-mark" />
          <span className="brand-name">FedPromptly <span>Center</span></span>
        </a>
        <div className="topbar-right">
          <a className="help-link" href="#help"><CircleHelp size={17} /> <span>Help</span></a>
          <span className="topbar-divider" aria-hidden="true" />
          <div className="account-chip">
            <span className="mini-avatar"><UserRound size={16} /></span>
            <span>{connection === "connected" ? "Your account" : "Guest view"}</span>
          </div>
        </div>
      </header>

      <div className="page-layout" id="top">
        <aside className="sidebar" aria-label="Account center navigation">
          <div className="sidebar-heading">ACCOUNT CENTER</div>
          <nav className="side-nav">
            <a className="nav-item nav-item-active" href="#overview"><UserRound size={18} /><span>Overview</span></a>
            <a className="nav-item" href="#profile"><Pencil size={18} /><span>Profile information</span></a>
            <a className="nav-item" href="#accounts"><Link2 size={18} /><span>Connected accounts</span></a>
            <a className="nav-item" href="#network"><Globe size={18} /><span>FedPromptly network</span></a>
            <a className="nav-item" href="#recovery"><ShieldCheck size={18} /><span>Password &amp; recovery</span></a>
            <a className="nav-item support-nav-item" href="#support"><Heart size={18} /><span>Support FedPromptly</span></a>
          </nav>
          <div className="sidebar-rule" />
          <div className="sidebar-help" id="help">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <div><strong>Need a hand?</strong><p>Find out how your Center profile works.</p></div>
          </div>
          <div className="sidebar-footer"><BrandMark className="footer-mark" /> One account. Your whole network.</div>
        </aside>

        <main className="main-content" id="main-content">
          <div className="breadcrumbs"><span>Settings</span><ChevronRight size={14} /><span>Account Center</span></div>
          <section id="overview" className="intro-section">
            <div>
              <p className="eyebrow">YOUR ACCOUNT, TOGETHER</p>
              <h1>Account Center</h1>
              <p className="intro-copy">Manage the information and connections that travel with you across FedPromptly.</p>
            </div>
            <div className="intro-mark"><BrandMark /></div>
          </section>

          <section className="profile-banner" aria-label="Shared profile overview">
            <div className="banner-orb"><BrandMark /></div>
            <div className="banner-copy">
              <span className="banner-kicker"><Sparkles size={13} /> YOUR SHARED PROFILE</span>
              <h2>One profile. Your whole network.</h2>
              <p>FedPromptly Center keeps your account details together, so your profile follows you across our services.</p>
            </div>
            <div className="banner-seal"><UsersRound size={16} /><span>Shared<br />across sites</span></div>
          </section>

          {feedback && <div className="live-feedback" role="status" aria-live="polite"><Check size={17} /><span>{feedback}</span><button type="button" onClick={() => setFeedback("")} aria-label="Dismiss message"><X size={16} /></button></div>}

          <div className="content-columns">
            <div className="primary-column">
              <section id="accounts" className="content-section">
                <SectionHeading eyebrow="ACCOUNT CONNECTIONS" title="Accounts you use" />
                <article className="connection-card">
                  <div className="service-icon muse-icon"><span>m</span></div>
                  <div className="connection-body">
                    <div className="connection-title-row"><h3>Muse AI</h3><StatusPill state={connection} /></div>
                    <p>{currentStatusText}</p>
                    {connection === "connected" && <p className="privacy-line"><LockKeyhole size={14} /> Your active Muse provides your personal information; we don’t display it here.</p>}
                    {connection === "inactive" && <p className="privacy-line"><ShieldCheck size={14} /> Your FedPromptly account stays independent of Muse.</p>}
                    {connection === "error" && <button type="button" className="text-action" onClick={() => setRetryCount((count) => count + 1)}><RefreshCw size={14} /> Try again</button>}
                  </div>
                  <div className="connection-action">
                    {connection === "connected" ? <button type="button" className="quiet-button" onClick={(event) => openDialog("disconnect", event.currentTarget)}>Disconnect</button> : connection === "checking" ? <span className="checking-label">Please wait</span> : <a className="primary-button" href={LOGIN_URL}>Connect Muse <ArrowRight size={16} /></a>}
                  </div>
                </article>
              </section>

              <section id="profile" className="content-section profile-section">
                <SectionHeading eyebrow="YOUR INFORMATION" title="Profile information">
                  <button className="text-action" type="button" onClick={(event) => openDialog("edit", event.currentTarget)}><Pencil size={15} /> Edit details</button>
                </SectionHeading>
                <article className="info-card">
                  <div className="info-icon"><UserRound size={19} /></div>
                  <div className="info-copy">
                    <h3>Your personal profile</h3>
                    {connection === "connected" ? <p>Muse is active, so it supplies your profile information. For privacy, your existing details aren’t shown in Center. You can enter a new draft to edit, but saving to your account isn’t available in this preview.</p> : connection === "inactive" ? <p>Muse needs reconnecting. Your FedPromptly account is still here; profile details can be edited when the Center profile service is available.</p> : <p>Your information is shared across FedPromptly services. No profile details are displayed until an account connection can be verified.</p>}
                    <div className="info-tags"><span><LockKeyhole size={13} /> Private to you</span><span><Globe size={13} /> Shared across FedPromptly</span></div>
                  </div>
                  <ChevronRight className="info-chevron" size={19} aria-hidden="true" />
                </article>
                {connection === "connected" && <p className="under-card-note"><LockKeyhole size={14} /> Your active Muse is the source of your personal profile. Details are never displayed here while it’s active.</p>}
              </section>

              <section id="network" className="content-section">
                <SectionHeading eyebrow="ONE CENTER PROFILE" title="Across FedPromptly" />
                <p className="section-intro">Use the same Center identity across these services. You don’t need a separate profile for each site.</p>
                <div className="network-list">
                  <a className="network-card" href="https://www.fedpromptly.com/social" target="_blank" rel="noreferrer">
                    <div className="network-icon social-icon"><UsersRound size={19} /></div>
                    <div className="network-copy"><h3>FedPromptly Social</h3><p>Community, connected to your Center profile</p></div>
                    <ArrowUpRight size={17} className="external-icon" aria-label="Opens in a new tab" />
                  </a>
                  <a className="network-card" href="https://hub.fedos.workers.dev" target="_blank" rel="noreferrer">
                    <div className="network-icon hub-icon"><Globe size={19} /></div>
                    <div className="network-copy"><h3>FedPromptly Hub</h3><p>Your FedPromptly tools and services</p></div>
                    <ArrowUpRight size={17} className="external-icon" aria-label="Opens in a new tab" />
                  </a>
                </div>
                <div className="community-subsection-heading">
                  <h3>Community &amp; Social</h3>
                  <p>Private invitations have separate age and residence requirements.</p>
                </div>
                <a className="private-community-entry" href="/private-communities">
                  <div className="private-community-entry-icon"><ShieldCheck size={18} /></div>
                  <div><strong>Private Communities</strong><span>Check age and country eligibility for the private FED-OS Matrix room.</span></div>
                  <ChevronRight size={17} />
                </a>
              </section>

              <section id="recovery" className="content-section recovery-section">
                <SectionHeading eyebrow="STAY IN CONTROL" title="Password & recovery" />
                <article className="recovery-card">
                  <div className="recovery-icon"><KeyRound size={18} /></div>
                  <div className="recovery-copy"><div className="recovery-heading"><h3>Backup personal information</h3><span className="optional-tag">OPTIONAL</span></div><p>For account recovery only. It’s never required to use FedPromptly.</p></div>
                  <button type="button" className="quiet-button" onClick={(event) => openDialog("backup", event.currentTarget)}>About backups <ChevronRight size={15} /></button>
                </article>
                <p className="availability-note"><AlertCircle size={14} /> Backup details aren’t available to save yet. This preview doesn’t collect or store them.</p>
              </section>

              <section id="support" className="content-section support-section">
                <SectionHeading eyebrow="OPTIONAL CONTRIBUTIONS" title="Support FedPromptly" />
                <SupportPayments />
              </section>
            </div>

            <aside className="right-rail" aria-label="Account information">
              <article className="rail-card continuity-card">
                <div className="rail-icon continuity-icon"><ShieldCheck size={19} /></div>
                <p className="eyebrow">YOUR ACCOUNT IS YOURS</p>
                <h3>Muse access and your Center account are separate.</h3>
                <p>If you lose access to Muse, you don’t lose your independent FedPromptly account. Reconnect a Muse account when you’re ready.</p>
                {connection === "connected" && <button type="button" className="rail-link" onClick={(event) => openDialog("replace", event.currentTarget)}>Switch Muse account <ChevronRight size={15} /></button>}
              </article>
              <article className="rail-card settings-card">
                <div className="rail-heading"><div className="rail-icon"><LockKeyhole size={18} /></div><h3>Your privacy</h3></div>
                <p>When Muse is active, its profile supplies your personal details. This Center view checks the connection without showing those fields.</p>
                <a className="rail-link" href="#profile">How profile sharing works <ChevronRight size={15} /></a>
              </article>
              <article className="rail-card simple-card">
                <div className="rail-heading"><div className="rail-icon"><Link2 size={18} /></div><h3>One profile, shared</h3></div>
                <p>Changes to a supported Center profile apply across FedPromptly services. The editing controls here are a preview and don’t save yet.</p>
              </article>
              <div className="security-note"><BadgeCheck size={16} /><span>Clear choices. No hidden account linking.</span></div>
            </aside>
          </div>

          <FedOsFooter />
        </main>
      </div>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <div className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" tabIndex={-1} ref={dialogRef}>
            <button className="dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close dialog"><X size={19} /></button>
            {dialog === "edit" && <>
              <div className="dialog-icon blue-dialog-icon"><Pencil size={19} /></div>
              <p className="eyebrow">PROFILE DETAILS</p>
              <h2 id="dialog-title">Edit your information</h2>
              <p id="dialog-description" className="dialog-copy">{connection === "connected" ? "Your existing Muse-provided details stay hidden while Muse is active. Enter a draft below. Profile editing isn’t connected to a save service yet." : "This page can’t load independent Center profile details without the Center profile service. You can enter a draft below, but it won’t be saved to your account."}</p>
              <form onSubmit={saveDraft} className="edit-form">
                <label htmlFor="draft-name">Name</label><input id="draft-name" autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                <label htmlFor="draft-email">Email address</label><input id="draft-email" type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                <p className="form-disclaimer"><LockKeyhole size={14} /> This is only a temporary draft in the current page. Nothing will be sent or saved to your account.</p>
                <div className="dialog-actions"><button type="button" className="quiet-button" onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="primary-button">Save draft</button></div>
              </form>
            </>}
            {dialog === "disconnect" && <>
              <div className="dialog-icon amber-dialog-icon"><LogOut size={19} /></div>
              <p className="eyebrow">MUSE CONNECTION</p>
              <h2 id="dialog-title">Disconnect Muse from this browser?</h2>
              <p id="dialog-description" className="dialog-copy">This clears the saved Muse login token from this browser session. It does not revoke Muse access, delete your Muse account, or remove your FedPromptly account.</p>
              <div className="dialog-callout"><ShieldCheck size={17} /><span>Your FedPromptly account stays separate and safe.</span></div>
              <div className="dialog-actions"><button type="button" className="quiet-button" onClick={() => setDialog(null)}>Keep connected</button><button type="button" className="danger-button" onClick={disconnectThisBrowser}>Disconnect here</button></div>
            </>}
            {dialog === "replace" && <>
              <div className="dialog-icon blue-dialog-icon"><RefreshCw size={19} /></div>
              <p className="eyebrow">CHANGE CONNECTION</p>
              <h2 id="dialog-title">Connect a different Muse?</h2>
              <p id="dialog-description" className="dialog-copy">You’ll go to FedPromptly’s Muse sign-in to continue. Your FedPromptly Center account remains yours; this preview can’t change or revoke the current Muse link on the server.</p>
              <div className="dialog-actions"><button type="button" className="quiet-button" onClick={() => setDialog(null)}>Not now</button><a className="primary-button" href={LOGIN_URL}>Continue to sign in <ArrowRight size={16} /></a></div>
            </>}
            {dialog === "backup" && <>
              <div className="dialog-icon green-dialog-icon"><KeyRound size={19} /></div>
              <p className="eyebrow">OPTIONAL · RECOVERY ONLY</p>
              <h2 id="dialog-title">About backup information</h2>
              <p id="dialog-description" className="dialog-copy">Backup personal information is optional and intended only to help recover your FedPromptly account if you lose access to Muse. The backup service hasn’t been built yet, so this preview does not ask for or store recovery details.</p>
              <div className="dialog-callout"><LockKeyhole size={17} /><span>You can use Center without adding backup information.</span></div>
              <div className="dialog-actions"><button type="button" className="primary-button" onClick={() => setDialog(null)}>Got it</button></div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
