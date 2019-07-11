// This script assumes the new schema (i.e. all collections in the 'shrunk' db)
db = new Mongo().getDB('shrunk');
db.urls.find({'title': {'$regex': '^ .*'}}).forEach(function (doc) {
    db.urls.update({'_id': doc._id}, {'$set': {'title': doc.title.trim()}});
});
