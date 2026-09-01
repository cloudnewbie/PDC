import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarClock, FileBarChart, PhoneOutgoing, Siren, UserPlus, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { callRecords, patientById, patients } from "@/data/seed";

/**
 * ⌘K command palette (design.md §6.2) — fuzzy search over patients, calls
 * and quick actions. `open`/`onOpenChange` controlled by the AppShell.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const completedCalls = callRecords.filter((c) => c.status === "completed" || c.status === "escalated");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search patients, calls, actions…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results for “{query}”.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/app/patients?enroll=1")}>
            <UserPlus className="h-4 w-4 text-teal-500" />
            Enroll patient
          </CommandItem>
          <CommandItem onSelect={() => go("/app/live?autostart=1")}>
            <PhoneOutgoing className="h-4 w-4 text-teal-500" />
            Start demo call
          </CommandItem>
          <CommandItem onSelect={() => go("/app/escalations")}>
            <Siren className="h-4 w-4 text-coral-500" />
            View escalations
          </CommandItem>
          <CommandItem onSelect={() => go("/app/campaigns")}>
            <CalendarClock className="h-4 w-4 text-teal-500" />
            New campaign
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Patients">
          {patients.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.name} ${p.mrn} ${p.cohortLabel}`}
              onSelect={() => go(`/app/patients?patient=${p.id}`)}
            >
              <Users className="h-4 w-4 text-slate-400" />
              <span>{p.name}</span>
              <span className="ml-2 font-mono text-[11px] text-slate-400">{p.cohortLabel}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent calls">
          {completedCalls.slice(0, 6).map((c) => {
            const p = patientById(c.patientId);
            return (
              <CommandItem
                key={c.id}
                value={`${c.id} ${p?.name ?? ""} ${c.outcome ?? ""}`}
                onSelect={() => go(`/app/results?id=${c.id}`)}
              >
                <FileBarChart className="h-4 w-4 text-slate-400" />
                <span>
                  {c.id} · {p?.name}
                </span>
                <span className="ml-2 truncate font-mono text-[11px] text-slate-400">{c.outcome}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
