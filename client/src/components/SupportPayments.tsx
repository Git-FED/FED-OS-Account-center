import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Check, ExternalLink, Heart, Info, LockKeyhole } from "lucide-react";

const PAYPAL_CLIENT_ID = "BAA_ndqaWMyQwTnDZ0LXwLQ22jdJo9uxkeXYqmBbF-hD41HMiZ83mvOcx1Kti0b6ZfXfje7Q1ievNaS8Ok";
const PAYPAL_PLAN_ID = "P-4FD24238VX4902214NK2XP2Y";
const STRIPE_BUY_BUTTON_ID = "buy_btn_1UJKaaJaRf233kfWKZ81fcIe";
const STRIPE_PUBLISHABLE_KEY = "pk_live_51UIdAGJaRf233kfWlFacR31IYVGdjCVAttNFzIgQGXQzrUdc894iJcBqamRZNwF11z2AN5kvjyzitor462f2egVI00UmKj0sd8";
const PAYPAL_SCRIPT_ATTRIBUTE = "data-fedpromptly-paypal";
const STRIPE_SCRIPT_ATTRIBUTE = "data-fedpromptly-stripe-buy-button";

type PaypalStatus = "loading" | "ready" | "error" | "approved";
type StripeStatus = "loading" | "ready" | "error";

interface PaypalActions {
  subscription: {
    create: (details: { plan_id: string; quantity: number }) => Promise<unknown>;
  };
}

interface PaypalButtonOptions {
  style: { shape: "rect"; color: "gold"; layout: "vertical"; label: "subscribe" };
  createSubscription: (_data: unknown, actions: PaypalActions) => Promise<unknown>;
  onApprove: (data: { subscriptionID?: string }) => void;
  onError: (_error: unknown) => void;
}

interface PaypalButtonInstance {
  render: (selector: string) => Promise<void>;
  close?: () => Promise<void>;
}

interface PaypalNamespace {
  Buttons: (options: PaypalButtonOptions) => PaypalButtonInstance;
}

declare global {
  interface Window {
    paypal?: PaypalNamespace;
  }
}

