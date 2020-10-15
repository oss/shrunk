#!/bin/bash
# backup.sh - backs up config.py and the database

BACKUP_DIR=/var/shrunk
BACKUP_CONFIG_DIR=$BACKUP_DIR/config
BACKUP_DUMP_DIR=$BACKUP_DIR/dumps

/usr/bin/mkdir -p $BACKUP_CONFIG_DIR $BACKUP_DUMP_DIR

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
        /usr/bin/mv -f dump.$n dump.$(($n+1))
    fi
done
/usr/bin/rm -rf dump.$(($MAX_BACKUPS+1))

echo "Creating database dump..."
/usr/bin/mongodump --quiet -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_users
/usr/bin/mongodump --quiet -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_visits
/usr/bin/mongodump --quiet -o $BACKUP_DUMP_DIR/dump.0 -db=shrunk_urls

# rotate configs 
echo "Rotating configs..."
cd $BACKUP_CONFIG_DIR
for n in $(seq $MAX_BACKUPS -1 0)
do
    if [ -f $BACKUP_CONFIG_DIR/config.py.$n ]
    then
        /usr/bin/mv -f config.py.$n config.py.$(($n+1))
    fi
done
/usr/bin/rm -f config.py.$(($MAX_BACKUPS+1))

echo "Backing up configuration file..."
/usr/bin/cp $CONFIG $BACKUP_CONFIG_DIR/config.py.0

echo "Complete!"
