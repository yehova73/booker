"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import Image from "next/image";

import type { EditorElement, TextFontFamily, TextStyle } from "./editor-types";
import { ShapeGraphic } from "./shape-graphic";

type CanvasElementProps = {
  element: EditorElement;
  selected: boolean;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onUpdateText: (content: string) => void;
};

type Geometry = { x: number; y: number; width: number; height: number };
type DragStart = Geometry & {
  pointerX: number;
  pointerY: number;
  pageWidth: number;
  pageHeight: number;
  mode: "move" | "resize";
};

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
  onSelect,
  onMove,
  onResize,
  onUpdateText,
}: CanvasElementProps) {
  const [previewGeometry, setPreviewGeometry] = useState<Geometry | null>(null);
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

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.textContent = editStartContent.current;
      textRef.current.focus();
    }
  }, [editing]);

  const visibleGeometry = previewGeometry ?? element;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || editing) return;
    const page = event.currentTarget.closest<HTMLElement>("[data-page-canvas]");
    const bounds = page?.getBoundingClientRect();
    if (!bounds) return;

    onSelect();
    const target = event.target;
    const mode =
      target instanceof HTMLElement && target.closest("[data-resize-handle]")
        ? "resize"
        : "move";
    dragStart.current = {
      x: visibleGeometry.x,
      y: visibleGeometry.y,
      width: visibleGeometry.width,
      height: visibleGeometry.height,
      pointerX: event.clientX,
      pointerY: event.clientY,
      pageWidth: bounds.width,
      pageHeight: bounds.height,
      mode,
    };
    latestGeometry.current = visibleGeometry;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;

    const dx = ((event.clientX - start.pointerX) / start.pageWidth) * 100;
    const dy = ((event.clientY - start.pointerY) / start.pageHeight) * 100;
    const next =
      start.mode === "resize"
        ? {
            ...start,
            width: clamp(start.width + dx, 8, 100 - start.x),
            height: clamp(start.height + dy, 5, 100 - start.y),
          }
        : {
            ...start,
            x: clamp(start.x + dx, 0, 100 - start.width),
            y: clamp(start.y + dy, 0, 100 - start.height),
          };
    latestGeometry.current = next;
    setPreviewGeometry(next);
  }

  function handlePointerUp() {
    if (!dragStart.current) return;
    if (dragStart.current.mode === "resize") {
      onResize({
        width: latestGeometry.current.width,
        height: latestGeometry.current.height,
      });
    } else {
      onMove({ x: latestGeometry.current.x, y: latestGeometry.current.y });
    }
    dragStart.current = null;
    setPreviewGeometry(null);
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
    if (event.key === "ArrowUp")
      next.y = clamp(next.y - 1, 0, 100 - element.height);
    if (event.key === "ArrowDown")
      next.y = clamp(next.y + 1, 0, 100 - element.height);
    if (event.key === "ArrowLeft")
      next.x = clamp(next.x - 1, 0, 100 - element.width);
    if (event.key === "ArrowRight")
      next.x = clamp(next.x + 1, 0, 100 - element.width);
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
        selected ? "outline outline-1 outline-[#6d9875] outline-offset-2" : ""
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
          element.kind === "text" || element.kind === "shape"
            ? `rotate(${element.rotation}deg)`
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
      {selected && (element.kind === "text" || element.kind === "shape") && (
        <button
          aria-label={element.kind === "text" ? "Resize text box" : "Resize shape"}
          className="absolute -bottom-1.5 -right-1.5 z-20 size-3 cursor-nwse-resize rounded-sm border border-white bg-[#5d8866] shadow"
          data-resize-handle
          type="button"
        />
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
      <Image
        alt={element.alt}
        className="object-cover"
        fill
        sizes="100vw"
        src={element.src}
        unoptimized
      />
    ) : null;
  }
  if (element.kind === "puzzle") {
    return (
      <div className="flex h-full items-center justify-center bg-[#f1f4ee]">
        {element.puzzleType}
      </div>
    );
  }
  return <ShapeGraphic element={element} />;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
