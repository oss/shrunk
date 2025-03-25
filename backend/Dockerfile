FROM python:3.6

EXPOSE 3050
WORKDIR /usr/shrunk/backend/

# Copy all files
COPY . .

# Copy GeoLite2-City.mmdb
COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

# Install backend binary dependencies
RUN apt-get update
RUN apt-get install -y libsasl2-dev libldap2-dev libssl-dev
RUN pip install --upgrade pip
RUN pip install poetry

# Poetry configuration
RUN poetry config virtualenvs.create false
RUN poetry lock

# Install backend Python dependencies
RUN poetry install

# Install dependencies for docker-compose.tests.yml
RUN python3 -m pip install pytest watchdog
