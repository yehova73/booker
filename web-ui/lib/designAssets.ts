import type { ShapeType } from "@/app/editor/components/editor-types";

export const SHAPE_LIBRARY: { label: string; shapeType: ShapeType }[] = [
  { label: "Rectangle", shapeType: "rectangle" },
  { label: "Circle", shapeType: "circle" },
  { label: "Ellipse", shapeType: "ellipse" },
  { label: "Triangle", shapeType: "triangle" },
  { label: "Star", shapeType: "star" },
  { label: "Pentagon", shapeType: "pentagon" },
  { label: "Line", shapeType: "line" },
  { label: "Arrow", shapeType: "arrow" },
  { label: "Speech bubble", shapeType: "speech-bubble" },
];

export const SHAPE_TYPES: ShapeType[] = SHAPE_LIBRARY.map(
  ({ shapeType }) => shapeType,
);

export function getArtSvgDataUri(
  key: string,
  strokeColor = "#1e293b",
  strokeWidth = 1.8,
) {
  const entry = ART_LIBRARY.find((item) => item.key === key);
  if (!entry) return null;
  const safeColor = /^#[\da-f]{6}$/i.test(strokeColor)
    ? strokeColor
    : "#1e293b";
  const safeWidth = Number.isFinite(strokeWidth)
    ? Math.min(20, Math.max(0, strokeWidth))
    : 1.8;
  const svg = entry.svg
    .replace('stroke="#1e293b"', `stroke="${safeColor}"`)
    .replace('stroke-width="1.8"', `stroke-width="${safeWidth}"`);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function art(inner: string) {
  const graphics = inner.replace(
    /<(circle|path|line|ellipse|polygon|rect)\b/g,
    '<$1 vector-effect="non-scaling-stroke"',
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${graphics}</g></svg>`;
}

function petals(
  cx: number,
  cy: number,
  dist: number,
  rx: number,
  ry: number,
  count: number,
  startAngle = 0,
) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `<ellipse cx="${cx}" cy="${cy - dist}" rx="${rx}" ry="${ry}" transform="rotate(${startAngle + (360 / count) * i} ${cx} ${cy})"/>`;
  }
  return out;
}

function rays(cx: number, cy: number, r1: number, r2: number, count: number) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    out += `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  return out;
}

export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  count: number,
  startDeg = -90,
) {
  const pts = [];
  for (let i = 0; i < count * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((startDeg + (180 / count) * i) * Math.PI) / 180;
    pts.push(
      `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

function snowflake() {
  let out = "";
  for (let i = 0; i < 6; i++) {
    const a = 60 * i;
    out += `<line x1="50" y1="50" x2="50" y2="8" transform="rotate(${a} 50 50)"/>`;
    out += `<line x1="50" y1="22" x2="38" y2="32" transform="rotate(${a} 50 50)"/>`;
    out += `<line x1="50" y1="22" x2="62" y2="32" transform="rotate(${a} 50 50)"/>`;
    out += `<line x1="50" y1="13" x2="42" y2="21" transform="rotate(${a} 50 50)"/>`;
    out += `<line x1="50" y1="13" x2="58" y2="21" transform="rotate(${a} 50 50)"/>`;
  }
  return out;
}

export const ART_LIBRARY = [
  {
    key: "mandala",
    label: "Mandala",
    svg: art(
      `<circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="30"/>${petals(50, 50, 22, 6, 9, 12)}<circle cx="50" cy="50" r="7"/>`,
    ),
  },
  {
    key: "flower",
    label: "Flower",
    svg: art(
      `${petals(50, 52, 17, 9, 14, 6)}<circle cx="50" cy="52" r="8"/><circle cx="50" cy="52" r="3"/>`,
    ),
  },
  {
    key: "sun",
    label: "Sun",
    svg: art(`<circle cx="50" cy="50" r="19"/>${rays(50, 50, 26, 40, 12)}`),
  },
  {
    key: "star",
    label: "Star",
    svg: art(
      `<polygon points="${starPoints(50, 52, 43, 18, 5)}"/><circle cx="50" cy="52" r="6"/>`,
    ),
  },
  {
    key: "heart",
    label: "Heart",
    svg: art(
      `<path d="M50 88 C14 62 8 40 22 26 C34 14 46 20 50 32 C54 20 66 14 78 26 C92 40 86 62 50 88 Z"/>`,
    ),
  },
  {
    key: "butterfly",
    label: "Butterfly",
    svg: art(
      `<path d="M50 34 C32 10 10 22 18 42 C24 58 42 60 50 50"/><path d="M50 34 C68 10 90 22 82 42 C76 58 58 60 50 50"/><path d="M50 52 C36 64 24 78 34 86 C44 94 50 80 50 68"/><path d="M50 52 C64 64 76 78 66 86 C56 94 50 80 50 68"/><ellipse cx="50" cy="52" rx="4" ry="24"/><line x1="50" y1="30" x2="43" y2="16"/><line x1="50" y1="30" x2="57" y2="16"/>`,
    ),
  },
  {
    key: "leaf",
    label: "Leaf",
    svg: art(
      `<path d="M50 10 C84 34 84 68 50 90 C16 68 16 34 50 10 Z"/><line x1="50" y1="16" x2="50" y2="84"/><line x1="50" y1="34" x2="32" y2="46"/><line x1="50" y1="48" x2="30" y2="60"/><line x1="50" y1="62" x2="34" y2="72"/><line x1="50" y1="34" x2="68" y2="46"/><line x1="50" y1="48" x2="70" y2="60"/><line x1="50" y1="62" x2="66" y2="72"/>`,
    ),
  },
  {
    key: "tree",
    label: "Tree",
    svg: art(
      `<circle cx="50" cy="32" r="20"/><circle cx="30" cy="50" r="16"/><circle cx="70" cy="50" r="16"/><rect x="44" y="60" width="12" height="28"/>`,
    ),
  },
  {
    key: "fish",
    label: "Fish",
    svg: art(
      `<ellipse cx="44" cy="50" rx="30" ry="18"/><polygon points="72,50 94,32 94,68"/><circle cx="30" cy="44" r="2.5"/><path d="M44 32 C50 24 60 26 62 34"/><path d="M44 68 C50 76 60 74 62 66"/>`,
    ),
  },
  {
    key: "balloon",
    label: "Balloon",
    svg: art(
      `<circle cx="50" cy="36" r="25"/><path d="M46 60 L50 66 L54 60"/><path d="M50 66 C60 74 40 82 50 92"/>`,
    ),
  },
  { key: "snowflake", label: "Snowflake", svg: art(snowflake()) },
  {
    key: "cupcake",
    label: "Cupcake",
    svg: art(
      `<path d="M30 48 L70 48 L64 88 L36 88 Z"/><path d="M28 48 C26 30 40 20 50 26 C60 20 74 30 72 48"/><circle cx="50" cy="16" r="4"/>`,
    ),
  },
  {
    key: "cat",
    label: "Cat",
    svg: art(
      `<circle cx="50" cy="56" r="28"/><path d="M28 36 L24 12 L44 28"/><path d="M72 36 L76 12 L56 28"/><circle cx="40" cy="52" r="2.5"/><circle cx="60" cy="52" r="2.5"/><path d="M50 62 L46 66 L54 66 Z"/><line x1="18" y1="58" x2="34" y2="60"/><line x1="18" y1="66" x2="34" y2="66"/><line x1="82" y1="58" x2="66" y2="60"/><line x1="82" y1="66" x2="66" y2="66"/>`,
    ),
  },
  {
    key: "rainbow",
    label: "Rainbow",
    svg: art(
      `<path d="M10 78 A40 40 0 0 1 90 78"/><path d="M22 78 A28 28 0 0 1 78 78"/><path d="M34 78 A16 16 0 0 1 66 78"/><line x1="4" y1="78" x2="96" y2="78"/>`,
    ),
  },
  {
    key: "pumpkin",
    label: "Pumpkin",
    svg: art(
      `<ellipse cx="50" cy="60" rx="34" ry="28"/><ellipse cx="50" cy="60" rx="16" ry="28"/><path d="M50 32 L50 20"/><path d="M50 24 C60 16 70 20 70 26"/>`,
    ),
  },
  {
    key: "apple",
    label: "Apple",
    svg: art(
      `<path d="M50 32 C36 18 16 30 20 50 C24 74 40 88 50 86 C60 88 76 74 80 50 C84 30 64 18 50 32 Z"/><line x1="50" y1="32" x2="50" y2="18"/><path d="M50 22 C58 12 72 14 72 22 C62 28 54 28 50 22 Z"/>`,
    ),
  },
];
