/**
 * A band of the classic girih tessellation the mark comes from:
 * eight-point stars on a square grid. Section divider, always faint.
 */
export function Girih({ id, className }: { id: string; className?: string }) {
  const pid = `girih-${id}`;
  return (
    <svg className={className} width="100%" height="88" aria-hidden="true">
      <defs>
        <pattern id={pid} width="104" height="104" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            {/* center star */}
            <rect x="33" y="33" width="38" height="38" />
            <rect x="33" y="33" width="38" height="38" transform="rotate(45 52 52)" />
            {/* corner stars - quarters that meet across tiles */}
            <rect x="-19" y="-19" width="38" height="38" />
            <rect x="-19" y="-19" width="38" height="38" transform="rotate(45 0 0)" />
            <rect x="85" y="-19" width="38" height="38" />
            <rect x="85" y="-19" width="38" height="38" transform="rotate(45 104 0)" />
            <rect x="-19" y="85" width="38" height="38" />
            <rect x="-19" y="85" width="38" height="38" transform="rotate(45 0 104)" />
            <rect x="85" y="85" width="38" height="38" />
            <rect x="85" y="85" width="38" height="38" transform="rotate(45 104 104)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="88" fill={`url(#${pid})`} />
    </svg>
  );
}
