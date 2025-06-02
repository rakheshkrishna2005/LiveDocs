"use client"

interface UserCursorProps {
  x: number
  y: number
  displayName: string
  color: string
}

export function UserCursor({ x, y, displayName, color }: UserCursorProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 50,
      }}
    >
      <div className="relative">
        {/* Cursor */}
        <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill={color}
            stroke="#000000"
            strokeOpacity="0.12"
            strokeWidth="1"
          />
        </svg>

        <div
          className="absolute top-0 left-6 px-2 py-1 rounded-md text-xs whitespace-nowrap shadow-sm"
          style={{
            backgroundColor: color,
            color: "#000",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          {displayName}
        </div>
      </div>
    </div>
  )
}
