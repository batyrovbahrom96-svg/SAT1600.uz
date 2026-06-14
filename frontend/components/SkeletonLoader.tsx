import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  borderRadius?: CSSProperties["borderRadius"];
  style?: CSSProperties;
};

export function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = "6px",
  style
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className="skeleton-loader"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}
