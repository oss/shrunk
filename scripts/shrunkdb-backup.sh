#!/bin/bash
# backup.sh - backs up config.py and the database

PATH=/bin:/usr/bin

BACKUP_DIR=/var/shrunk
BACKUP_CONFIG_DIR=$BACKUP_DIR/config
BACKUP_DUMP_DIR=$BACKUP_DIR/dumps

mkdir -p $BACKUP_CONFIG_DIR $BACKUP_DUMP_DIR

CONFIG=/etc/shrunk/config.py

# highest backup index?
MAX_BACKUPS=4

# rotate dumps
echo "Rotating dumps..."
cd $BACKUP_DUMP_DIR
for n in $(seq $MAX_BACKUPS -1 0)
do
    if [ -d $BACKUP_DUMP_DIR/dump.$n ]
    then
        mv -f dump.$n dump.$(($n+1))
    fi
done
rm -rf dump.$(($MAX_BACKUPS+1))

echo "Creating database dump..."
mongodump -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_users
mongodump -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_visits
mongodump -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_urls

# rotate configs 
echo "Rotating configs..."
cd $BACKUP_CONFIG_DIR
for n in $(seq $MAX_BACKUPS -1 0)
do
    if [ -f $BACKUP_CONFIG_DIR/config.py.$n ]
    then
        mv -f config.py.$n config.py.$(($n+1))
    fi
done
rm -f config.py.$(($MAX_BACKUPS+1))

echo "Backing up configuration file..."
cp $CONFIG $BACKUP_CONFIG_DIR/config.py.0

echo "Complete!"
