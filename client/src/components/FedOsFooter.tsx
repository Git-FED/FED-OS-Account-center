type FooterLink = { label: string; href: string; note?: string };
type FooterGroup = { title: string; links: FooterLink[] };

const footerGroups: FooterGroup[] = [
  {
    title: "Explore the Ecosystem",
    links: [
      { label: "FED-OS ecosystem", href: "https://www.fedpromptly.org" },
      { label: "Join FED-OS Membership", href: "https://www.fedpromptly.com/aid", note: "Public landing · membership access is private" },
      { label: "Storefront", href: "https://www.jabburr.com/fed-os" },
      { label: "Whop", href: "https://whop.com/fedpromptly/", note: "Public landing · paid products are premium" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "General", href: "mailto:contact@fedpromptly.com" },
      { label: "Support", href: "mailto:support@fedpromptly.com" },
      { label: "Business", href: "mailto:business@fedpromptly.com" },
    ],
  },
  {
    title: "Media",
    links: [
      { label: "Articles", href: "https://substack.com/@fedpromptly" },
      { label: "FEDPromptly Blog", href: "https://fedpromptly.wordpress.com/" },
      { label: "Artwork · DeviantArt", href: "https://www.deviantart.com/fedpromptly" },
      { label: "Bluesky", href: "https://bsky.app/profile/fed-os.bsky.social" },
      { label: "FedPromptly on X", href: "https://x.com/Fedpromptly" },
    ],
  },
  {
    title: "Support & Community",
    links: [
      { label: "Supporters · Patreon", href: "https://www.patreon.com/c/FEDpromptly", note: "Public landing · paid tiers are premium" },
      { label: "Tips / Donations", href: "https://buymeacoffee.com/fedpromptly" },
      { label: "Developers · Discord", href: "https://discord.gg/Jm4XStx4Pf", note: "Public invite · private channels are gated by Discord" },
    ],
  },
];

export default function FedOsFooter() {
  return (
    <footer className="fedos-footer" aria-label="FED-OS public links">
      <div className="fedos-footer-brand">
        <span className="fedos-wordmark">FED-OS</span>
        <p>Explore the FedPromptly ecosystem, find support, and connect with the community.</p>
      </div>
      <div className="fedos-footer-groups">
        {footerGroups.map((group) => (
          <section className="fedos-footer-group" key={group.title} aria-labelledby={`footer-${group.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
            <h2 id={`footer-${group.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>{group.title}</h2>
            <ul>
              {group.links.map((link) => {
                const email = link.href.startsWith("mailto:");
                return (
                  <li key={link.href}>
                    <a href={link.href} {...(!email ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
                      <span>{link.label}</span>
                      {link.note && <small>{link.note}</small>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="fedos-footer-bottom">
        <span>FED-OS · FedPromptly Center</span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
