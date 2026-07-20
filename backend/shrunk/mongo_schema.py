"""Typed Mongo document shapes used by Shrunk's backend."""

from datetime import datetime
from typing import List, Optional, Union

from bson.objectid import ObjectId
from typing_extensions import Literal, NotRequired, Required, TypedDict

__all__ = [
    "MongoId",
    "MongoRef",
    "LinkOwnerInfo",
    "LinkAclEntry",
    "UserRoleDocument",
    "UserDocument",
    "UserSummaryDocument",
    "UserListDocument",
    "OrgMemberDocument",
    "OrgDomainDocument",
    "OrgDocument",
    "LinkOwnershipTransferDocument",
    "LinkDocument",
    "UnsafeLinkStatus",
    "SecurityUpdateHistoryDocument",
    "UnsafeLinkDocument",
    "VisitDocument",
    "VisitorDocument",
    "AccessRequestState",
    "AccessRequestDocument",
    "AccessTokenDocument",
    "AccessTokenSummaryDocument",
    "GrantDocument",
    "TicketDocument",
    "EndpointStatisticDocument",
    "EndpointStatsRow",
    "PhishTankDocument",
    "AdminStatsDocument",
    "VisitCountSummary",
    "DailyVisitsRow",
    "GeoStatRow",
    "GeoIpStatsResult",
    "PendingAccessRequestDocument",
    "OrgSummaryDocument",
    "OrgVisitStatsRow",
    "OrgOverallStats",
    "TrackingIdDocument",
]

MongoId = Union[str, ObjectId]


class MongoRef(TypedDict):
    _id: MongoId
    type: Literal["netid", "org"]


class LinkOwnerInfo(MongoRef, total=False):
    org_name: str


LinkAclEntry = MongoRef


class UserRoleDocument(TypedDict):
    role: str
    granted_by: Optional[str]
    comment: str
    time_granted: datetime


class UserDocument(TypedDict):
    _id: NotRequired[ObjectId]
    netid: str
    roles: List[UserRoleDocument]
    date_created: datetime


class UserSummaryDocument(TypedDict):
    netid: str
    roles: List[str]
    date_created: datetime
    linksCreated: int
    organizations: List[str]


class UserListDocument(TypedDict):
    netid: str
    roles: List[str]
    linksCreated: int
    organizations: List[str]


class OrgMemberDocument(TypedDict):
    netid: str
    role: str
    timeCreated: datetime


class OrgDomainDocument(TypedDict):
    domain: str
    timeCreated: datetime


class OrgDocument(TypedDict, total=False):
    _id: Required[ObjectId]
    name: Required[str]
    timeCreated: Required[datetime]
    members: Required[List[OrgMemberDocument]]
    guests: Required[List[OrgMemberDocument]]
    domains: Required[List[OrgDomainDocument]]
    deleted: Required[bool]
    deleted_by: str
    deleted_time: datetime
    access_tokens: List[str]


LinkOwnershipTransferDocument = TypedDict(
    "LinkOwnershipTransferDocument",
    {
        "from": MongoRef,
        "to": MongoRef,
        "timestamp": datetime,
    },
)


class LinkDocument(TypedDict, total=False):
    _id: Required[ObjectId]
    title: Required[str]
    alias: Required[str]
    long_url: Required[str]
    timeCreated: Required[datetime]
    visits: Required[int]
    unique_visits: Required[int]
    deleted: Required[bool]
    creator_ip: Required[str]
    expiration_time: Required[Optional[datetime]]
    owner: Required[MongoRef]
    domain: Required[str]
    viewers: Required[List[LinkAclEntry]]
    editors: Required[List[LinkAclEntry]]
    is_tracking_pixel_link: Required[bool]
    created_using_api: Required[bool]
    is_trackingpixel_legacy_endpoint: bool
    deleted_by: str
    deleted_time: datetime
    ownership_transfer_history: List[LinkOwnershipTransferDocument]


UnsafeLinkStatus = Literal["pending", "approved", "denied", "deleted"]


