# Two-stage Keycloak build — themes + optimized runtime.
# See https://www.keycloak.org/server/containers for the recommended pattern.

FROM quay.io/keycloak/keycloak:26.1 AS builder

# Build-time configuration. These cannot be changed at runtime with --optimized.
ENV KC_DB=postgres
ENV KC_FEATURES=token-exchange,admin-fine-grained-authz
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_CACHE=local

# Copy only the production theme directory (not the Tailwind source).
# The Actions pipeline builds styles.css into themes/starky/login/resources/css/
# BEFORE this Docker build runs, so the output lands here too.
COPY themes/starky/login/ /opt/keycloak/themes/starky/login/

RUN /opt/keycloak/bin/kc.sh build

# Runtime stage — slimmer layer with the augmented distribution only.
FROM quay.io/keycloak/keycloak:26.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized"]
