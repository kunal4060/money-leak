import { useId } from "react";

/* ------------------------------------------------------------------ */
/* LeakGuard mark — "the sealed leak": a droplet (the leak) with a      */
/* horizontal seal bar knocked out of it (the guard). One idea, bold    */
/* silhouette, readable down to 16px.                                  */
/* ------------------------------------------------------------------ */
export function LogoMark({
  className = "h-8 w-8",
  droplet = "#0C7A55",
}: {
  className?: string;
  droplet?: string;
}) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="LeakGuard mark">
      <defs>
        <mask id={id}>
          <rect width="32" height="32" fill="#fff" />
          <rect x="6.5" y="17.4" width="19" height="3.6" rx="1.8" fill="#000" />
        </mask>
      </defs>
      <path
        d="M16 3.5C16 3.5 8.2 12.6 8.2 18.8a7.8 7.8 0 0 0 15.6 0C23.8 12.6 16 3.5 16 3.5Z"
        fill={droplet}
        mask={`url(#${id})`}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* UI icon set — hand-drawn 24px stroke icons, 1.8px stroke, round caps */
/* ------------------------------------------------------------------ */
function base(props: React.SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconOverview(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconDetect(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </svg>
  );
}

export function IconAct(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5l4-4M16 4.5h3.5V8" />
    </svg>
  );
}

export function IconMethod(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8L19 8.5V20.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M13.5 3.5v5.5H19" />
      <path d="M8.5 13.5h7M8.5 16.5h5" />
    </svg>
  );
}

export function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 15.5v-11M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15.5v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

export function IconDoc(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8L19 8.5V20.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M13.5 3.5v5.5H19" />
    </svg>
  );
}

export function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20.5 20.5" />
    </svg>
  );
}

export function IconAlert(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4L2.8 19.5h18.4L12 4z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSpark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5c.7 4.8 3.2 7.3 8 8-4.8.7-7.3 3.2-8 8-.7-4.8-3.2-7.3-8-8 4.8-.7 7.3-3.2 8-8z" />
    </svg>
  );
}

export function IconDownload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11M7.5 11L12 15.5 16.5 11" />
      <path d="M4 15.5v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

export function IconArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5" />
    </svg>
  );
}
