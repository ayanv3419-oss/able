import { ImageResponse } from "next/og";
import { createElement } from "react";

export function createAblePwaIcon(size: number) {
  const mark = createElement(
    "svg",
    { height: "58%", viewBox: "0 0 32 32", width: "58%" },
    createElement("path", {
      d: "M7.5 24.5 16 7.5l8.5 17M11.25 17.25h9.5",
      fill: "none",
      stroke: "white",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "3.2",
    }),
    createElement("circle", {
      cx: "16",
      cy: "24.5",
      fill: "white",
      r: "1.9",
    })
  );

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          alignItems: "center",
          background: "#151515",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        },
      },
      mark
    ),
    { height: size, width: size }
  );
}
