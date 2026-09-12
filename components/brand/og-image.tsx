import { ImageResponse } from "next/og";
import { ableMark } from "./logo";

/**
 * The social card for Able, shared by the Open Graph and Twitter routes.
 * Colours match the app's dark theme tokens in app/globals.css.
 */
const BACKGROUND = "#151515";
const FOREGROUND = "#ebebeb";
const CARD = "#1c1c1c";
const BUBBLE = "#242424";
const BORDER = "#2c2c2c";
const MUTED = "#8a8a8a";
const ANSWER = "#b4b4b4";

export const ogImageAlt = "Able, a fast AI assistant for students";
export const ogImageContentType = "image/png";
export const ogImageSize = { height: 630, width: 1200 };

export function renderOgImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BACKGROUND,
        color: FOREGROUND,
        display: "flex",
        flexDirection: "row",
        gap: 64,
        height: "100%",
        padding: "72px 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 30,
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
          <svg height={46} viewBox={ableMark.viewBox} width={46}>
            <rect
              fill={FOREGROUND}
              height="32"
              rx={ableMark.radius}
              width="32"
            />
            <path
              d={ableMark.chevron}
              fill="none"
              stroke={BACKGROUND}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={ableMark.strokeWidth}
            />
            <circle
              cx={ableMark.dot.cx}
              cy={ableMark.dot.cy}
              fill={BACKGROUND}
              r={ableMark.dot.r}
            />
          </svg>
          <div style={{ fontSize: 34, letterSpacing: -0.6 }}>Able</div>
        </div>
        <div
          style={{
            fontSize: 72,
            letterSpacing: -2.5,
            lineHeight: 1.05,
          }}
        >
          Ask Able anything.
        </div>
        <div style={{ color: MUTED, fontSize: 30, letterSpacing: -0.4 }}>
          A fast AI assistant for students.
        </div>
      </div>

      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 28,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: 28,
          width: 440,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: BUBBLE,
              borderRadius: 20,
              display: "flex",
              fontSize: 21,
              maxWidth: 330,
              padding: "14px 18px",
            }}
          >
            Explain photosynthesis in simple terms
          </div>
        </div>
        <div
          style={{
            color: ANSWER,
            display: "flex",
            fontSize: 21,
            lineHeight: 1.5,
          }}
        >
          Think of a leaf as a tiny factory. It takes in sunlight, water and
          air, and turns them into the sugar a plant grows on.
        </div>
        <div
          style={{
            alignItems: "center",
            background: BACKGROUND,
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            padding: "10px 10px 10px 20px",
          }}
        >
          <div style={{ color: MUTED, fontSize: 20 }}>Ask anything</div>
          <div
            style={{
              alignItems: "center",
              background: FOREGROUND,
              borderRadius: 999,
              display: "flex",
              height: 38,
              justifyContent: "center",
              width: 38,
            }}
          >
            <svg fill="none" height={18} viewBox="0 0 16 16" width={18}>
              <path
                d="M8 13V3.5M8 3.5 3.8 7.7M8 3.5l4.2 4.2"
                stroke={BACKGROUND}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.9}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>,
    { ...ogImageSize }
  );
}
