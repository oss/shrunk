FROM debian:bookworm-slim 

# Install shib-sp
RUN apt-get update && apt-get install -y \
    ca-certificates \
    shibboleth-sp-common \
    shibboleth-sp-utils

# Allows shibboleth to be ran as any USER
RUN mkdir -p /var/run/shibboleth && \
    chown -R 1001:0 /var/run/shibboleth/ /var/cache/shibboleth /etc/shibboleth/ /var/log/shibboleth && \
    chmod -R g=u /var/run/shibboleth/ /var/cache/shibboleth /etc/shibboleth/ /var/log/shibboleth

COPY --chown=1001:0 entrypoint.sh .

# Run unpriviledged (backcompat for kubernetes)
USER 1001

CMD [ "./entrypoint.sh" ]
