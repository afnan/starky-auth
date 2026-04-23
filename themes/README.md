# Keycloak Themes

Starky's login theme is **not** shipped as classic FreeMarker files under this
directory. It's a **Keycloakify** React project at `../keycloak-theme/` that
compiles into a Keycloak provider JAR.

The JAR is baked into the Docker image at `/opt/keycloak/providers/` by the
builder stage in `../Dockerfile`, and picked up by Keycloak during `kc.sh build`.

## Where to go

| Task                                    | Path                         |
|-----------------------------------------|------------------------------|
| Edit the theme                          | `../keycloak-theme/src/`     |
| Preview locally without Keycloak        | `cd ../keycloak-theme && npm install && npm run dev` |
| Build the JAR locally                   | `cd ../keycloak-theme && npm run build` |
| Design spec                             | `../docs/superpowers/specs/2026-04-22-keycloak-theme-design.md` |
| Implementation plan                     | `../docs/superpowers/plans/2026-04-22-keycloak-theme.md` |

## Adding more themes

Each Keycloakify project builds exactly one theme JAR. If you need a second
realm theme, either:

1. Add another page set to `keycloak-theme/` and output multiple themes from
   one Keycloakify build, **or**
2. Create a sibling sub-project (e.g. `../keycloak-theme-partner/`) and update
   the `Dockerfile` to `COPY` its JAR into `/opt/keycloak/providers/` too.

## Activating a theme

1. Admin console: `https://auth-admin.starkyapp.com`
2. Select the realm
3. **Realm Settings → Themes → Login Theme** → pick `starky` (or your theme name)
4. **Save**
