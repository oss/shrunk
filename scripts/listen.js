// remote
const urlsdb = db.getSiblingDB("shrunk_urls");
const visitsdb = db.getSiblingDB("shrunk_visits");
const c = urlsdb.urls.watch();
const v = visitsdb.visits.watch();

// local
const local_urlsdb = connect("localhost:27017/shrunk_urls")
const local_visitsdb = connect("localhost:27017/shrunk_visits")

const handleUpdate = (coll, update) => {
    print("--------------");
    print(coll.getFullName());
    printjson(update);
    if (update.operationType == "insert") {
	coll.insert(update.fullDocument);
    } else if (update.operationType == "update") {
	printjson(coll.updateOne(update.documentKey,
		       {$set: update.updateDescription.updatedFields}));
    } else if (update.operationType == "delete") {
	coll.deleteOne(update.documentKey)
    }
};

while (!c.isExhausted() && !v.isExhausted()) {
    if (c.hasNext()) {
	handleUpdate(local_urlsdb.urls, c.next());
    }
    if (v.hasNext()) {
	handleUpdate(local_visitsdb.visits, v.next());
    }
}
