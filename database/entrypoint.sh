#!/usr/bin/env sh

# Starts a replica set on member0, you must have three mongodb running.
# They must be named the following
#    mongo0
#    mongo1 
#    mongo2
# Port 27017 should be open.

# Waits until mongosh is ready, then execute the replica set intialization. Note
# that this must be only called for one of the databases.
replicaset() {
	while ! mongosh --eval 'db.version()' >/dev/null 2>/dev/null; do
		echo "mongo not ready... waiting..."
		sleep 1
	done
	echo "mongo version $(mongosh --eval 'db.version()') is ready..."

	echo "creating mongo replica set..."
	mongosh --eval 'rs.initiate({ "_id" : "rs0", "members" : [
	    {
		"_id" : 0,
		"host" : "mongodb0:27017",
	    },
	    {
		"_id" : 1,
		"host" : "mongodb1:27017",
	    },
	    {
		"_id" : 2,
		"host" : "mongodb2:27017",
	    }]
	});'

	mongosh --eval 'rs.conf()'
}

# Use the PRIMARY env to determine which database to make primary.
# Do NOT set this on multiple databases, there should be only one
# primary database
if [ "$PRIMARY" = "1" ]; then
    replicaset &
fi

exec mongod --bind_ip_all --replSet rs0
