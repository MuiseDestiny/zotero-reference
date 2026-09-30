# E2E image: a real Zotero under Xvfb (virtual X server, no display needed),
# plus Node for the fixture PDF. The Zotero version is a build argument (e2e/run.sh builds one image per version).
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates libnss3-tools curl xz-utils bzip2 xvfb xauth \
      libgtk-3-0 libegl1 libdbus-glib-1-2 libasound2 libx11-xcb1 libxtst6 libpci3 fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

# Zotero 7 ships as .tar.bz2, Zotero 8+ as .tar.xz.
ARG ZOTERO_VERSION=10.0.3
RUN base="https://download.zotero.org/client/release/${ZOTERO_VERSION}/Zotero-${ZOTERO_VERSION}_linux-x86_64" \
 && (curl -fsSL "$base.tar.xz" | tar -xJ -C /opt || curl -fsSL "$base.tar.bz2" | tar -xj -C /opt) \
 && mv /opt/Zotero_linux-x86_64 /opt/zotero

# In-house CAs (e2e/certs/*.crt): system store for curl/Node;
# Zotero has its own NSS store, run-in-container.sh adds them to the test profile.
COPY certs/ /usr/local/share/ca-certificates/inhouse/
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

COPY make-pdf.mjs run-in-container.sh /e2e/
RUN node /e2e/make-pdf.mjs /fixtures && chmod +x /e2e/run-in-container.sh

ENTRYPOINT ["/e2e/run-in-container.sh"]
