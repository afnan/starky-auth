import type { CSSProperties, ReactNode } from "react";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#eef3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "24px",
  },
  blobTopLeft: {
    position: "absolute",
    top: "-180px",
    left: "-180px",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,123,255,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: "-180px",
    right: "-180px",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,123,255,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
};

export default function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.blobTopLeft} aria-hidden="true" />
      <div style={styles.blobBottomRight} aria-hidden="true" />
      {children}
    </div>
  );
}
