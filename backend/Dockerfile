FROM redhat/ubi9

# Expose port 5000 as Flask apps listen to 5000 by default.
EXPOSE 5000

WORKDIR /usr/shrunk/backend/

COPY . .

COPY ./GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb

RUN dnf remove -y python3-requests
RUN dnf update -y && \
    dnf install -y gcc cyrus-sasl-devel openldap-devel openssl-devel python-devel && \
    dnf clean all

RUN pip install poetry
RUN pip install python-ldap==3.4.4

RUN poetry config virtualenvs.create false && poetry install --only main
