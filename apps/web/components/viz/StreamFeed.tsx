// Flowing streamgraph - many thin threads converging into a node then fanning to a bar rail.
export default function StreamFeed() {
  const w = 560;
  const h = 300;
  const nodeX = w * 0.62;
  const nodeY = h * 0.42;
  const palette = ["#35d6c1", "#7c6cff", "#d9a877", "#4b8bff", "#2a9d8f"];

  const threads = Array.from({ length: 34 }, (_, i) => {
    const startY = 40 + (i / 33) * 200;
    const c1x = w * 0.22;
    const c2x = w * 0.44;
    const wobble = (i % 5) * 6 - 12;
    return {
      d: `M -10 ${startY} C ${c1x} ${startY + wobble}, ${c2x} ${nodeY + (startY - nodeY) * 0.2}, ${nodeX} ${nodeY}`,
      color: palette[i % palette.length],
      op: 0.25 + (i % 4) * 0.12,
    };
  });

  // right rail bars
  const bars = Array.from({ length: 16 }, (_, i) => ({
    y: 48 + i * 15,
    len: 40 + ((i * 37) % 90),
    color: palette[i % palette.length],
  }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <g fill="none" strokeWidth="0.8">
        {threads.map((t, i) => (
          <path
            key={i}
            d={t.d}
            stroke={t.color}
            strokeOpacity={t.op}
            strokeDasharray="6 8"
            style={{ animation: `dash-flow ${6 + (i % 5)}s linear infinite` }}
          />
        ))}
      </g>
      <circle cx={nodeX} cy={nodeY} r="5" fill="#35d6c1" />
      <circle cx={nodeX} cy={nodeY} r="10" fill="none" stroke="#35d6c1" strokeOpacity="0.4" />
      <g>
        {bars.map((b, i) => (
          <rect
            key={i}
            x={nodeX + 24}
            y={b.y}
            width={b.len}
            height="4"
            rx="2"
            fill={b.color}
            opacity="0.8"
          />
        ))}
      </g>
    </svg>
  );
}