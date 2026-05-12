export function AnimatedBackground({ variant = "soft" }) {
  const intense = variant === "intense";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Mesh gradient blobs */}
      <div
        className="bg-blob"
        style={{
          width: "55vmax", height: "55vmax", top: "-15%", left: "-10%",
          background: "var(--brand-teal)",
          animation: "drift-1 32s ease-in-out infinite",
          opacity: intense ? 0.6 : 0.35,
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: "50vmax", height: "50vmax", top: "20%", right: "-15%",
          background: "var(--brand-coral)",
          animation: "drift-2 38s ease-in-out infinite",
          opacity: intense ? 0.5 : 0.28,
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: "45vmax", height: "45vmax", bottom: "-20%", left: "20%",
          background: "var(--brand-orange)",
          animation: "drift-3 44s ease-in-out infinite",
          opacity: intense ? 0.5 : 0.25,
        }}
      />

      <svg className="absolute top-[12%] left-[8%] float-shape" width="42" height="42" viewBox="0 0 42 42" style={{ animationDelay: "-2s" }}>
        <circle cx="21" cy="21" r="20" fill="var(--brand-orange)" opacity="0.55" />
      </svg>
      <svg className="absolute top-[28%] right-[12%] float-shape" width="56" height="28" viewBox="0 0 56 28" style={{ animationDelay: "-6s" }}>
        <path d="M0 28 A28 28 0 0 1 56 28 Z" fill="var(--brand-coral)" opacity="0.55" />
      </svg>
      <svg className="absolute bottom-[18%] left-[22%] float-shape" width="48" height="48" viewBox="0 0 48 48" style={{ animationDelay: "-10s" }}>
        <rect width="48" height="48" rx="8" fill="var(--brand-teal)" opacity="0.5" />
      </svg>
      <svg className="absolute bottom-[10%] right-[18%] float-shape" width="64" height="64" viewBox="0 0 64 64" style={{ animationDelay: "-4s" }}>
        <polygon points="32,4 60,60 4,60" fill="var(--brand-pink)" opacity="0.7" />
      </svg>
      <svg className="absolute top-[55%] left-[45%] float-shape" width="36" height="36" viewBox="0 0 36 36" style={{ animationDelay: "-8s" }}>
        <circle cx="18" cy="18" r="17" fill="none" stroke="var(--brand-ink)" strokeWidth="2" opacity="0.25" />
      </svg>
    </div>
  );
}
