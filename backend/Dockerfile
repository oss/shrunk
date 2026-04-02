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
# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh 
RUN uv sync 


# Install dependencies for docker-compose.tests.yml
RUN python3 -m pip install pytest watchdog
