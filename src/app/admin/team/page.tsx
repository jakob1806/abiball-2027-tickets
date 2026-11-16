import TeamManager from "@/components/TeamManager";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [{ data: users }, { data: scans }] = await Promise.all([
    db().from("scanner_users").select("id, name, username, active, last_login_at, created_at").order("created_at"),
    db().from("checkins").select("scanner_user_id").eq("result", "ok").not("scanner_user_id", "is", null),
  ]);
  const counts: Record<string, number> = {};
  for (const s of scans ?? []) counts[s.scanner_user_id as string] = (counts[s.scanner_user_id as string] ?? 0) + 1;
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <h1 className="h2" style={{ marginBottom: 8 }}>Einlass-Team</h1>
      <p className="muted" style={{ marginTop: 0, maxWidth: 720 }}>
        Konten für Helfer am Einlass. Damit melden sie sich in der Scan-App (iPhone) oder im Browser unter{" "}
        <a href="/scanner">/scanner</a> an. Jeder Scan wird mit dem Namen protokolliert.
      </p>
      <TeamManager users={(users ?? []).map((u) => ({ ...u, scans: counts[u.id] ?? 0 }))} />
    </main>
  );
}
