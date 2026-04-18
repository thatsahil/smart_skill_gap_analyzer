import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client['skill_gap_analyzer']

users_collection = db['users']
jobs_collection = db['jobs']
reports_collection = db['reports']
applications_collection = db['applications']
