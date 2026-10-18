"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import Image from "next/image";

import type { EditorElement, TextFontFamily, TextStyle } from "./editor-types";
import { ShapeGraphic } from "./shape-graphic";
import { getArtSvgDataUri } from "@/lib/designAssets";
import { buildImageFilter } from "./image-filters";

type CanvasElementProps = {
  element: EditorElement;
  selected: boolean;
  overlayTarget: HTMLDivElement | null;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: Geometry) => void;
  onRotate: (rotation: number) => void;
  onUpdateText: (content: string) => void;
};

type Geometry = { x: number; y: number; width: number; height: number };
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type DragStart = Geometry & {
  pointerX: number;
  pointerY: number;
  pageWidth: number;
  pageHeight: number;
  mode: "move" | "resize" | "rotate";
  resizeHandle: ResizeHandle | null;
  rotation: number;
  centerX: number;
  centerY: number;
  pointerAngle: number;
};

const resizeHandles: {
  position: ResizeHandle;
  placement: string;
  cursor: string;
  requiresWidth?: boolean;
  requiresHeight?: boolean;
}[] = [
  { position: "nw", placement: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
  {
    position: "n",
    placement: "left-1/2 -top-1.5 -translate-x-1/2",
    cursor: "ns-resize",
    requiresHeight: true,
  },
  { position: "ne", placement: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
  {
    position: "e",
    placement: "-right-1.5 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
    requiresWidth: true,
  },
  { position: "se", placement: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
  {
    position: "s",
    placement: "left-1/2 -bottom-1.5 -translate-x-1/2",
    cursor: "ns-resize",
    requiresHeight: true,
  },
  { position: "sw", placement: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
  {
    position: "w",
    placement: "-left-1.5 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
    requiresWidth: true,
  },
];

const textStyles: Record<TextStyle, string> = {
  paragraph:
    "font-serif text-[clamp(9px,1.25vw,14px)] leading-relaxed text-[#49534b]",
  heading:
    "font-serif text-[clamp(22px,3.2vw,36px)] font-semibold leading-tight text-[#2b4736]",
  subheading:
    "font-serif text-[clamp(16px,2.2vw,24px)] leading-snug text-[#405d47]",
  body: "text-[clamp(9px,1.15vw,13px)] leading-relaxed text-[#566158]",
  "bullet-list":
    "whitespace-pre-line text-[clamp(9px,1.15vw,13px)] leading-relaxed text-[#566158]",
  "numbered-list":
    "whitespace-pre-line text-[clamp(9px,1.15vw,13px)] leading-relaxed text-[#566158]",
  "pull-quote":
    "border-l-2 border-[#c6a681] pl-3 font-serif text-[clamp(13px,1.8vw,19px)] italic leading-relaxed text-[#51634f]",
  caption: "text-[clamp(8px,0.95vw,11px)] italic text-[#7b847c]",
  "chapter-title":
    "font-serif text-[clamp(24px,4vw,42px)] font-semibold leading-tight tracking-tight text-[#2b4736]",
};

export function CanvasElement({
  element,
  selected,
  overlayTarget,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onUpdateText,
}: CanvasElementProps) {
  const [previewGeometry, setPreviewGeometry] = useState<Geometry | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<DragStart | null>(null);
  const latestGeometry = useRef<Geometry>({
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  });
  const textRef = useRef<HTMLDivElement>(null);
  const editStartContent = useRef("");
  const latestRotation = useRef(element.kind !== "puzzle" ? element.rotation : 0);

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.textContent = editStartContent.current;
      textRef.current.focus();
    }
  }, [editing]);

  const visibleGeometry = previewGeometry ?? element;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || editing) return;
    const page =
      event.currentTarget.closest<HTMLElement>("[data-page-canvas]") ??
      overlayTarget?.parentElement?.querySelector<HTMLElement>(
        "[data-page-canvas]",
      );
    const bounds = page?.getBoundingClientRect();
    if (!bounds) return;

    onSelect();
    const resizeElement =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-resize-handle]")
        : null;
    const rotateElement =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-rotation-handle]")
        : null;
    const handleValue = resizeElement?.dataset.resizeHandle;
    const resizeHandle = isResizeHandle(handleValue) ? handleValue : null;
    const centerX =
      bounds.left + ((visibleGeometry.x + visibleGeometry.width / 2) / 100) * bounds.width;
    const centerY =
      bounds.top + ((visibleGeometry.y + visibleGeometry.height / 2) / 100) * bounds.height;
    const pointerAngle = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX,
    );
    const rotation = element.kind !== "puzzle" ? element.rotation : 0;
    dragStart.current = {
      x: visibleGeometry.x,
      y: visibleGeometry.y,
      width: visibleGeometry.width,
      height: visibleGeometry.height,
      pointerX: event.clientX,
      pointerY: event.clientY,
      pageWidth: bounds.width,
      pageHeight: bounds.height,
      mode: rotateElement ? "rotate" : resizeHandle ? "resize" : "move",
      resizeHandle,
      rotation,
      centerX,
      centerY,
      pointerAngle,
    };
    latestGeometry.current = visibleGeometry;
    latestRotation.current = previewRotation ?? rotation;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;

    if (start.mode === "rotate") {
      const currentAngle = Math.atan2(
        event.clientY - start.centerY,
        event.clientX - start.centerX,
      );
      const delta = normalizeAngle(
        ((currentAngle - start.pointerAngle) * 180) / Math.PI,
      );
      latestRotation.current = clamp(start.rotation + delta, -180, 180);
      setPreviewRotation(latestRotation.current);
      return;
    }

    const dx = ((event.clientX - start.pointerX) / start.pageWidth) * 100;
    const dy = ((event.clientY - start.pointerY) / start.pageHeight) * 100;
    const next =
      start.mode === "resize"
        ? resizeGeometry(start, dx, dy)
        : {
            ...start,
            x: start.x + dx,
            y: start.y + dy,
          };
    latestGeometry.current = next;
    setPreviewGeometry(next);
  }

  function handlePointerUp() {
    if (!dragStart.current) return;
    if (dragStart.current.mode === "rotate") {
      onRotate(latestRotation.current);
    } else if (dragStart.current.mode === "resize") {
      onResize({
        x: latestGeometry.current.x,
        y: latestGeometry.current.y,
        width: latestGeometry.current.width,
        height: latestGeometry.current.height,
      });
    } else {
      onMove({ x: latestGeometry.current.x, y: latestGeometry.current.y });
    }
    dragStart.current = null;
    setPreviewGeometry(null);
    setPreviewRotation(null);
    setIsDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      editing ||
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    event.preventDefault();
    const next = { x: visibleGeometry.x, y: visibleGeometry.y };
    if (event.key === "ArrowUp") next.y -= 1;
    if (event.key === "ArrowDown") next.y += 1;
    if (event.key === "ArrowLeft") next.x -= 1;
    if (event.key === "ArrowRight") next.x += 1;
    onMove(next);
  }

  return (
    <div
      aria-label={
        element.kind === "text"
          ? `${element.textStyle} text`
          : element.kind === "shape"
            ? element.shapeType
            : element.kind
      }
      className={`absolute z-10 touch-none rounded-sm ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onDoubleClick={() => {
        if (element.kind === "text") {
          editStartContent.current = element.content;
          onSelect();
          setEditing(true);
        }
      }}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="group"
      style={{
        left: `${visibleGeometry.x}%`,
        top: `${visibleGeometry.y}%`,
        width: `${visibleGeometry.width}%`,
        height: `${visibleGeometry.height}%`,
        zIndex: element.zIndex,
        transform:
          element.kind === "text" ||
          element.kind === "image" ||
          element.kind === "shape" ||
          element.kind === "artwork"
            ? `rotate(${previewRotation ?? element.rotation}deg)`
            : undefined,
        transformOrigin: "center",
      }}
      tabIndex={0}
    >
      {element.kind === "text" ? (
        <div
          className={`${textStyles[element.textStyle]} h-full min-h-5 overflow-hidden whitespace-pre-wrap break-words outline-none`}
          contentEditable={editing && selected}
          ref={textRef}
          style={{
            color: element.color,
            fontFamily: fontFamilies[element.fontFamily],
            fontSize: `${element.fontSize}px`,
            fontStyle: element.italic ? "italic" : "normal",
            fontWeight: element.bold ? 700 : 400,
            letterSpacing: `${element.tracking}px`,
            lineHeight: element.lineHeight,
            textAlign: element.alignment,
          }}
          onBlur={() => {
            const content = textRef.current?.innerText ?? element.content;
            if (content !== element.content) onUpdateText(content);
            setEditing(false);
          }}
          onInput={(event) => onUpdateText(event.currentTarget.innerText)}
          suppressContentEditableWarning
        >
          {editing
            ? null
            : element.content.split("\n").map((line, index) => (
                <span
                  className="block"
                  key={index}
                  style={{
                    marginBottom:
                      index < element.content.split("\n").length - 1
                        ? `${element.lineSpacing}px`
                        : undefined,
                  }}
                >
                  {line || "\u00a0"}
                </span>
              ))}
        </div>
      ) : (
        <FutureElement element={element} />
      )}
      {selected &&
        (element.kind === "text" ||
          element.kind === "shape" ||
          element.kind === "artwork" ||
        element.kind === "image") &&
      overlayTarget &&
      createPortal(
        <div
          className="pointer-events-none absolute z-[1000]"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            left: `${visibleGeometry.x}%`,
            top: `${visibleGeometry.y}%`,
            width: `${visibleGeometry.width}%`,
            height: `${visibleGeometry.height}%`,
            transform: `rotate(${previewRotation ?? element.rotation}deg)`,
            transformOrigin: "center",
          }}
        >
          <div className="absolute inset-0 rounded-sm outline outline-1 outline-[#6d9875] outline-offset-2" />
          <div className="absolute bottom-full left-1/2 h-5 -translate-x-1/2 border-l border-[#6d9875]" />
          <button
            aria-label={`Rotate ${element.kind}`}
            className="pointer-events-auto absolute -top-10 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white bg-[#5d8866] text-white shadow"
            data-rotation-handle
            style={{ cursor: "grab" }}
            type="button"
          >
            <RotateCw aria-hidden="true" className="size-3.5" />
          </button>
          {resizeHandles
            .filter(
              (handle) =>
                (!handle.requiresWidth || visibleGeometry.width >= 12) &&
                (!handle.requiresHeight || visibleGeometry.height >= 12),
            )
            .map((handle) => (
              <button
                aria-label={`Resize ${element.kind} from ${handle.position}`}
                className={`pointer-events-auto absolute z-20 size-3 rounded-sm border border-white bg-[#5d8866] shadow ${handle.placement}`}
                data-resize-handle={handle.position}
                key={handle.position}
                style={{ cursor: handle.cursor }}
                type="button"
              />
            ))}
        </div>,
        overlayTarget,
      )}
    </div>
  );
}

