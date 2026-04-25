export const IconEmail = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export const IconLock = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconUser = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const IconClose = ({ onClick }) => (
  <button
    className="input-action-btn"
    title="مسح"
    onClick={onClick}
    type="button"
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

export const IconEye = ({ open, onClick }) => (
  <button
    className="input-action-btn"
    title={open ? "إخفاء" : "إظهار"}
    onClick={onClick}
    type="button"
  >
    {open ? (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )}
  </button>
);

export const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path
      fill="#EA4335"
      d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13 17.8 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.6h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17.1z"
    />
    <path
      fill="#FBBC05"
      d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
    />
  </svg>
);

export const svgBase = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const GenerateIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
export const ArchiveIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
);
export const BrainIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
);
export const QuizIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
export const MidtermIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/><circle cx="8.5" cy="11" r=".5" fill="currentColor"/><circle cx="8.5" cy="16" r=".5" fill="currentColor"/></svg>
);
export const FinalIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
export const CheckIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><polyline points="20 6 9 17 4 12"/></svg>
);
export const WarningIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
export const ReportIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);
export const LightbulbIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/><path d="M9 21h6"/><path d="M10 17v.5a1.5 1.5 0 003 0V17"/></svg>
);

export const SparklesIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M12 3l1.912 5.813L20 10l-6.088 1.187L12 17l-1.912-5.813L4 10l6.088-1.187z"/><path d="M19 14l.9 2.8L23 18l-3.1.8L19 22l-.9-2.8L15 18l3.1-.8z"/></svg>
);
export const SearchIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
export const EyeIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
export const LeafIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 20 .5 20 .5s-1.5 8.5-5.7 13.2"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
);
export const TrophyIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2h10v-2c0-.76-.85-1.25-2.03-1.79C14.47 17.98 14 17.55 14 17v-2.34"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>
);
export const ThumbsUpIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
);
export const TrendingUpIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
export const GraduationCapIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/></svg>
);
export const BarChartIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);
export const TypeIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
);
export const CheckCircleIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

// Materials Page Icons
export const LecturesIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
);

export const SectionsIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
);

export const VideosIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
);

export const FinalsIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
);

export const MidtermsIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>
);

export const AssignmentsIcon = ({ size = 18, className = "nse-icon" }) => (
  <svg {...svgBase} className={className} width={size} height={size}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
