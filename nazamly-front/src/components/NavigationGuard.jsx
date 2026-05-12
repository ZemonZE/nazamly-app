import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

  return null;
}
