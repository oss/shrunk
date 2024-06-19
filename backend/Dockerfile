FROM python:3.6

# Expose port 5000 as Flask apps listen to 5000 by default.
EXPOSE 5000

WORKDIR /usr/shrunk/backend/

COPY . .

COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

# Install dependencies
RUN apt-get update
RUN apt-get install libsasl2-dev libldap2-dev libssl-dev
RUN pip install --upgrade pip
RUN pip install -r requirements.txt