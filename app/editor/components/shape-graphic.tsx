import type { ShapeEditorElement } from "./editor-types";

export function ShapeGraphic({
  element,
  className,
}: {
  element: ShapeEditorElement;
  className?: string;
}) {
  const lineWidth = element.outlineWidth;
  const isOrnament =
    element.shapeType === "line" && element.lineStyle === "ornament";
  const stroke = element.outlineColor ?? element.fillColor;
  const lineCapRadius = element.lineCap === "round" ? "9999px" : "0px";

  if (isOrnament) {
    const diamondSize = Math.max(6, lineWidth * 1.5);
    const spacing = Math.max(2, lineWidth);
    return (
      <div
        aria-label="ornament line"
        className="pointer-events-none flex h-full w-full items-center justify-center overflow-visible"
        role="img"
        style={{ gap: spacing + 4 }}
      >
        <span
          className="min-w-0 flex-1"
          style={{
            height: lineWidth,
            borderRadius: lineCapRadius,
            backgroundColor: stroke,
          }}
        />
        <span
          className="shrink-0"
          style={{
            width: diamondSize,
            height: diamondSize,
            transform: "rotate(45deg)",
            backgroundColor: stroke,
          }}
        />
        <span
          className="min-w-0 flex-1"
          style={{
            height: lineWidth,
            borderRadius: lineCapRadius,
            backgroundColor: stroke,
          }}
        />
      </div>
    );
  }

  if (element.shapeType === "arrow") {
    const arrowHeadHeight = Math.max(6, lineWidth * 2);
    const arrowHeadWidth = arrowHeadHeight * 1.5;
    return (
      <div
        aria-label="arrow"
        className="pointer-events-none relative h-full w-full overflow-visible"
        role="img"
      >
        <span
          className="absolute left-0 top-1/2 block -translate-y-1/2 rounded-full"
          style={{
            width: `max(0px, calc(100% - ${arrowHeadWidth * 0.75}px))`,
            height: lineWidth,
            backgroundColor: stroke,
          }}
        />
        <span
          className="absolute right-0 top-1/2 block -translate-y-1/2"
          style={{
            width: arrowHeadWidth,
            height: arrowHeadHeight,
            clipPath: "polygon(0 0, 100% 50%, 0 100%)",
            backgroundColor: stroke,
          }}
        />
      </div>
    );
  }

  const isStrokeShape = element.shapeType === "line";
  const shapeProps = {
    fill: isStrokeShape ? "none" : element.fillColor,
    stroke,
    strokeWidth:
      element.outlineColor === null && !isStrokeShape ? 0 : lineWidth,
    strokeDasharray:
      element.shapeType === "line" && element.lineStyle === "dashed"
        ? "8 6"
        : element.shapeType === "line" && element.lineStyle === "dotted"
          ? "0 8"
          : undefined,
    strokeLinejoin: "round" as const,
    strokeLinecap: element.shapeType === "line" ? element.lineCap : "round",
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      aria-label={
        element.shapeType === "line"
          ? `${element.lineStyle} line`
          : element.shapeType
      }
      className={className ?? "h-full w-full"}
      overflow="visible"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 100 100"
    >
      {element.shapeType === "rectangle" && (
        <rect
          {...shapeProps}
          height="90"
          rx={element.cornerRadius}
          width="90"
          x="5"
          y="5"
        />
      )}
      {element.shapeType === "circle" && (
        <circle {...shapeProps} cx="50" cy="50" r="45" />
      )}
      {element.shapeType === "ellipse" && (
        <ellipse {...shapeProps} cx="50" cy="50" rx="46" ry="36" />
      )}
      {element.shapeType === "triangle" && (
        <polygon {...shapeProps} points={regularPolygonPoints(3)} />
      )}
      {element.shapeType === "star" && (
        <polygon {...shapeProps} points={starPoints(element.starPoints)} />
      )}
      {element.shapeType === "pentagon" && (
        <polygon
          {...shapeProps}
          points={regularPolygonPoints(element.pentagonSides)}
        />
      )}
      {element.shapeType === "speech-bubble" && (
        <path
          {...shapeProps}
          d="M12 10H88Q94 10 94 16V68Q94 74 88 74H38L22 91V74H12Q6 74 6 68V16Q6 10 12 10Z"
        />
      )}
      {element.shapeType === "line" && element.lineStyle === "double" && (
        <>
          <path {...shapeProps} d="M5 43H95" />
          <path {...shapeProps} d="M5 57H95" />
        </>
      )}
      {element.shapeType === "line" &&
        element.lineStyle !== "double" &&
        element.lineStyle !== "ornament" && (
          <path {...shapeProps} d="M5 50H95" />
        )}
    </svg>
  );
}

function regularPolygonPoints(sides: number) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index * 2 * Math.PI) / sides - Math.PI / 2;
    return pointAt(angle, 46);
  }).join(" ");
}

function starPoints(points: number) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const angle = (index * Math.PI) / points - Math.PI / 2;
    return pointAt(angle, index % 2 === 0 ? 47 : 20);
  }).join(" ");
}

function pointAt(angle: number, radius: number) {
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return `${x},${y}`;
}
