#!/usr/bin/env python3

import click
import pymongo


def print_table(columns, data):
    widths = {}
    for name, _ in columns:
        widths[name] = max(len(name), max(len(row[name]) for row in data))

    def print_row(row, sep=" | "):
        for idx, (name, align) in enumerate(columns):
            field = row[name]
            width = widths[name]
            if align == "left":
                print(field + (width - len(field)) * " ", end="")
            elif align == "right":
                print((width - len(field)) * " " + field, end="")
            else:
                assert False
            if idx == len(columns) - 1:
                print()
            else:
                print(sep, end="")

    print_row({name: name for (name, _) in columns})
    print_row({name: widths[name] * "-" for (name, _) in columns}, sep="-|-")
    for row in data:
        print_row(row)


@click.command()
@click.option("--dbhost", default="localhost", help="Database host")
@click.option("--dbport", default=27017, help="Database port")
@click.option("--dbname", default="shrunk", help="Database name")
@click.option("-n", default=-1, help="How many endpoints to list (-1 for all)")
def stats(dbhost, dbport, dbname, n):
    assert n >= -1
    db = pymongo.MongoClient(dbhost, dbport)[dbname]

    pipeline = [
        {
            "$group": {
                "_id": {"endpoint": "$endpoint"},
                "total_visits": {"$sum": "$count"},
                "unique_visits": {"$sum": 1},
            }
        },
        {"$sort": {"total_visits": -1}},
    ]

    if n > -1:
        pipeline.append({"$limit": n})

    data = [
        {
            "endpoint": rec["_id"]["endpoint"],
            "visits": str(rec["total_visits"]),
            "unique visits": str(rec["unique_visits"]),
        }
        for rec in db.endpoint_statistics.aggregate(pipeline)
    ]
    columns = [("endpoint", "left"), ("visits", "right"), ("unique visits", "right")]
    print_table(columns, data)


if __name__ == "__main__":
    stats()
