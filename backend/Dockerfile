FROM python:3.14 AS base

EXPOSE 3050
WORKDIR /usr/shrunk/backend/

# Copy all files
COPY . .

# Copy GeoLite2-City.mmdb
COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

# Install UV
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"
RUN uv sync

FROM base AS dev

WORKDIR /usr/shrunk/backend/

CMD ["uv", "run", "python3", "-m", "flask", "run", "--host=0.0.0.0", "-p", "3050"]

FROM base AS prod

WORKDIR /usr/shrunk/backend/

RUN pip install uwsgi

ENTRYPOINT ["sh", "entrypoint.sh"]
