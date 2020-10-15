module.exports = {
  async up(db, client) {
    async function new_tracking_id() {
      const res = await db.collection('tracking_ids').insertOne({});
      return res.insertedId.toString();
    }

    async function add_tracking_id(source_ip) {
      const tracking_id = await new_tracking_id();
      return {
        updateMany: {
          filter: {source_ip: source_ip},
          update: {$set: {tracking_id: tracking_id}},
        }
      };
    }

    const visitors = await db.collection('visits').aggregate([
      {$project: {source_ip: 1}},
      {$group: {_id: '$source_ip'}},
    ]);

    const ops = await Promise.all(
        await visitors.map(visitor => add_tracking_id(visitor['_id']))
            .toArray());
    await db.collection('visits').bulkWrite(ops);
  },

  async down(db, client) {
    await db.collection('tracking_ids').drop();
    await db.collection('visits').updateMany(
        {tracking_id: {$exists: true}}, {$unset: {tracking_id: 1}});
  }
};
