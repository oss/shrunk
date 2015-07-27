#!/bin/bash
# backup.sh - backs up config.py and the database

BACKUP_DIR=/var/shrunk
BACKUP_CONFIG_DIR=$BACKUP_DIR/config
BACKUP_DUMP_DIR=$BACKUP_DIR/dumps

CONFIG=/etc/shrunk/config.py

# how many backups should be kept?
MAX_BACKUPS=12

# rotate dumps
cd $BACKUP_DUMP_DIR
for n in $(seq $MAX_BACKUPS -1 1)
do
    mv -f dump.$n dump.$(($n+1))
done
rm -rf dump.$(($MAX_BACKUPS+1))

mongodump -o dump.0

# rotate logs
cd $BACKUP_CONFIG_DIR
for n in $(seq $MAX_BACKUPS -1 1)
do
    mv -f config.py.$n config.py.$(($n+1))
done
rm -f config.py.$(($MAX_BACKUPS+1))

cp $CONFIG $BACKUP_CONFIG_DIR/config.py.0
