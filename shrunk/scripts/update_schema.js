admin = new Mongo().getDB('admin');
shrunk = new Mongo().getDB('shrunk');

// put all the collections under the "shrunk" database, drop the old collections
print('[1/4] Renaming collections...');
admin.getMongo().getDB('shrunk').dropDatabase();
admin.adminCommand({ renameCollection: 'shrunk_roles.grants', to: 'shrunk.grants' });
admin.adminCommand({ renameCollection: 'shrunk_urls.urls', to: 'shrunk.urls' });
admin.adminCommand({ renameCollection: 'shrunk_visits.visits', to: 'shrunk.visits' });
admin.adminCommand({ renameCollection: 'shrunk_visits.visitors', to: 'shrunk.visitors' });
admin.getMongo().getDB('shrunk_roles').dropDatabase();
admin.getMongo().getDB('shrunk_urls').dropDatabase();
admin.getMongo().getDB('shrunk_visits').dropDatabase();
admin.getMongo().getDB('shrunk_users').dropDatabase();

// remove leading whitespace from titles
print('[2/4] Removing leading whitespace...');
shrunk.urls.find({'title': {'$regex': '^ .*'}}).forEach(function (doc) {
    shrunk.urls.update({'_id': doc._id}, {'$set': {'title': doc.title.trim()}});
});

// normalize the urls and visits collections
print('[3/4] Normalizing db...');
let urls = shrunk.urls.aggregate([
    {'$addFields': {'short_url': '$_id'}},
    {'$project': {'_id': 0}}
]).toArray().map(function (doc) {
    doc.visits = NumberInt(doc.visits);
    return doc;
});
shrunk.urls.remove({});
shrunk.urls.insert(urls);
shrunk.urls.find({}).forEach(function (doc) {
    shrunk.visits.updateMany({'short_url': doc.short_url},
			     {'$set': {'link_id': doc._id},
			      '$unset': {'short_url': ''}});
});

// Some indexes have had their options change, so it's easier
// to drop them all here and allow shrunk to recreate them on startup.
print('[4/4] Removing old indexes...');
shrunk.getCollectionNames().forEach(function (col) {
    shrunk[col].dropIndexes();
});

print('Done!');
