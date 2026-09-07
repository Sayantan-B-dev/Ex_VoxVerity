// Isometric wireframe surface — evokes a live risk terrain.
export default function MeshSurface() {
  const cols = 22;
  const rows = 14;
  const w = 520;
  const h = 300;
  const cx = w / 2;

  const project = (c: number, r: number) => {
    const nx = c / (cols - 1) - 0.5;
    const nz = r / (rows - 1);
    // height field
    const y =
      Math.sin(nx * 6 + nz * 3) * 0.5 +
      Math.cos(nx * 4 - nz * 5) * 0.4 +
      Math.sin((nx + 0.2) * 9) * 0.25;
    const persp = 0.45 + nz * 0.9;
    const px = cx + nx * w * persp;
    const py = 70 + nz * 150 - y * 34 * (1 - nz * 0.3);
    return [px, py] as const;
  };

  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let d = "";
    for (let c = 0; c < cols; c++) {
      const [x, y] = project(c, r);
      d += `${c === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    lines.push(d);
  }
  for (let c = 0; c < cols; c++) {
    let d = "";
    for (let r = 0; r < rows; r++) {
      const [x, y] = project(c, r);
      d += `${r === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    lines.push(d);
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mesh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b7dff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5a4bd6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g stroke="url(#mesh)" strokeWidth="0.6" fill="none">
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}