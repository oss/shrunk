from typing import Any
from collections import OrderedDict


def match_link_id(link_id: str) -> Any:
    return {"$match": {"link_id": link_id}}


# daily visits aggregations phases
group_tracking_ids = {
    "$group": {
        "_id": "$tracking_id",
        "visits": {
            "$addToSet": "$$ROOT",
        },
    }
}

find_first = {
    "$project": {
        "visits": {
            "$reduce": {
                # input is with visits[1:] beacuse first starts as visits[0]
                # not removing 0 from input would double include
                "input": {"$slice": ["$visits", 1, {"$size": "$visits"}]},
                "initialValue": {"first": {"$arrayElemAt": ["$visits", 0]}, "rest": []},
                "in": {
                    "$cond": {
                        "if": {"$lt": ["$$this.time", "$$value.first.time"]},
                        "then": {
                            "first": "$$this",
                            "rest": {
                                "$concatArrays": [["$$value.first"], "$$value.rest"]
                            },
                        },
                        "else": {
                            "first": "$$value.first",
                            "rest": {"$concatArrays": [["$$this"], "$$value.rest"]},
                        },
                    },
                },
            },
        },
    }
}

mark_unqiue = {
    "$project": {
        "visits": {
            "$let": {
                "vars": {
                    "first": {"$mergeObjects": ["$visits.first", {"first_time": 1}]},
                    "rest": {
                        "$map": {
                            "input": "$visits.rest",
                            "as": "visit",
                            "in": {"$mergeObjects": ["$$visit", {"first_time": 0}]},
                        }
                    },
                },
                "in": {"$concatArrays": [["$$first"], "$$rest"]},
            },
        },
    }
}

unwind_ips = {"$unwind": "$visits"}

group_days = {
    "$group": {
        "_id": {
            "month": {"$month": "$visits.time"},
            "year": {"$year": "$visits.time"},
            "day": {"$dayOfMonth": "$visits.time"},
        },
        "first_time_visits": {
            "$sum": "$visits.first_time",
        },
        "all_visits": {
            "$sum": 1,
        },
    }
}

# when added to the end of daily_visits_aggregation it will group by month at the end
chunk_months = {
    "$group": {
        "_id": {
            "month": "$_id.month",
            "year": "$_id.year",
        },
        "days": {
            "$push": {
                "day": "$_id.day",
                "first_time_visits": "$first_time_visits",
                "all_visits": "$all_visits",
            }
        },
    }
}

make_sortable = {
    "$project": {
        "month": "$_id.month",
        "year": "$_id.year",
        "day": "$_id.day",
        "first_time_visits": 1,
        "all_visits": 1,
    }
}

chronological_sort = {
    "$sort": OrderedDict(
        [
            ("year", 1),
            ("month", 1),
            ("day", 1),
        ]
    )
}

clean_results = {
    "$project": {
        "first_time_visits": 1,
        "all_visits": 1,
    }
}

daily_visits_aggregation = [
    # mark the first_time_visits
    group_tracking_ids,
    find_first,
    mark_unqiue,
    unwind_ips,
    # break into days
    group_days,
    # sort
    make_sortable,
    chronological_sort,
    clean_results,
]
