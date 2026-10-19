"use client";

import { useEffect, useRef } from "react";

import { bookDimensionInches } from "@/lib/book-dimensions";

import type {
  BookDesignSettings,
  EditorPage,
  TrimPreset,
} from "./editor-types";
import { CanvasElement } from "./canvas-element";
import { PageDesignOverlay } from "./page-design-overlay";

const cssPixelsPerInch = 96;
const bleedInches = 0.125;

export function getKdpPdfPageDimensions(
  trimPreset: TrimPreset,
  bleedEnabled: boolean,
) {
  const trimSize = bookDimensionInches[trimPreset];
  const bleed = bleedEnabled ? bleedInches : 0;
  return {
    trimWidth: trimSize.width,
    trimHeight: trimSize.height,
    width: trimSize.width + bleed,
    height: trimSize.height + bleed * 2,
    bleed,
  };
}

export function KdpExportCanvas({
  page,
  pageIndex,
  trimPreset,
  bleedEnabled,
  pageNumber,
  pageNumberById,
  coverPageId,
  design,
  onReady,
}: {
  page: EditorPage;
  pageIndex: number;
  trimPreset: TrimPreset;
  bleedEnabled: boolean;
  pageNumber: number;
  pageNumberById: Record<string, number>;
  coverPageId: string | null;
  design: BookDesignSettings;
  onReady: (canvas: HTMLDivElement) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const dimensions = getKdpPdfPageDimensions(trimPreset, bleedEnabled);
  const outsideBleed = bleedEnabled && pageIndex % 2 === 1 ? dimensions.bleed : 0;
  const horizontalBleedPercent =
    (dimensions.bleed / dimensions.trimWidth) * 100;
  const verticalBleedPercent =
    (dimensions.bleed / dimensions.trimHeight) * 100;

  const exportElements = page.elements.map((element) => {
    if (!bleedEnabled) return element;

    const extendsLeft = outsideBleed > 0 && element.x <= 0;
    const extendsRight =
      outsideBleed === 0 && element.x + element.width >= 100;
    const extendsTop = element.y <= 0;
    const extendsBottom = element.y + element.height >= 100;
    if (!extendsLeft && !extendsRight && !extendsTop && !extendsBottom) {
      return element;
    }

    return {
      ...element,
      x: element.x - (extendsLeft ? horizontalBleedPercent : 0),
      y: element.y - (extendsTop ? verticalBleedPercent : 0),
      width:
        element.width +
        (extendsLeft ? horizontalBleedPercent : 0) +
        (extendsRight ? horizontalBleedPercent : 0),
      height:
        element.height +
        (extendsTop ? verticalBleedPercent : 0) +
        (extendsBottom ? verticalBleedPercent : 0),
    };
  });

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    if (hostRef.current) onReadyRef.current(hostRef.current);
  }, [page.id]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: "-100000px",
        top: 0,
        width: `${dimensions.width * cssPixelsPerInch}px`,
        height: `${dimensions.height * cssPixelsPerInch}px`,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <div
        ref={hostRef}
        style={{
          position: "relative",
          width: `${dimensions.width * cssPixelsPerInch}px`,
          height: `${dimensions.height * cssPixelsPerInch}px`,
          overflow: "visible",
          backgroundColor: "#fffefa",
        }}
      >
        <div
          data-page-canvas
          data-page-id={page.id}
          style={{
            position: "absolute",
            left: `${outsideBleed * cssPixelsPerInch}px`,
            top: `${dimensions.bleed * cssPixelsPerInch}px`,
            width: `${dimensions.trimWidth * cssPixelsPerInch}px`,
            height: `${dimensions.trimHeight * cssPixelsPerInch}px`,
            overflow: "visible",
            backgroundColor: "#fffefa",
          }}
        >
          {exportElements.map((element) => (
            <CanvasElement
              key={element.id}
              element={element}
              selected={false}
              overlayTarget={null}
              onSelect={() => {}}
              onMove={() => {}}
              onResize={() => {}}
              onRotate={() => {}}
              onUpdateText={() => {}}
            />
          ))}
          <PageDesignOverlay
            design={design}
            pageId={page.id}
            pageNumber={pageNumber}
            pageNumberById={pageNumberById}
            coverPageId={coverPageId}
            selectedElementId={null}
            selectedPageId={null}
            overlayTarget={null}
          />
        </div>
      </div>
    </div>
  );
}
