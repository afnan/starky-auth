import "./styles/global.css";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import faviconUrl from "./assets/favicon.svg";

const faviconLink = document.createElement("link");
faviconLink.rel = "icon";
faviconLink.type = "image/svg+xml";
faviconLink.href = faviconUrl;
document.head.appendChild(faviconLink);

const KcPage = lazy(() => import("./login/KcPage"));

// In production, window.kcContext is injected by Keycloak's FreeMarker template.
// In development (npm run dev), we use a mock context to preview pages.
const kcContext = (
  window as { kcContext?: import("keycloakify/login/KcContext").KcContext }
).kcContext;

if (kcContext === undefined) {
  // Dev mode: dynamically import mock factory to keep it out of production bundle
  import("keycloakify/login/KcContext")
    .then(({ createGetKcContextMock }) => {
      const { getKcContextMock } = createGetKcContextMock({
        kcContextExtension: {},
        kcContextExtensionPerPage: {},
      });

      // Adjust pageId here to preview different pages during development
      const mock = getKcContextMock({
        pageId: "login.ftl",
        overrides: {
          realm: {
            registrationAllowed: true,
            resetPasswordAllowed: true,
            loginWithEmailAllowed: true,
          },
          social: {
            displayInfo: true,
            providers: [
              {
                alias: "google",
                displayName: "Google",
                loginUrl: "#",
                providerId: "google",
              },
            ],
          },
        },
      });

      createRoot(document.getElementById("root")!).render(
        <StrictMode>
          <Suspense>
            <KcPage kcContext={mock} />
          </Suspense>
        </StrictMode>
      );
    })
    .catch(() => {
      // Fallback if createGetKcContextMock isn't available in this version
      document.getElementById("root")!.textContent =
        "Dev mode: set window.kcContext or update main.tsx mock";
    });
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Suspense>
        <KcPage kcContext={kcContext} />
      </Suspense>
    </StrictMode>
  );
}
