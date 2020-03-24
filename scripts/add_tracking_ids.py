#!/usr/bin/env python3

import pymongo

cli = pymongo.MongoClient('localhost', 27017)
db = cli.shrunk


def new_tracking_id():
    oid = db.tracking_ids.insert({})
    return str(oid)


def add_tracking_id(source_ip, tracking_id):
    db.visits.update({'source_ip': source_ip},
                     {'$set': {'tracking_id': tracking_id}})


for visitor in db.visits.aggregate([{'$project': {'source_ip': 1}},
                                    {'$group': {'_id': '$source_ip'}}]):
    tracking_id = new_tracking_id()
    add_tracking_id(visitor['_id'], tracking_id)
