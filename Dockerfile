# Two-stage Keycloak build — Keycloakify JAR theme + optimized runtime.
# See https://www.keycloak.org/server/containers for the recommended pattern.

FROM quay.io/keycloak/keycloak:26.5.5 AS builder

# Build-time configuration. These cannot be changed at runtime with --optimized.
ENV KC_DB=postgres
# `admin-fine-grained-authz:v2` is the forward-compatible name as of
# Keycloak 26.2. The unversioned `admin-fine-grained-authz` is still
# accepted but deprecated. If a future major removes the old name, the
# build would fail with "Unknown feature" — using the :v2 form now
# avoids that trap. `token-exchange` has no equivalent churn.
ENV KC_FEATURES=token-exchange,admin-fine-grained-authz:v2
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_CACHE=local

# Drop the Keycloakify-built theme JAR into the providers directory.
# The Actions pipeline runs `npm run build` in keycloak-theme/ BEFORE this
# Docker build, so the JAR is present in the build context.
COPY keycloak-theme/dist_keycloak/*.jar /opt/keycloak/providers/

# Vendored third-party SPI JARs (email OTP authenticator, etc.).
COPY providers/*.jar /opt/keycloak/providers/

RUN /opt/keycloak/bin/kc.sh build

# Runtime stage — slimmer layer with the augmented distribution only.
FROM quay.io/keycloak/keycloak:26.5.5
COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized"]
