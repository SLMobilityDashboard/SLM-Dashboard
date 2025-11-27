"use client"

import type { CanvasElement } from "../types/professional-types"

interface CanvasTextProps {
  element: CanvasElement
}

export function CanvasText({ element }: CanvasTextProps) {
  const content = element.config.content || "Enter your text content here..."

  return (
    <div className="h-full p-2">
      <div
        className="text-sm leading-relaxed h-full overflow-auto"
        style={{
          textAlign: element.style?.textAlign || "left",
          fontSize: element.style?.fontSize || 14,
          fontWeight: element.style?.fontWeight || "normal",
        }}
      >
        {content}
      </div>
    </div>
  )
}
