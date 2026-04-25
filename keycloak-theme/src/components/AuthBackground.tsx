import type { CSSProperties, ReactNode } from "react";
import bgUrl from "../assets/bg.svg";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#eef3ff",
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "24px",
  },
};

export default function AuthBackground({ children }: { children: ReactNode }) {
  return <div style={styles.wrapper}>{children}</div>;
}
