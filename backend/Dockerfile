FROM python:3.14

EXPOSE 3050
WORKDIR /usr/shrunk/backend/



# Copy all files
COPY . .

# Copy GeoLite2-City.mmdb
COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

# Install backend binary dependencies
RUN apt-get update
RUN apt-get install -y libsasl2-dev libldap2-dev libssl-dev

# install UV
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"
RUN uv sync
