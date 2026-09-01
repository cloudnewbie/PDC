import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import { AppShell } from "@/components/app/AppShell";
import Dashboard from "@/pages/app/Dashboard";
import Patients from "@/pages/app/Patients";
import Campaigns from "@/pages/app/Campaigns";
import LiveCall from "@/pages/app/LiveCall";
import CallResults from "@/pages/app/CallResults";
import Escalations from "@/pages/app/Escalations";
import Settings from "@/pages/app/Settings";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="live" element={<LiveCall />} />
          <Route path="results" element={<CallResults />} />
          <Route path="escalations" element={<Escalations />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}
