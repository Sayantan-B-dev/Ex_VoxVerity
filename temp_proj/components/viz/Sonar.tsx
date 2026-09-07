// Sonar radar sweep with a center readout.
export default function Sonar({ value }: { value: number }) {
  const rings = [1, 0.72, 0.46, 0.22];
  const blips = [
    [0.55, -0.3],
    [-0.4, 0.5],
    [0.2, 0.62],
    [-0.6, -0.2],
    [0.7, 0.15],
    [-0.15, -0.55],
  ];
  return (
    <div className="relative size-40">
      <svg viewBox="-100 -100 200 200" className="size-full">
        <defs>
          <radialGradient id="sonarfill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#35d6c1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#35d6c1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="92" fill="url(#sonarfill)" />
        {rings.map((r) => (
          <circle
            key={r}
            r={92 * r}
            fill="none"
            stroke="#35d6c1"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
        ))}
        <line x1="-92" y1="0" x2="92" y2="0" stroke="#35d6c1" strokeOpacity="0.15" />
        <line x1="0" y1="-92" x2="0" y2="92" stroke="#35d6c1" strokeOpacity="0.15" />
        {blips.map(([x, y], i) => (
          <circle key={i} cx={x * 78} cy={y * 78} r="2.4" fill="#7c6cff" />
        ))}
      </svg>
      {/* rotating sweep */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(53,214,193,0.45), rgba(53,214,193,0) 90deg)",
          animation: "sonar 3.5s linear infinite",
          maskImage: "radial-gradient(circle, #000 62%, transparent 63%)",
          WebkitMaskImage: "radial-gradient(circle, #000 62%, transparent 63%)",
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <span className="dot text-[26px] text-teal">{value}%</span>
      </div>
    </div>
  );
}