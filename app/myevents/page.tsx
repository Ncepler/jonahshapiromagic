// /myevents — Jonah's private dashboard. Reached only with a valid
// admin_auth cookie (middleware.ts redirects everyone else to
// /myevents/login). Server component so page data can be fetched with the
// service-role Supabase client (lib/supabase.ts) without ever shipping that
// key to the browser; the interactive shell itself is DashboardClient.
//
// force-dynamic: this always needs a fresh read of the database (new
// bookings, edited templates/snippets), never a statically cached page.

import { MagicianCursor } from "../MagicianCursor";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function MyEventsPage() {
  return (
    <MagicianCursor>
      <DashboardClient />
    </MagicianCursor>
  );
}
