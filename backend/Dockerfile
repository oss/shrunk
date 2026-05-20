FROM python:3.14 AS base

EXPOSE 3050
WORKDIR /usr/shrunk/backend/

# Install uv
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates libsasl2-dev
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Compile bytecode (better startup perf but slower build)
# Use copy link mode (since we use the cache mount later)
# Disable python downloads since we want to use the system interpreter
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
ENV PATH="/root/.local/bin/:$PATH"

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

COPY . .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

FROM python:3.14

ENV PATH="/usr/shrunk/backend/.venv/bin:$PATH"

COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb
COPY --from=base /usr/shrunk/backend/ /usr/shrunk/backend/
WORKDIR /usr/shrunk/backend/

ENTRYPOINT ["sh", "entrypoint.sh"]
