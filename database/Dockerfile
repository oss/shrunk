FROM mongo:latest

ENV PRIMARY=0

WORKDIR /root
COPY . .
RUN chmod +x entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]
