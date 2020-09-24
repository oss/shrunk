module.exports = {
  async up(db, client) {
    // Drop this index to avoid violating the unique constraint on short_url
    // when we do $unset: {short_url: 1} in the update step.
    await db.collection('urls').dropIndex('short_url_1');

    const urls =
        await db.collection('urls')
            .aggregate([{$project: {_id: 1, short_url: 1, deleted: 1}}])
            .toArray();

    const urls_ops = urls.map(
        url => ({
          updateOne: {
            filter: {_id: url['_id']},
            update: {
              $set: {
                aliases:
                    [{deleted: Boolean(url.deleted), alias: url.short_url}],
                deleted: Boolean(url.deleted),
              },
              $unset: {short_url: 1},
            }
          }
        }));

    await db.collection('urls').bulkWrite(urls_ops);

    const visits_ops = urls.map(url => ({
                                  updateMany: {
                                    filter: {link_id: url['_id']},
                                    update: {
                                      $set: {
                                        alias: url['short_url'],
                                      },
                                    },
                                  },
                                }));

    await db.collection('visits').bulkWrite(visits_ops);

    // After updating everything, add an index on the short urls again.
    await db.collection('urls').createIndex({'aliases.alias': 1});
  },

  async down(db, client) {
    // Drop the index on the aliases.alias field
    await db.collection('urls').dropIndex('aliases.alias_1');

    const urls = await db.collection('urls').aggregate(
        [{$project: {_id: 1, aliases: 1}}]);

    const urls_ops = urls.map(url => ({
                                updateOne: {
                                  filter: {_id: url['_id']},
                                  update: {
                                    $set: {
                                      short_url: aliases[0].alias,
                                    },
                                    $unset: {aliases: 1},
                                  }
                                }
                              }));

    await db.collection('urls').bulkWrite(urls_ops);

    await db.collection('visits').updateMany({}, {$unset: {alias: 1}});

    // Create an index on the short_url field
    await db.collection('urls').createIndex({short_url: 1}, {unique: true});
  }
};
