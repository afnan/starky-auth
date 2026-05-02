import type { CSSProperties, ReactNode } from "react";
import bgUrl from "../assets/bg.svg";
import logoUrl from "../assets/logo.svg";

const LOGO_TOP_OFFSET = 40;
const LOGO_HEIGHT = 40;
const LOGO_BREATHING_ROOM = 24;

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
    // Reserve room so the absolutely-positioned logo never overlaps the card on short viewports.
    padding: `${LOGO_TOP_OFFSET + LOGO_HEIGHT + LOGO_BREATHING_ROOM}px 16px 16px`,
    gap: "20px",
  },
  logo: {
    position: "absolute",
    top: `${LOGO_TOP_OFFSET}px`,
    left: "50%",
    transform: "translateX(-50%)",
    height: `${LOGO_HEIGHT}px`,
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