class SecurityUpdateHistoryDocument(TypedDict):
    status_changed_from: UnsafeLinkStatus
    status_changed_to: UnsafeLinkStatus
    netid_of_modifier: str
    timestamp: datetime


class UnsafeLinkDocument(LinkDocument, total=False):
    status: Required[UnsafeLinkStatus]
    netid_of_last_modifier: Required[Optional[str]]
    security_update_history: List[SecurityUpdateHistoryDocument]


class VisitDocument(TypedDict, total=False):
    _id: ObjectId
    link_id: ObjectId
    alias: str
    tracking_id: Optional[str]
    source_ip: str
    time: datetime
    user_agent: Optional[str]
    referer: Optional[str]
    state_code: Optional[str]
    country_code: Optional[str]
    mid: str
    uid: str
    source: str


class VisitorDocument(TypedDict):
    _id: ObjectId
    ip: str


AccessRequestState = Literal["pending", "accepted", "denied"]


class AccessRequestDocument(TypedDict):
    _id: NotRequired[ObjectId]
    token: bytes
    link_id: ObjectId
    requesting_netid: str
    state: AccessRequestState
    created_at: datetime
    resolved_at: Optional[datetime]


class AccessTokenDocument(TypedDict):
    _id: NotRequired[ObjectId]
    owner: MongoRef
    title: str
    description: str
    hashed_token: str
    lookup_key: str
    created_by: str
    created_date: datetime
    permissions: List[str]
    deleted: bool
    deleted_by: Optional[str]
    deleted_time: Optional[datetime]


class AccessTokenSummaryDocument(TypedDict):
    id: str
    title: str
    owner: str
    description: str
    created_by: str
    created_date: datetime
    permissions: List[str]
    deleted: bool
    deleted_by: Optional[str]
    deleted_time: Optional[datetime]


class GrantDocument(TypedDict):
    _id: NotRequired[ObjectId]
    role: str
    entity: str
    granted_by: str
    comment: str
    time_granted: datetime


class TicketDocument(TypedDict, total=False):
    _id: ObjectId
    reporter: Required[str]
    reason: Required[str]
    entity: str
    user_comment: Required[str]
    status: Required[str]
    created_time: Required[float]
    actioned_by: str
    actioned_time: float
    admin_review: str
    is_role_granted: bool


class EndpointStatisticDocument(TypedDict):
    _id: NotRequired[ObjectId]
    endpoint: str
    netid: Optional[str]
    count: int


class EndpointStatsRow(TypedDict):
    endpoint: str
    total_visits: int
    unique_visits: int


class PhishTankDocument(TypedDict):
    _id: NotRequired[ObjectId]
    url: str


class AdminStatsDocument(TypedDict):
    links: int
    visits: int
    users: int


class VisitCountSummary(TypedDict):
    total_visits: int
    unique_visits: int


class DailyVisitsRow(TypedDict):
    month: int
    year: int
    day: int
    first_time_visits: int
    all_visits: int


class GeoStatRow(TypedDict):
    code: str
    value: int


class GeoIpStatsResult(TypedDict):
    us: List[GeoStatRow]
    world: List[GeoStatRow]


class PendingAccessRequestDocument(LinkDocument, total=False):
    request: Required[AccessRequestDocument]


class OrgSummaryDocument(TypedDict, total=False):
    id: Required[ObjectId]
    name: Required[str]
    timeCreated: Required[datetime]
    members: Required[List[OrgMemberDocument]]
    guests: Required[List[OrgMemberDocument]]
    domains: Required[List[OrgDomainDocument]]
    deleted: Required[bool]
    deleted_by: str
    deleted_time: datetime
    access_tokens: List[str]
    role: Optional[str]


class OrgVisitStatsRow(TypedDict):
    netid: str
    total_visits: int
    unique_visits: int


class OrgOverallStats(TypedDict):
    total_links: int
    total_visits: int
    unique_visits: int


class TrackingIdDocument(TypedDict):
    """Documents in this collection have no fields besides ``_id``;
    the collection exists solely as a source of unique ObjectIds."""

    _id: NotRequired[ObjectId]
