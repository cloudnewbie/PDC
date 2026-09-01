import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Phone } from "lucide-react";
import { WaveformCanvas } from "@/components/shared/WaveformCanvas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { patients, todayQueue, patientById } from "@/data/seed";
import { useCallEMode } from "@/lib/calle";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const E164 = /^\+[1-9]\d{7,14}$/;

/** Best-effort E.164 default from a display-format patient phone ("(617) 555-0143" → "+16175550143"). */
function defaultE164(displayPhone?: string): string {
  if (!displayPhone) return "";
  const digits = displayPhone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return E164.test(displayPhone) ? displayPhone : "";
}

/**
 * Idle console — shown when no call is active. Breathing flatline,
 * "Start demo call" CTA with breathing ring, queue picker popover.
 * Live mode additionally requires an E.164 recipient number (real PSTN call).
 */
export function IdleConsole({ onStart }: { onStart: (patientId?: string, phone?: string) => void }) {
  const { mode } = useCallEMode();
  const live = mode === "live";
  const [phone, setPhone] = useState(() => defaultE164(patientById("margaret-ellis")?.phone));
  const [touched, setTouched] = useState(false);
  const phoneValid = E164.test(phone);
  const showError = live && touched && !phoneValid;

  const start = (patientId: string) => {
    if (live) {
      if (!phoneValid) {
        setTouched(true);
        return;
      }
      onStart(patientId, phone);
    } else {
      onStart(patientId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex min-h-[calc(100dvh-64px)] items-center justify-center p-6"
    >
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900/70 p-8 text-center shadow-dark-card backdrop-blur">
        <div className="relative mx-auto h-24 overflow-hidden rounded-xl border border-ink-700 bg-ink-950/60">
          <motion.div animate={{ opacity: [0.4, 0.85, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="h-full">
            <WaveformCanvas speaking="idle" variant="line" height={96} color="#1D2A47" />
          </motion.div>
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-teal-400/40" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-ink-400">
          <Phone className="h-4 w-4" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Adapter idle</span>
        </div>
        <h4 className="mt-2 font-display text-[28px] font-medium text-ink-100">No call in progress</h4>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-400">
          {live
            ? "Enter the recipient's number and CALL-E places a real phone call — or pick a patient from today's queue."
            : "Start the scripted demo call (Margaret Ellis, 72h post-op) or pick a patient from today's queue."}
        </p>

        {/* recipient phone — required in live mode, illustrative in demo */}
        <div className="mx-auto mt-5 max-w-sm text-left">
          <label htmlFor="recipient-phone" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
            Recipient phone (E.164)
          </label>
          <input
            id="recipient-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={!live}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^\d+]/g, ""));
              setTouched(true);
            }}
            placeholder="+16175550143"
            className={cn(
              "mt-1.5 w-full rounded-xl border bg-ink-950/70 px-3.5 py-2.5 font-mono text-[13px] text-ink-100 outline-none transition-colors",
              "placeholder:text-ink-400/50 focus:border-teal-500/60",
              showError ? "border-coral-500/60" : "border-ink-700",
              !live && "cursor-not-allowed opacity-50",
            )}
          />
          <p className={cn("mt-1.5 font-mono text-[10px] leading-relaxed", showError ? "text-coral-400" : "text-ink-400/80")}>
            {live
              ? showError
                ? "Enter a valid E.164 number, e.g. +16175550143"
                : "Real PSTN call — uses 1 CALL-E credit"
              : "Demo mode — simulated patient"}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            id="start-demo-call"
            onClick={() => start("margaret-ellis")}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white animate-ring-breathe transition-colors hover:bg-teal-600",
              live && !phoneValid && touched && "opacity-60",
            )}
          >
            <Play className="h-4 w-4" />
            {live ? "Start live call" : "Start demo call"}
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-xl border border-ink-700 px-5 py-2.5 text-sm font-semibold text-ink-100 transition-colors hover:border-teal-500/50"
              >
                Choose from queue
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 border-ink-700 bg-ink-900 p-2 text-ink-100" align="center">
              <div className="px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                Today's queue
              </div>
              {todayQueue.map((q) => {
                const p = patientById(q.patientId);
                if (!p) return null;
                return (
                  <button
                    key={q.callId}
                    type="button"
                    onClick={() => {
                      if (live) setPhone((cur) => cur || defaultE164(p.phone));
                      start(q.patientId);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ink-800"
                  >
                    <img src={p.avatar} alt={p.name} className="h-7 w-7 rounded-full object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink-100">{p.name}</span>
                      <span className="block font-mono text-[10px] text-ink-400">
                        {q.time} · {q.cadence} check-in
                      </span>
                    </span>
                    <Play className="h-3.5 w-3.5 text-teal-400" />
                  </button>
                );
              })}
              <div className="border-t border-ink-700 px-2 pt-2 pb-1 font-mono text-[10px] text-ink-400">
                {live ? "live calls dial the number above" : "demo replays the scripted M. Ellis call for any pick"}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <p className="mt-8 font-mono text-[10px] leading-relaxed text-ink-400/70">
          {live ? (
            <>
              mode: live · <span className="text-green-400">api.heycall-e.com</span> — real PSTN calls via CALL-E
            </>
          ) : (
            <>
              mode: simulation · set <span className="text-violet-400">VITE_CALLE_API_KEY</span> for live calls via CALL-E
            </>
          )}
        </p>
        <p className="sr-only">{patients.length} patients enrolled</p>
      </div>
    </motion.div>
  );
}
