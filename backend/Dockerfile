FROM python:3.6

EXPOSE 4343
WORKDIR /usr/shrunk/backend/

COPY . .
COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

RUN apt-get update
RUN apt-get install -y libsasl2-dev libldap2-dev libssl-dev
RUN pip install --upgrade pip
RUN pip install poetry

RUN poetry config virtualenvs.create false
RUN poetry lock

RUN poetry install