#!/usr/bin/env python3

import pymongo


cli = pymongo.MongoClient('localhost', 27017)
db = cli.shrunk


def migrate():
    num_documents = db.urls.count_documents()
    for i, url in enumerate(db.urls.find()):
        db.urls.update_one({'_id': url['_id']},
                           {'$set': {'short_url': [
                               {'deleted': False,
                                'alias': url['short_url']}
                           ]}})
        num_finished = i + 1
        if num_finished % 10000 == 0:
            pct_done = num_finished / num_documents * 100
            print(f'{pct_done}% done')


if __name__ == '__main__':
    migrate()
