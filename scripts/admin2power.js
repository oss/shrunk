const admins = db.getSiblingDB("shrunk_users").administrators;
const grants = db.getSiblingDB("shrunk_roles").grants;
admins.find().toArray().forEach(admin => {
    print("adding "+ admin.netid);
    role = {
	role: "power_user",
	entity: admin.netid,
    }
    if (grants.findOne(role)) {
	print("already exists");
    } else {
	role.granted_by = (admin.added_by? admin.added_by: "unknown");
	printjson(grants.insertOne(role));
	printjson(role);
    }
});
