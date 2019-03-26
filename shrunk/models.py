from mongoengine import *
from datetime import datetime

class User(Document):
    meta = {'collection': 'users'}
    netid            = StringField(required=True, primary_key=True)
    last_modified_by = ReferenceField("self")
    is_blacklisted   = BooleanField(required=True, default=False)
    type             = IntField(required=True, default=0)  # TODO: use choices?


class Url(Document):
    meta = {'collection': 'urls'}
    short_url    = StringField(required=True, primary_key=True)
    title        = StringField(required=True)
    time_created = DateTimeField(required=True, default=datetime.now)
    user         = ReferenceField(User, required=True)
    long_url     = StringField(required=True)
    

class BlockedDomain(Document):
    meta = {'collection': 'blocked_domains'}
    url      = StringField(required=True, primary_key=True)
    added_by = ReferenceField(User, required=True)


#This will likely change a lot as more stats-related changes are made
class Visit(Document):
    meta = {'collection': 'visits'}
    short_url = ReferenceField(Url, required=True, primary_key=True)
    source_ip = StringField(required=True)
    time      = DateTimeField(required=True)
    optionals = DictField()  # Should this be EmbeddedDocument?
