module.exports = {
  async up(db, _client) {
    const alerts = db.collection('alerts');
    await alerts.insertMany([
      {name: 'orgsv2_newuser', timeCreated: new Date()},
      {name: 'orgsv2_currentuser', timeCreated: new Date()},
    ]);
  },

  async down(db, _client) {
    await db.collection('alerts').drop();
    await db.collection('viewed_alerts').drop();
  }
};
