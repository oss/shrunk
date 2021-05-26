import json
import requests
from pymongo import MongoClient

with open("phishAPI.json", "r") as api_file:
    api_key = json.load(api_file)["api_key"]

url = f"http://data.phishtank.com/data/{api_key}/online-valid.json"
file = requests.get(url)

client = MongoClient()
db = client['shrunk']
collection = db['phishTank']
collection.drop()

phishList = file.json()
for phish in phishList:
    post = {
           'phish_id': phish['phish_id'],
           'url': phish['url'],
           'phish_detail_url': phish['phish_detail_url'],
           'submission_time': phish['submission_time'],
           'verified': phish['verified'],
           'online': phish['online'],
           'details': phish['details'],
           'target': phish['target']}

    collection.insert_one(post)
