#!/usr/bin/env python3

import datetime

import pymongo
from pymongo import UpdateOne

cli = pymongo.MongoClient('localhost', 27017)
db = cli.shrunk


def new_tracking_id():
    oid = db.tracking_ids.insert_one({})
    return str(oid.inserted_id)


def add_tracking_id(source_ip):
    tracking_id = new_tracking_id()
    return UpdateOne({'source_ip': source_ip}, {'$set': {'tracking_id': tracking_id}})


def main():
    visitors = list(db.visits.aggregate([{'$project': {'source_ip': 1}}, {'$group': {'_id': '$source_ip'}}]))
    num = len(visitors)
    print(f'processing {num} records')
    timestamp = datetime.datetime.now()
    block_size = 50_000
    for i in range((num + block_size - 1) // block_size):
        begin = block_size * i
        end = min(block_size * (i + 1), num)
        reqs = [add_tracking_id(visitor) for visitor in visitors[begin:end]]
        db.visits.bulk_write(reqs)

        end = datetime.datetime.now()
        delta = end - timestamp
        timestamp = end
        records_per_second = block_size / delta.total_seconds()
        remaining_records = num - i - 1
        seconds_remaining = datetime.timedelta(seconds = remaining_records / records_per_second)
        print(f'done with record {block_size*(i+1)} out of {num} ({100 * (i + 1) / num}%) ({records_per_second} records/s) (eta: {seconds_remaining})')


if __name__ == '__main__':
    main()
