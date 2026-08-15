// /myevents — placeholder shell. Group 3 replaces this with the full
// dashboard layout (header, templates, snippets, calendar, bookings); for
// now this just proves the auth flow (middleware.ts + login page) works
// end to end: reach here only with a valid `admin_auth` cookie.

import { LogoutButton } from "./LogoutButton";
import { BG, TEXT } from "./theme";

export default function MyEventsPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: BG, color: TEXT }}>
      <div className="text-center">
        <p>You&apos;re in.</p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
