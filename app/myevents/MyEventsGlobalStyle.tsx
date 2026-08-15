// One global <style> tag for the handful of CSS rules the dashboard needs
// that can't be expressed as inline styles or Tailwind utilities — same
// pattern as the public site's own scattered <style jsx-less> blocks
// (app/page.tsx). Rendered once at the root of the dashboard tree.

import { ACCENT, hexToRgba, TEXT } from "./theme";

export function MyEventsGlobalStyle() {
  return (
    <style>{`
      .myevents-btn:not(:disabled):hover {
        background-color: ${hexToRgba(ACCENT, 0.15)};
        color: ${TEXT};
      }
      .myevents-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: ${ACCENT} transparent;
      }
      .myevents-scrollbar::-webkit-scrollbar {
        height: 6px;
      }
      .myevents-scrollbar::-webkit-scrollbar-thumb {
        background-color: ${hexToRgba(ACCENT, 0.4)};
        border-radius: 3px;
      }
    `}</style>
  );
}
