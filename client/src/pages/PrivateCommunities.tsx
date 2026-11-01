import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

const ALLOWED_RESIDENCES = ["Canada", "Switzerland", "Russia", "Iran", "Somalia", "Turkmenistan"] as const;
const MATRIX_INVITE = "https://matrix.to/#/#fed-os:matrix.org";

export default function PrivateCommunities() {
  const [residence, setResidence] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [residenceConfirmed, setResidenceConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Private Communities · FedPromptly Center";
    return () => { document.title = previousTitle; };
  }, []);

  const eligibleResidence = ALLOWED_RESIDENCES.includes(residence as (typeof ALLOWED_RESIDENCES)[number]);

  function handleResidenceChange(value: string) {
    setResidence(value);
    setSubmitted(false);
  }

  function checkEligibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  const canSubmit = residence.length > 0 && adultConfirmed && residenceConfirmed;

  return (
    <div className="private-community-page">
      <header className="private-community-header">
        <a className="private-community-brand" href="/" aria-label="Back to FedPromptly Center">FED-OS <span>· FedPromptly Center</span></a>
        <a className="private-back-link" href="/"><ArrowLeft size={15} /> Account Center</a>
      </header>
      <main className="private-community-main">
        <article className="private-community-card">
          <div className="private-community-icon"><UsersRound size={23} /></div>
          <p className="eyebrow">PRIVATE COMMUNITY · ELIGIBILITY REQUIRED</p>
          <h1>Private Communities</h1>
          <p className="private-community-lead">The FED-OS Matrix room is private. Access is limited to adults who currently reside in one of the eligible countries listed below.</p>

          <div className="eligibility-rules">
            <div><LockKeyhole size={17} /><p><strong>18 or older</strong><span>Adult confirmation is required before the invite is shown.</span></p></div>
            <div><ShieldCheck size={17} /><p><strong>Eligible residence</strong><span>Canada, Switzerland, Russia, Iran, Somalia, or Turkmenistan.</span></p></div>
          </div>

          <form className="eligibility-form" onSubmit={checkEligibility}>
            <label htmlFor="residence-country">Country of current residence</label>
            <select id="residence-country" value={residence} onChange={(event) => handleResidenceChange(event.target.value)} required>
              <option value="">Choose a country</option>
              {ALLOWED_RESIDENCES.map((country) => <option key={country} value={country}>{country}</option>)}
              <option value="other">Other / not listed</option>
            </select>

            <label className="eligibility-checkbox">
              <input type="checkbox" checked={adultConfirmed} onChange={(event) => { setAdultConfirmed(event.target.checked); setSubmitted(false); }} />
              <span>I confirm that I am 18 years of age or older.</span>
            </label>
            <label className="eligibility-checkbox">
              <input type="checkbox" checked={residenceConfirmed} onChange={(event) => { setResidenceConfirmed(event.target.checked); setSubmitted(false); }} />
              <span>I confirm that I currently reside in the country selected above.</span>
            </label>

            <p className="eligibility-disclaimer">This page uses self-attestation only. It does not verify age, identity, or geolocation, and it does not collect your birth date or identity documents. Do not continue unless the statements above are accurate.</p>
            <button type="submit" className="primary-button" disabled={!canSubmit}>Check eligibility <ArrowUpRight size={15} /></button>
          </form>

          {submitted && eligibleResidence && adultConfirmed && residenceConfirmed && (
            <div className="eligibility-result eligibility-result-approved" role="status" aria-live="polite">
              <ShieldCheck size={18} />
              <div><strong>Self-attestation complete</strong><p>Based on your answers, the invite is available. The room’s own moderators and rules still apply.</p><a href={MATRIX_INVITE} target="_blank" rel="noreferrer noopener">Open the private FED-OS Matrix room <ArrowUpRight size={15} /></a></div>
            </div>
          )}
          {submitted && !eligibleResidence && (
            <p className="eligibility-result eligibility-result-denied" role="status" aria-live="polite">The invite is not shown because this room is limited to residents of the listed countries.</p>
          )}
          {submitted && eligibleResidence && (!adultConfirmed || !residenceConfirmed) && (
            <p className="eligibility-result eligibility-result-denied" role="status" aria-live="polite">Confirm both statements to continue.</p>
          )}
        </article>
        <p className="private-community-footnote">The eligibility check is a respectful access reminder, not an identity or location verification system.</p>
      </main>
    </div>
  );
}
