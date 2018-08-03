from collections import OrderedDict
def match_short_url(url):
    return {"$match": {"short_url":url}}

def match_id(id):
    return {"$match": {"short_url":url}}

#monthly visits aggregations phases
group_ips={"$group": {
    "_id": "$source_ip",
    "times": {
        "$addToSet": "$time"
    },
    "count": { 
        "$sum": 1
    }
}}
take_first_visit={"$project": {
    "time": {
        "$arrayElemAt": ["$times",0]
    },
    "count": 1
}}
#this monthly sort can probably get abstracted and reused
group_months={"$group": {
    "_id": {
        "month": {"$month": "$time"},
        "year" : {"$year" : "$time"}
    },
    "first_time_visits": {
        "$sum": 1
    },
    "all_visits": {
        "$sum": "$count"
    }
}}
make_sortable={"$project": {
    "month": "$_id.month",
    "year" : "$_id.year",
    "first_time_visits": 1,
    "all_visits": 1
}}
chronological_sort={ "$sort": OrderedDict([
    ("year" , 1),
    ("month", 1)
])}
clean_results={"$project": {
    "first_time_visits": 1,
    "all_visits": 1
}}
monthly_visits_aggregation=[group_ips, take_first_visit, group_months, #process data
                            make_sortable, chronological_sort, clean_results] #sort
