# Build image for Zotero Reference (ILS). Everything needed to build, test and pack the
# plugin lives here, so the host needs nothing but Docker.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends zip git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# In-house CAs (copied from e2e/certs by build.sh, e.g. ILS_GuM: signs *.ils.local, the reverse proxy of the portal):
# system store for curl/git/apt, NODE_EXTRA_CA_CERTS for Node.
COPY certs/ /usr/local/share/ca-certificates/inhouse/
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

WORKDIR /src
