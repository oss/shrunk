from collections import OrderedDict
def match_short_url(url):
    return {"$match": {"short_url":url}}

#monthly visits aggregations phases
group_ips = {"$group": {
    "_id": "$source_ip",
    "visits": {
        "$addToSet": "$$ROOT"
    }
}}


find_first = {"$project": {
    "visits": {
        "$reduce": {
            #input is with visits[1:] beacuse first starts as visits[0]
            #not removing 0 from input would double include
            "input": {"$slice": ["$visits", 1, {"$size": "$visits"}]},
            "initialValue": {"first": {"$arrayElemAt":["$visits", 0]}, "rest": []},
            "in": {
                "$cond": {
                    "if": {"$lt": ["$$this.time", "$$value.first.time"]},
                    "then": {
                        "first": "$$this",
                        "rest": {"$concatArrays": [["$$value.first"], "$$value.rest"]}
                    },
                    "else": {
                        "first": "$$value.first",
                        "rest": {"$concatArrays": [["$$this"], "$$value.rest"]}
                    }
                }
            }
        }
    }
}}
mark_unqiue = {"$project": {
    "visits": {
        "$let": {
            "vars": {
                "first": {"$mergeObjects": ["$visits.first",
                                            {"first_time": 1}]},
                "rest": {"$map": {
                    "input": "$visits.rest",
                    "as": "visit",
                    "in": {"$mergeObjects": ["$$visit", {"first_time": 0}]}
                }}
            },
            "in": {"$concatArrays": [["$$first"], "$$rest"]}
        }
    }
}}
unwind_ips = {"$unwind": "$visits"}
#this monthly sort can probably get abstracted and reused
group_months = {"$group": {
    "_id": {
        "month": {"$month": "$visits.time"},
        "year" : {"$year" : "$visits.time"},
        "day": "1"
    },
    "first_time_visits": {
        "$sum": "$visits.first_time"
    },
    "all_visits": {
        "$sum": 1
    }
}}
group_days = {"$group": {
    "_id": {
        "month": {"$month": "$visits.time"},
        "year" : {"$year" : "$visits.time"},
        "day" : {"$dayOfMonth" : "$visits.time"}
    },
    "first_time_visits": {
        "$sum": "$visits.first_time"
    },
    "all_visits": {
        "$sum": 1
    }
}}
# when added to the end of daily_visits_aggregation it will group by month at the end
chunk_months = {"$group": {
    "_id": {
        "month": "$_id.month",
        "year" : "$_id.year",
    },
    "days": {"$push": {
        "day": "$_id.day",
        "first_time_visits": "$first_time_visits",
        "all_visits": "$all_visits"
    }}
}}
make_sortable = {"$project": {
    "month": "$_id.month",
    "year" : "$_id.year",
    "day"  : "$_id.day",
    "first_time_visits": 1,
    "all_visits": 1
}}
chronological_sort = {"$sort": OrderedDict([
    ("year", 1),
    ("month", 1),
    ("day", 1)
])}
clean_results = {"$project": {
    "first_time_visits": 1,
    "all_visits": 1
}}

monthly_visits_aggregation = [group_ips, find_first, mark_unqiue, unwind_ips, #mark the first_time_visits
                              group_months, #break into months
                              make_sortable, chronological_sort, clean_results] #sort

daily_visits_aggregation = [group_ips, find_first, mark_unqiue, unwind_ips, #mark the first_time_visits
                              group_days, #break into months
                              make_sortable, chronological_sort, clean_results] #sort
