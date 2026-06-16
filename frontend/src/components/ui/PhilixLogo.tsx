interface Props {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  /** Use on dark/navy backgrounds — renders white wordmark */
  onDark?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm:  { full: { h: 36,  iconW: 32,  iconH: 32  }, icon: { w: 32,  h: 32  } },
  md:  { full: { h: 44,  iconW: 40,  iconH: 40  }, icon: { w: 40,  h: 40  } },
  lg:  { full: { h: 56,  iconW: 50,  iconH: 50  }, icon: { w: 56,  h: 56  } },
  xl:  { full: { h: 64,  iconW: 56,  iconH: 56  }, icon: { w: 72,  h: 72  } },
};

export default function PhilixLogo({ variant = "full", size = "md", onDark = false, className = "" }: Props) {
  const s = SIZE_MAP[size];

  if (variant === "icon") {
    const { w, h } = s.icon;
    return (
      <svg width={w} height={h} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id={`ig-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#E8940A" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#ig-${size})`} />
        <rect x="12" y="40" width="9" height="13" rx="2.5" fill="white" opacity="0.85" />
        <rect x="25" y="30" width="9" height="23" rx="2.5" fill="white" opacity="0.92" />
        <rect x="38" y="18" width="9" height="35" rx="2.5" fill="white" />
        <rect x="2" y="2" width="60" height="26" rx="16" fill="white" opacity="0.06" />
      </svg>
    );
  }

  // Full lockup: badge + wordmark
  const { h, iconW, iconH } = s.full;
  const totalW = iconW + 14 + 120; // icon + gap + text area

  const philixSize = h * 0.42;
  const financeSize = h * 0.255;
  const textX = iconW + 14;
  const philixY = h * 0.46;
  const financeY = h * 0.82;

  const wordmarkColor = onDark ? "#FFFFFF" : "#0F172A";
  const subColor = onDark ? "rgba(255,255,255,0.6)" : "#64748B";

  return (
    <svg
      width={totalW}
      height={h}
      viewBox={`0 0 ${totalW} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`lg-${size}-${onDark ? "d" : "l"}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#E8940A" />
        </linearGradient>
      </defs>

      {/* Badge */}
      <rect
        x="1" y="1"
        width={iconW - 2} height={iconH - 2}
        rx={iconW * 0.23}
        fill={`url(#lg-${size}-${onDark ? "d" : "l"})`}
      />
      {/* Bar chart marks */}
      <rect
        x={iconW * 0.18} y={iconH * 0.62}
        width={iconW * 0.14} height={iconH * 0.22}
        rx="2"
        fill="white" opacity="0.85"
      />
      <rect
        x={iconW * 0.36} y={iconH * 0.46}
        width={iconW * 0.14} height={iconH * 0.38}
        rx="2"
        fill="white" opacity="0.92"
      />
      <rect
        x={iconW * 0.54} y={iconH * 0.28}
        width={iconW * 0.14} height={iconH * 0.56}
        rx="2"
        fill="white"
      />
      {/* Top gloss */}
      <rect
        x="1" y="1"
        width={iconW - 2} height={(iconH - 2) * 0.44}
        rx={iconW * 0.23}
        fill="white" opacity="0.06"
      />

      {/* PHILIX wordmark */}
      <text
        x={textX}
        y={philixY}
        fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize={philixSize}
        fill={wordmarkColor}
        letterSpacing="-0.5"
      >
        PHILIX
      </text>

      {/* FINANCE sub-text */}
      <text
        x={textX}
        y={financeY}
        fontFamily="'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="500"
        fontSize={financeSize}
        fill={subColor}
        letterSpacing="2.5"
      >
        FINANCE
      </text>
    </svg>
  );
}
