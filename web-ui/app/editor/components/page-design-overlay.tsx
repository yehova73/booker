"use client";

import type { CSSProperties } from "react";

import type { BookDesignSettings, RepeatingDesignElement } from "./editor-types";
import { CanvasElement } from "./canvas-element";

export function PageDesignOverlay({
  design,
  pageId,
  pageNumber,
  coverPageId,
  pageNumberById,
  selectedElementId,
  selectedPageId,
  overlayTarget,
  interactive = false,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
  onUpdateText,
}: {
  design: BookDesignSettings;
  pageId: string;
  pageNumber: number;
  coverPageId: string | null;
  pageNumberById: Record<string, number>;
  selectedElementId: string | null;
  selectedPageId: string | null;
  overlayTarget: HTMLDivElement | null;
  interactive?: boolean;
  onSelectElement?: (elementId: string) => void;
  onMoveElement?: (
    elementId: string,
    position: { x: number; y: number; pageId?: string },
  ) => void;
  onResizeElement?: (
    elementId: string,
    size: { x: number; y: number; width: number; height: number },
  ) => void;
  onRotateElement?: (elementId: string, rotation: number) => void;
  onUpdateText?: (elementId: string, content: string) => void;
}) {
  if (
    pageId === coverPageId ||
    design.excludedPageIds.includes(pageId)
  ) {
    return null;
  }

  const isRightPage = pageNumber % 2 === 1;
  const { pageBorder, pageNumbers } = design;
  const pageNumberStyle = getPageNumberStyle(pageNumbers.position, isRightPage);

  return (
    <>
      {pageBorder.enabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          data-cover-exclude="true"
          style={{
            inset: `${pageBorder.inset}%`,
            borderColor: pageBorder.color,
            borderStyle: pageBorder.style,
            borderWidth: `${pageBorder.width}px`,
            zIndex: 5,
          }}
        />
      )}
      {pageNumbers.enabled && (
        <div
          aria-label={`Page number ${formatPageNumber(pageNumber, pageNumbers.format)}`}
          className="pointer-events-none absolute"
          data-cover-exclude="true"
          style={{
            ...pageNumberStyle,
            color: pageNumbers.color,
            fontFamily:
              pageNumbers.fontFamily === "serif"
                ? "Georgia, serif"
                : pageNumbers.fontFamily === "mono"
                  ? '"Courier New", monospace'
                  : "Arial, sans-serif",
            fontSize: `${pageNumbers.fontSize}px`,
            lineHeight: 1,
            zIndex: 6,
          }}
        >
          {formatPageNumber(pageNumber, pageNumbers.format)}
        </div>
      )}
      {design.elements.map((element) => {
        const displayElement = mirrorElement(element, isRightPage);
        return (
          <CanvasElement
            key={element.id}
            element={displayElement}
            selected={
              interactive &&
              selectedElementId === element.id &&
              selectedPageId === pageId
            }
            overlayTarget={interactive ? overlayTarget : null}
            onSelect={() => {
              if (interactive) onSelectElement?.(element.id);
            }}
            onMove={(position) => {
              if (!interactive) return;
              const destinationPageNumber =
                pageNumberById[position.pageId ?? pageId] ?? pageNumber;
              const destinationIsRightPage = destinationPageNumber % 2 === 1;
              onMoveElement?.(element.id, {
                ...position,
                x: unmirrorX(
                  position.x,
                  displayElement.width,
                  destinationIsRightPage,
                ),
                pageId: undefined,
              });
            }}
            onResize={(size) => {
              if (!interactive) return;
              onResizeElement?.(element.id, {
                ...size,
                x: unmirrorX(size.x, size.width, isRightPage),
              });
            }}
            onRotate={(rotation) => {
              if (interactive) onRotateElement?.(element.id, rotation);
            }}
            onUpdateText={(content) => {
              if (interactive) onUpdateText?.(element.id, content);
            }}
          />
        );
      })}
    </>
  );
}

function mirrorElement(
  element: RepeatingDesignElement,
  isRightPage: boolean,
): RepeatingDesignElement {
  return {
    ...element,
    x: isRightPage ? 100 - element.x - element.width : element.x,
    zIndex: element.zIndex + 1000,
  };
}

function unmirrorX(x: number, width: number, isRightPage: boolean) {
  return isRightPage ? 100 - x - width : x;
}

function getPageNumberStyle(
  position: BookDesignSettings["pageNumbers"]["position"],
  isRightPage: boolean,
): CSSProperties {
  const isTop = position.startsWith("top");
  const isCenter = position.endsWith("center");
  const isOuter = position.endsWith("outer");
  const onRightSide = isCenter
    ? false
    : isOuter
      ? isRightPage
      : !isRightPage;
  return {
    top: isTop ? "3%" : undefined,
    bottom: isTop ? undefined : "3%",
    left: isCenter ? "50%" : onRightSide ? undefined : "3%",
    right: isCenter ? undefined : onRightSide ? "3%" : undefined,
    transform: isCenter ? "translateX(-50%)" : undefined,
  };
}

function formatPageNumber(
  pageNumber: number,
  format: BookDesignSettings["pageNumbers"]["format"],
) {
  if (format === "arabic") return String(pageNumber);
  const numerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remainder = pageNumber;
  let output = "";
  for (const [value, numeral] of numerals) {
    while (remainder >= value) {
      output += numeral;
      remainder -= value;
    }
  }
  if (pageNumber < 1 || pageNumber > 3999) return String(pageNumber);
  return format === "roman-lower" ? output.toLowerCase() : output;
}
