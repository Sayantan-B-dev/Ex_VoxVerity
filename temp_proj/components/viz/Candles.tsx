// Candlestick-style bar column, amber, trending up.
export default function Candles() {
  const n = 40;
  const bars = Array.from({ length: n }, (_, i) => {
    const base = 20 + (i / n) * 55;
    const noise = Math.sin(i * 1.7) * 10 + (i % 3) * 6;
    const val = Math.max(8, Math.min(96, base + noise));
    return val;
  });
  return (
    <div className="flex h-full items-end gap-[3px]">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${v}%`,
            background: "linear-gradient(180deg,#e0b788,#6b4f34)",
            opacity: 0.5 + (i / n) * 0.5,
          }}
        />
      ))}
    </div>
  );
}