FROM redhat/ubi9

EXPOSE 5000
WORKDIR /usr/shrunk/backend/

COPY . .

COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

RUN dnf remove -y python3-requests
RUN dnf update -y && \
    dnf install -y gcc cyrus-sasl-devel openldap-devel openssl-devel python-devel && \
    dnf clean all

RUN pip install poetry

RUN poetry config virtualenvs.create false && poetry install --only main
