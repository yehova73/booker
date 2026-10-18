import type { ShapeEditorElement } from "./editor-types";

export function ShapeGraphic({
  element,
  className,
}: {
  element: ShapeEditorElement;
  className?: string;
}) {
  const isStrokeShape =
    element.shapeType === "line" ||
    element.shapeType === "arrow" ||
    element.shapeType === "divider";
  const stroke = element.outlineColor ?? (isStrokeShape ? element.fillColor : "none");
  const shapeProps = {
    fill: isStrokeShape ? "none" : element.fillColor,
    stroke,
    strokeWidth: element.outlineColor === null && !isStrokeShape ? 0 : element.outlineWidth,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      aria-label={element.shapeType}
      className={className ?? "h-full w-full"}
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
      {element.shapeType === "circle" && <circle {...shapeProps} cx="50" cy="50" r="45" />}
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
        <polygon {...shapeProps} points={regularPolygonPoints(element.pentagonSides)} />
      )}
      {element.shapeType === "speech-bubble" && (
        <path
          {...shapeProps}
          d="M12 10H88Q94 10 94 16V68Q94 74 88 74H38L22 91V74H12Q6 74 6 68V16Q6 10 12 10Z"
        />
      )}
      {element.shapeType === "line" && <path {...shapeProps} d="M10 90L90 10" />}
      {element.shapeType === "arrow" && (
        <path {...shapeProps} d="M8 50H88M68 28L90 50L68 72" />
      )}
      {element.shapeType === "divider" && <path {...shapeProps} d="M4 50H96" />}
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
