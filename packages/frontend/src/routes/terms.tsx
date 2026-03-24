import { Link } from 'react-router'

export function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        to="/setup"
        className="mb-8 inline-flex items-center gap-1 text-sm text-[--color-muted-foreground] hover:text-[--color-foreground]"
      >
        ← Back to setup
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Terms &amp; Disclaimer</h1>
      <p className="mb-8 text-sm text-[--color-muted-foreground]">
        Please read carefully before using this tool.
      </p>

      <div className="prose prose-neutral dark:prose-invert space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">1. Use at Your Own Risk</h2>
          <p>
            This tool is provided for personal, educational, and informational purposes only. Your
            use of this site and any outputs it produces is entirely at your own risk and
            responsibility.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Waiver of Legal Claims</h2>
          <p>
            By using this site, you irrevocably waive the right to bring any claim, action, or
            proceeding against the author in any court or jurisdiction in connection with this site,
            its content, its outputs, or your use thereof.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. No Liability</h2>
          <p>
            The author expressly disclaims all liability for any damages, data loss, security
            incidents, service disruptions, or other harm arising from the use or misuse of this
            tool, including but not limited to misconfigured certificates, compromised API tokens,
            or unintended Cloudflare account changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. No Warranty</h2>
          <p>
            This tool is provided &quot;as is&quot; without warranty of any kind, express or
            implied, including warranties of merchantability, fitness for a particular purpose, or
            non-infringement. The author makes no guarantee that the tool is accurate, complete,
            reliable, or suitable for your needs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Security Responsibility</h2>
          <p>
            You are solely responsible for the security of any API tokens, private keys, and
            certificates generated or used through this tool. This site processes your credentials
            in-browser only — nothing is sent to any server other than the Cloudflare API directly.
            Review the{' '}
            <a
              href="https://github.com/naorz/hass-sag"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              source code
            </a>{' '}
            to verify this.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Support</h2>
          <p>
            You may report issues via{' '}
            <a
              href="https://github.com/naorz/hass-sag/issues"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
            . The author is under no obligation to respond, resolve, or provide any support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Accessibility</h2>
          <p>
            The author makes a best-effort attempt at WCAG 2.1 AA compliance but makes no
            guarantee of full accessibility compliance.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-[--color-border] pt-6">
        <Link
          to="/setup"
          className="inline-flex items-center gap-1 text-sm text-[--color-muted-foreground] hover:text-[--color-foreground]"
        >
          ← Back to setup
        </Link>
      </div>
    </main>
  )
}
