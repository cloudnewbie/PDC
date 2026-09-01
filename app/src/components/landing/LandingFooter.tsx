import { Link } from "react-router";

/**
 * Landing footer (design.md §6.3) — dark, 4 columns + bottom disclaimer bar.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        {/* brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="PDC logo" className="h-7 w-7" />
            <span className="text-[15px] font-semibold text-ink-100">Post-Discharge Check</span>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-400">
            An AI phone agent that calls every discharged patient — so no one falls through the cracks.
          </p>
        </div>

        {/* product */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Product</h5>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {[
              { label: "Dashboard", to: "/app" },
              { label: "Live call console", to: "/app/live" },
              { label: "Patients", to: "/app/patients" },
              { label: "Campaigns", to: "/app/campaigns" },
              { label: "Escalations", to: "/app/escalations" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ink-400 transition-colors hover:text-teal-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* hackathon */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Hackathon</h5>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <li>
              <a href="https://api.heycall-e.com" target="_blank" rel="noreferrer" className="text-ink-400 transition-colors hover:text-teal-400">
                CALL-E platform
              </a>
            </li>
            <li>
              <a href="https://devpost.com" target="_blank" rel="noreferrer" className="text-ink-400 transition-colors hover:text-teal-400">
                Devpost submission
              </a>
            </li>
            <li>
              <a href="/#integration" className="text-ink-400 transition-colors hover:text-teal-400">
                Judging criteria mapping
              </a>
            </li>
          </ul>
        </div>

        {/* install */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Get the SDK</h5>
          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3">
            <code className="font-mono text-[13px] text-teal-400">$ npm i @call-e/calle</code>
          </div>
          <p className="mt-4 text-[12px] text-ink-400">Built at CALL-E: Your Code Is Calling, 2026</p>
        </div>
      </div>

      <div className="border-t border-ink-700">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-[12px] text-ink-400 sm:flex-row">
          <span>Demo product — simulated patient data. Not a medical device.</span>
          <span className="font-mono">plan · dial · converse · return</span>
        </div>
      </div>
    </footer>
  );
}