const fontFamilies: Record<TextFontFamily, string> = {
  serif: "Georgia, serif",
  sans: "Arial, sans-serif",
  mono: '"Courier New", monospace',
};

function FutureElement({
  element,
}: {
  element: Exclude<EditorElement, { kind: "text" }>;
}) {
  if (element.kind === "image") {
    return element.src ? (
      <div
        aria-label={element.alt || "Uploaded image"}
        className="relative box-border h-full w-full overflow-hidden"
        style={{
          borderColor: element.borderColor,
          borderStyle: "solid",
          borderWidth: `${element.borderWidth}px`,
          borderRadius: `${element.borderRadius}px`,
        }}
      >
        <Image
          alt={element.alt}
          className="pointer-events-none select-none object-cover"
          draggable={false}
          fill
          sizes="100vw"
          src={element.src}
          style={{
            filter: buildImageFilter(element.filters),
            opacity: element.opacity / 100,
          }}
          unoptimized
        />
      </div>
    ) : null;
  }
  if (element.kind === "puzzle") {
    return (
      <div className="flex h-full items-center justify-center bg-[#f1f4ee]">
        {element.puzzleType}
      </div>
    );
  }
  if (element.kind === "artwork") {
    const src = getArtSvgDataUri(
      element.artKey,
      element.strokeColor,
      element.strokeWidth,
    );
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={element.artKey}
        className="pointer-events-none size-full select-none"
        draggable={false}
        src={src}
      />
    ) : null;
  }
  return <ShapeGraphic element={element} />;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function isResizeHandle(value: string | undefined): value is ResizeHandle {
  return (
    value === "nw" ||
    value === "n" ||
    value === "ne" ||
    value === "e" ||
    value === "se" ||
    value === "s" ||
    value === "sw" ||
    value === "w"
  );
}

function resizeGeometry(
  start: DragStart,
  dx: number,
  dy: number,
): Geometry {
  const handle = start.resizeHandle;
  if (!handle) return start;

  const minWidth = 0.1;
  const minHeight = 0.1;
  let left = start.x;
  let right = start.x + start.width;
  let top = start.y;
  let bottom = start.y + start.height;

  if (handle.includes("w")) left = Math.min(start.x + dx, right - minWidth);
  if (handle.includes("e")) right = Math.max(left + minWidth, right + dx);
  if (handle.includes("n")) top = Math.min(start.y + dy, bottom - minHeight);
  if (handle.includes("s")) bottom = Math.max(top + minHeight, bottom + dy);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