function PayPalSubscription() {
  const containerRef = useRef<HTMLDivElement>(null);
  const approvedRef = useRef(false);
  const [status, setStatus] = useState<PaypalStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    let instance: PaypalButtonInstance | undefined;
    let script = document.querySelector<HTMLScriptElement>(`script[${PAYPAL_SCRIPT_ATTRIBUTE}]`);
    let readinessPoll: number | undefined;

    const renderButtons = () => {
      if (disposed || instance || !containerRef.current || !window.paypal) return;
      try {
        instance = window.paypal.Buttons({
          style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (_data, actions) => actions.subscription.create({ plan_id: PAYPAL_PLAN_ID, quantity: 1 }),
          onApprove: (data) => {
            approvedRef.current = true;
            setStatus("approved");
            setMessage(data.subscriptionID
              ? `PayPal reported approval for subscription ${data.subscriptionID}. This page does not verify or store subscription status.`
              : "PayPal reported approval. This page does not verify or store subscription status.");
          },
          onError: () => {
            if (approvedRef.current) return;
            setStatus("error");
            setMessage("PayPal checkout could not be loaded. No subscription was started here.");
          },
        });
        void instance.render("#fedpromptly-paypal-subscription-buttons")
          .then(() => { if (!disposed) setStatus((current) => current === "loading" ? "ready" : current); })
          .catch(() => {
            if (disposed || approvedRef.current) return;
            setStatus("error");
            setMessage("PayPal checkout could not be loaded. Check your connection and try again.");
          });
      } catch {
        if (approvedRef.current) return;
        setStatus("error");
        setMessage("PayPal checkout could not be loaded. Check your connection and try again.");
      }
    };

    const waitForPaypal = () => {
      if (window.paypal) {
        renderButtons();
        return;
      }
      const startedAt = Date.now();
      readinessPoll = window.setInterval(() => {
        if (window.paypal) {
          if (readinessPoll !== undefined) window.clearInterval(readinessPoll);
          readinessPoll = undefined;
          renderButtons();
        } else if (Date.now() - startedAt >= 12000) {
          handleError();
        }
      }, 150);
    };

    const handleLoad = () => renderButtons();
    const handleError = () => {
      if (readinessPoll !== undefined) window.clearInterval(readinessPoll);
      readinessPoll = undefined;
      if (disposed || approvedRef.current) return;
      setStatus("error");
      setMessage("PayPal checkout did not load. You can still choose another support option.");
    };

    if (window.paypal) {
      renderButtons();
    } else if (script) {
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      waitForPaypal();
    } else {
      script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&vault=true&intent=subscription`;
      script.async = true;
      script.setAttribute(PAYPAL_SCRIPT_ATTRIBUTE, "true");
      script.setAttribute("data-sdk-integration-source", "button-factory");
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
      waitForPaypal();
    }

    return () => {
      disposed = true;
      if (readinessPoll !== undefined) window.clearInterval(readinessPoll);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
      if (instance?.close) void instance.close().catch(() => undefined);
    };
  }, []);

  return (
    <div className="paypal-checkout-wrap">
      {status === "loading" && <p className="provider-status" role="status">Loading PayPal checkout…</p>}
      <div id="fedpromptly-paypal-subscription-buttons" ref={containerRef} className="paypal-button-slot" aria-label="PayPal subscription checkout" />
      {status === "error" && <p className="provider-error" role="status"><AlertCircle size={15} /> {message}</p>}
      {status === "approved" && <p className="provider-success" role="status"><Check size={15} /> {message}</p>}
    </div>
  );
}

function StripeBuyButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<StripeStatus>("loading");

  useEffect(() => {
    let disposed = false;
    let script = document.querySelector<HTMLScriptElement>(`script[${STRIPE_SCRIPT_ATTRIBUTE}]`);
    let definitionTimeout: number | undefined;

    const mountButton = () => {
      if (disposed || !containerRef.current) return;
      const buyButton = document.createElement("stripe-buy-button");
      buyButton.setAttribute("buy-button-id", STRIPE_BUY_BUTTON_ID);
      buyButton.setAttribute("publishable-key", STRIPE_PUBLISHABLE_KEY);
      containerRef.current.replaceChildren(buyButton);
      setStatus("ready");
    };
    const handleError = () => {
      if (definitionTimeout !== undefined) window.clearTimeout(definitionTimeout);
      definitionTimeout = undefined;
      if (!disposed) setStatus("error");
    };

    const waitForDefinition = () => {
      if (customElements.get("stripe-buy-button")) {
        mountButton();
        return;
      }
      definitionTimeout = window.setTimeout(handleError, 12000);
      void customElements.whenDefined("stripe-buy-button").then(() => {
        if (definitionTimeout !== undefined) window.clearTimeout(definitionTimeout);
        definitionTimeout = undefined;
        mountButton();
      });
    };

    if (customElements.get("stripe-buy-button")) {
      mountButton();
    } else if (script) {
      script.addEventListener("error", handleError, { once: true });
      waitForDefinition();
    } else {
      script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/buy-button.js";
      script.async = true;
      script.setAttribute(STRIPE_SCRIPT_ATTRIBUTE, "true");
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
      waitForDefinition();
    }

    return () => {
      disposed = true;
      if (definitionTimeout !== undefined) window.clearTimeout(definitionTimeout);
      script?.removeEventListener("error", handleError);
      containerRef.current?.replaceChildren();
    };
  }, []);

  return (
    <div className="stripe-checkout-wrap">
      {status === "loading" && <p className="provider-status" role="status">Loading Stripe checkout…</p>}
      <div ref={containerRef} className="stripe-button-slot" aria-label="Stripe checkout" />
      {status === "error" && <p className="provider-error" role="status"><AlertCircle size={15} /> Stripe checkout did not load. You can still choose another support option.</p>}
    </div>
  );
}

function SupportOption({ icon, title, description, children, className = "" }: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`support-option ${className}`}>
      <div className="support-option-heading">
        <div className="support-option-icon">{icon}</div>
        <div><h3>{title}</h3><p>{description}</p></div>
      </div>
      <div className="support-option-action">{children}</div>
    </article>
  );
}

export default function SupportPayments() {
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    try { return sessionStorage.getItem("fedpromptly_support_age_confirmed") === "true"; }
    catch { return false; }
  });
  const [adultAttestation, setAdultAttestation] = useState(false);

  function continueToSupportOptions() {
    if (!adultAttestation) return;
    // Only store the user's self-attestation, never a birth date or identity document.
    setAgeConfirmed(true);
    try { sessionStorage.setItem("fedpromptly_support_age_confirmed", "true"); } catch { /* The gate still works for this page view. */ }
  }

  return (
    <div className="support-area">
      <div className="support-section-intro">
        <div className="support-emblem"><Heart size={20} /></div>
        <div><h3>Optional ways to support FedPromptly</h3><p>Choose a provider only if you want to contribute. Each checkout is handled by that provider.</p></div>
      </div>

      {!ageConfirmed ? (
        <div className="age-gate-card">
          <div className="age-gate-topline"><LockKeyhole size={17} /><span>AGE CONFIRMATION</span></div>
          <h3>Payment options are for people who meet the legal payment age in their region.</h3>
          <p>This is a self-attestation, not age verification. We don’t ask for your birth date or identity documents. Payment providers may apply their own eligibility checks and terms.</p>
          <label className="age-attestation">
            <input type="checkbox" checked={adultAttestation} onChange={(event) => setAdultAttestation(event.target.checked)} />
            <span>I confirm that I meet the legal age required to make payments where I live.</span>
          </label>
          <div className="age-gate-actions">
            <button type="button" className="primary-button" onClick={continueToSupportOptions} disabled={!adultAttestation}>Continue to support options <ArrowUpRight size={15} /></button>
            <span>No date of birth is collected.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="support-privacy-note"><Info size={16} /><p>These options use external providers. Review the amount, billing frequency, and provider terms in checkout before confirming. This front end does not process card data or verify/store payments.</p></div>
          <div className="support-options">
            <SupportOption icon={<span className="provider-mark paypal-mark">P</span>} title="PayPal subscription" description="Recurring subscription using the provided PayPal plan. PayPal shows the plan amount and renewal terms before you approve.">
              <PayPalSubscription />
            </SupportOption>

            <SupportOption icon={<span className="provider-mark stripe-mark">S</span>} title="FedPromptly card checkout · Stripe" description="Secure checkout hosted by Stripe. Review the price, currency, and whether the purchase repeats before confirming.">
              <StripeBuyButton />
            </SupportOption>

            <SupportOption icon={<span className="provider-mark github-mark">GH</span>} title="GitHub Sponsors" description="Support Git-FED through GitHub Sponsors. GitHub handles sponsorship terms and payment.">
              <iframe className="github-sponsor-frame" src="https://github.com/sponsors/Git-FED/button" title="Sponsor Git-FED on GitHub Sponsors" height="32" width="114" loading="lazy" />
            </SupportOption>

            <SupportOption icon={<span className="provider-mark kofi-mark">K</span>} title="Ko-fi" description="Open Ko-fi to support FedPromptly. No floating widget is loaded across the rest of the site.">
              <a className="provider-link-button kofi-button" href="https://ko-fi.com/fedpromptly" target="_blank" rel="noreferrer noopener">Support on Ko-fi <ExternalLink size={14} /></a>
            </SupportOption>

            <SupportOption icon={<span className="provider-mark coffee-mark">B</span>} title="Buy Me a Coffee" description="Contribute through Buy Me a Coffee; the provider will display its terms before checkout.">
              <a className="coffee-image-link" href="https://www.buymeacoffee.com/fedpromptly" target="_blank" rel="noreferrer noopener" aria-label="Buy FedPromptly a book on Buy Me a Coffee">
                <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20book&emoji=%F0%9F%93%96&slug=fedpromptly&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Buy me a book on Buy Me a Coffee" loading="lazy" />
              </a>
            </SupportOption>

            <SupportOption icon={<span className="provider-mark crypto-mark">₿</span>} title="NOWPayments" description="Open NOWPayments to view the supported cryptocurrency payment options and terms.">
              <a className="provider-link-button crypto-button" href="https://nowpayments.io/payment/?iid=5997958570&source=button" target="_blank" rel="noreferrer noopener"><img src="https://nowpayments.io/images/embeds/payments-button-white.svg" alt="" /> Pay with cryptocurrency <ExternalLink size={14} /></a>
            </SupportOption>
          </div>
        </>
      )}
    </div>
  );
}
