const urls = db.getSiblingDB("shrunk_urls").urls;

urls.aggregate([{$group: {_id: "$netid"}}])
    .toArray()
    .forEach(user =>{
	print(user._id);
});
