import type { CSSProperties, ReactNode } from "react";
import bgUrl from "../assets/bg.svg";
import logoUrl from "../assets/logo.svg";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#eef3ff",
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "16px",
    gap: "20px",
  },
  logo: {
    height: "40px",
    width: "auto",
    display: "block",
  },
};

export default function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <div style={styles.wrapper}>
      <img src={logoUrl} alt="Starky" style={styles.logo} />
      {children}
    </div>
  );
}
