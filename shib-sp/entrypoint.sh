#!/usr/bin/env sh

cp /etc/shibconfig/* /etc/shibboleth
exec /usr/sbin/shibd -f -F -c /etc/shibboleth/shibboleth2.xml -w 30
