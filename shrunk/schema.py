"""Defines TypedDict types corresponding to our Mongo collections."""

from typing import TypedDict, Optional, List, Union
import datetime

from bson.objectid import ObjectId


NetID = str


class EndpointStatistics(TypedDict):
    _id: ObjectId
    """Primary key"""

    endpoint: str
    """Name of flask endpoint"""

    netid: Optional[NetID]
    """The visitor's NetID, or None for visits from not-logged-in users"""

    count: int
    """The number of visits"""


class Grants(TypedDict):
    _id: ObjectId
    """Primary key"""

    role: str
    """Name of role"""

    entity: str
    """Entity to which the role has been granted"""

    granted_by: str
    """Entity which granted the role (may not be a valid NetID)"""

    comment: Optional[str]
    """Comment if the role requires it"""


class OrganizationMember(TypedDict):
    is_admin: bool
    """Whether the user is an organization-level administrator"""

    netid: NetID
    """The user's NetID"""

    timeCreated: datetime.datetime
    """When the user was added to the organization"""


class Organizations(TypedDict):
    _id: ObjectId
    """Primary key"""

    name: str
    """Organization name"""

    members: List[OrganizationMember]
    """The members of the organization"""

    timeCreated: datetime.datetime
    """The time at which the organization was created"""


class TrackingIDs(TypedDict):
    _id: ObjectId
    """Primary key"""


class URLs(TypedDict):
    _id: ObjectId
    """Primary key"""

    title: str
    """Title of the link"""

    long_url: str
    """Long url"""

    short_url: str
    """Short url"""

    netid: NetID
    """Owner of the link"""

    timeCreated: datetime.datetime
    """Time at which the link was created"""

    visits: int
    """Total number of visits to the link"""

    unique_visits: int
    """Number of unique visits to the link"""

    deleted: Optional[bool]
    """True iff the link has been deleted"""

    deleted_by: Optional[Union[NetID, str]]
    """If deleted is true, then the NetID of the user who deleted the link, or one of
    the special values ``"!BLACKLISTED"`` (if the link's owner was banned from Shrunk)
    or ``"!BLOCKED"`` (if the link's long_url was banned from Shrunk)"""

    deleted_time: Optional[datetime.datetime]
    """The time at which the link was deleted"""


class Visitors(TypedDict):
    _id: ObjectId
    """Primary key"""

    ip: str
    """IP address"""


class Visits(TypedDict):
    _id: ObjectId
    """Primary key"""

    source_ip: str
    """Source IP address"""

    time: datetime.datetime
    """Time of visit"""

    link_id: ObjectId
    """``_id`` of link visited"""
