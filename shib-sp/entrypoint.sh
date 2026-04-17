#!/usr/bin/env sh

# This is mainly for use in k8, since mounting a volume destroys all existing
# files inside the directory, we need to instead mount to some intermediate
# location and then copy over the config files, in order to retain the config.
cp /etc/shibconfig/* /etc/shibboleth
exec /usr/sbin/shibd -f -F -c /etc/shibboleth/shibboleth2.xml -w 30
