import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * NavigationGuard — prevents accidental browser close/refresh when
 * there is unsaved work (e.g. AI generation in progress, form data).
 *
 * NOTE: React Router's useBlocker requires createBrowserRouter (data router).
 * This app uses <BrowserRouter>, so we only guard against browser-level
 * navigation (close, refresh, back). In-app <Link> clicks are not blocked.
 *
 * @param {boolean} when — whether to block navigation
 * @param {string} message — message shown in the browser's native dialog
 */
export default function NavigationGuard({
  when = false,
  message = "You have unsaved changes. Are you sure you want to leave?",
}) {
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  // Render nothing — this is a behavior-only component
  return null;
}
