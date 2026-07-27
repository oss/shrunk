#!/usr/bin/env python3
"""Seed a complete deterministic development dataset for link and visit UIs."""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from pymongo import MongoClient

FIXTURE_ID = "seed-data"
ALIAS_PREFIX = "seed-test-"
DEFAULT_OWNER = "DEV_ADMIN"
USER_COUNT = 100
ORGANIZATION_COUNT = 10
LINK_COUNT = 500
ENDPOINTS = (
    "link.create_link",
    "link.get_link",
    "link.modify_link",
    "link.get_link_visits",
    "link.get_link_overall_stats",
    "link.get_link_visit_stats",
    "link.get_link_geoip_stats",
    "link.get_link_browser_stats",
    "org.get_orgs",
    "org.get_org",
    "org.get_org_links",
    "search.post_search_urls",
)


@dataclass(frozen=True)
class UserFixture:
    netid: str
    roles: tuple[str, ...]


@dataclass(frozen=True)
class OrganizationFixture:
    key: str
    object_id: ObjectId
    name: str
    members: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class LinkFixture:
    slug: str
    title: str
    daily_stats: tuple[tuple[int, int, int], ...]
    owner_key: str = "primary"
    editor_keys: tuple[str, ...] = ()
    viewer_keys: tuple[str, ...] = ()

    @property
    def alias(self) -> str:
        return f"{ALIAS_PREFIX}{self.slug}"


@dataclass(frozen=True)
class ClientProfile:
    user_agent: str


@dataclass(frozen=True)
class LocationProfile:
    country_code: str
    state_code: str | None = None


CLIENT_PROFILES = (
    ClientProfile(
        "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    ),
    ClientProfile(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    ),
    ClientProfile(
        "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)",
    ),
    ClientProfile(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    ),
    ClientProfile(
        "Opera/9.80 (X11; Linux x86_64; U; en) Presto/2.10.289 Version/12.02",
    ),
    ClientProfile(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
    ),
    ClientProfile("Shrunk visits-chart seed script"),
)

# Repeated indexes give the chart segments deliberately unequal sizes.
WEIGHTED_PROFILE_INDEXES = (0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6)

REFERRERS = (
    "https://m.facebook.com/shrunk",
    "https://t.co/shrunk",
    "https://www.instagram.com/shrunk/",
    "https://www.reddit.com/r/rutgers/",
    None,
)
WEIGHTED_REFERRER_INDEXES = (0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4)

LOCATIONS = (
    LocationProfile("US", "NJ"),
    LocationProfile("US", "CA"),
    LocationProfile("US", "TX"),
    LocationProfile("US", "NY"),
    LocationProfile("US", "FL"),
    LocationProfile("US", "WA"),
    LocationProfile("CA"),
    LocationProfile("GB"),
    LocationProfile("DE"),
    LocationProfile("IN"),
    LocationProfile("AU"),
    LocationProfile("BR"),
    LocationProfile("JP"),
    LocationProfile("ZA"),
)

BASE_USERS = (
    UserFixture("DEV_ADMIN", ("admin",)),
    UserFixture("DEV_USER", ("whitelisted",)),
    UserFixture("DEV_FACSTAFF", ("facstaff",)),
    UserFixture("DEV_PWR_USER", ("power_user",)),
    UserFixture("DEV_GUEST", ("guest",)),
)

GENERATED_USERS = tuple(
    UserFixture(
        f"CHART_USER_{index:03d}",
        (("facstaff", "power_user", "whitelisted")[(index - 1) % 3],),
    )
    for index in range(1, USER_COUNT - len(BASE_USERS) + 1)
)

ORGANIZATION_IDS = {
    f"org_{index:02d}": ObjectId(f"665000000000000000{index:06x}") for index in range(1, ORGANIZATION_COUNT + 1)
}
WEIGHTED_LOCATION_INDEXES = (
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    3,
    3,
    4,
    5,
    6,
    6,
    7,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
)


CORE_FIXTURES = (
    LinkFixture("empty", "Seed data: no visits", ()),
    LinkFixture(
        "single",
        "Seed data: single visit",
        ((0, 1, 1),),
        owner_key="user",
    ),
    LinkFixture(
        "week",
        "Seed data: steady week",
        tuple((day, 9 + day, 3 + day // 2) for day in range(7)),
        owner_key="org_01",
    ),
    LinkFixture(
        "spike",
        "Seed data: monthly spike",
        (
            (0, 4, 3),
            (3, 7, 4),
            (6, 5, 2),
            (9, 11, 6),
            (12, 8, 3),
            (15, 65, 18),
            (18, 13, 5),
            (21, 9, 4),
            (24, 16, 7),
            (27, 12, 5),
            (29, 18, 8),
        ),
        editor_keys=("org_02",),
        viewer_keys=("org_02", "facstaff"),
    ),
    LinkFixture(
        "year",
        "Seed data: year of returning visitors",
        tuple((day, 18 + ((index * 11) % 29), 2 + (index % 4)) for index, day in enumerate(range(0, 361, 30))),
        owner_key="org_01",
        editor_keys=("user",),
        viewer_keys=("user",),
    ),
)


def build_generated_link_fixtures() -> tuple[LinkFixture, ...]:
    owner_keys = (
        "primary",
        "user",
        "facstaff",
        "power_user",
        *ORGANIZATION_IDS,
        *(f"generated_{index:03d}" for index in range(1, 21)),
    )
    fixtures: list[LinkFixture] = []
    for link_number in range(len(CORE_FIXTURES) + 1, LINK_COUNT + 1):
        if link_number % 17 == 0:
            daily_stats: tuple[tuple[int, int, int], ...] = ()
        else:
            daily_stats = tuple(
                (
                    day,
                    1 + ((link_number + day * 3) % 8),
                    min(
                        1 + ((link_number + day * 3) % 8),
                        1 + ((link_number + day) % 3),
                    ),
                )
                for day in range(1 + (link_number % 3))
            )

        owner_key = owner_keys[(link_number - 1) % len(owner_keys)]
        organization_key = f"org_{((link_number - 1) % ORGANIZATION_COUNT) + 1:02d}"
        editor_key = f"generated_{((link_number + 20) % 20) + 1:03d}"
        fixtures.append(
            LinkFixture(
                f"link-{link_number:03d}",
                f"Seed data: generated link {link_number:03d}",
                daily_stats,
                owner_key=owner_key,
                editor_keys=() if owner_key == editor_key else (editor_key,),
                viewer_keys=(() if owner_key == organization_key else (organization_key,)),
            )
        )
    return tuple(fixtures)


FIXTURES = CORE_FIXTURES + build_generated_link_fixtures()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--owner",
        default=DEFAULT_OWNER,
        help=f"primary test owner NetID (default: {DEFAULT_OWNER})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="build and summarize fixtures without connecting to MongoDB",
    )
    return parser.parse_args()


def build_users(owner: str, now: datetime) -> list[dict[str, Any]]:
    fixtures = {fixture.netid: fixture for fixture in (*BASE_USERS, *GENERATED_USERS)}
    if owner not in fixtures:
        fixtures.pop(GENERATED_USERS[-1].netid)
    fixtures[owner] = UserFixture(owner, ("admin",))
    return [
        {
            "netid": fixture.netid,
            "roles": [
                {
                    "role": role,
                    "granted_by": "visits-chart-seed",
                    "comment": "Deterministic visits-chart fixture",
                    "time_granted": now,
                }
                for role in fixture.roles
            ],
            "date_created": now,
            "seed_fixture": FIXTURE_ID,
        }
        for fixture in fixtures.values()
    ]


def build_organizations(
    users: list[dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    netids = [user["netid"] for user in users]
    fixtures = tuple(
        OrganizationFixture(
            key,
            object_id,
            f"Seed Data Organization {index:02d}",
            tuple(
                (
                    netids[((index - 1) * 9 + member_index) % len(netids)],
                    ("admin" if member_index == 0 else "guest" if member_index == 11 else "member"),
                )
                for member_index in range(12)
            ),
        )
        for index, (key, object_id) in enumerate(
            ORGANIZATION_IDS.items(),
            start=1,
        )
    )
    return [
        {
            "_id": fixture.object_id,
            "name": fixture.name,
            "timeCreated": now,
            "members": [{"netid": netid, "role": role, "timeCreated": now} for netid, role in fixture.members],
            "guests": [],
            "domains": [],
            "deleted": False,
            "seed_fixture": FIXTURE_ID,
        }
        for fixture in fixtures
    ]


def resolve_entity(key: str, owner: str) -> dict[str, Any]:
    if key in ORGANIZATION_IDS:
        return {"_id": ORGANIZATION_IDS[key], "type": "org"}
    netids = {
        "primary": owner,
        "user": "DEV_USER",
        "facstaff": "DEV_FACSTAFF",
        "power_user": "DEV_PWR_USER",
        "guest": "DEV_GUEST",
    }
    if key.startswith("generated_"):
        generated_number = int(key.removeprefix("generated_"))
        return {"_id": f"CHART_USER_{generated_number:03d}", "type": "netid"}
    try:
        return {"_id": netids[key], "type": "netid"}
    except KeyError as error:
        raise ValueError(f"Unknown fixture entity {key!r}") from error


def build_endpoint_statistics(
    users: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    statistics = [
        {
            "endpoint": endpoint,
            "netid": user["netid"],
            "count": 1 + ((user_number + 1) * (endpoint_number + 3) % 40),
            "seed_fixture": FIXTURE_ID,
        }
        for user_number, user in enumerate(users)
        for endpoint_number, endpoint in enumerate(ENDPOINTS)
    ]
    statistics.extend(
        {
            "endpoint": endpoint,
            "netid": None,
            "count": 25 + endpoint_number * 7,
            "seed_fixture": FIXTURE_ID,
        }
        for endpoint_number, endpoint in enumerate(ENDPOINTS)
    )
    return statistics


def build_documents(
    owner: str,
    now: datetime,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    users = build_users(owner, now)
    organizations = build_organizations(users, now)
    endpoint_statistics = build_endpoint_statistics(users)
    links: list[dict[str, Any]] = []
    visits: list[dict[str, Any]] = []
    today = now.replace(hour=12, minute=0, second=0, microsecond=0)

    for fixture_number, fixture in enumerate(FIXTURES, start=1):
        link_id = ObjectId(f"665100000000000000{fixture_number:06x}")
        link_visits: list[dict[str, Any]] = []
        known_tracking_ids: list[str] = []
        visitor_number = 0

        # Offsets are days ago. Sorting descending creates visits chronologically.
        for days_ago, total, new_visitors in sorted(fixture.daily_stats, reverse=True):
            if total < new_visitors or (total and not new_visitors):
                raise ValueError(f"Invalid fixture statistics for {fixture.alias}")

            day_tracking_ids: list[str] = []
            for _ in range(new_visitors):
                tracking_id = f"{fixture.slug}-visitor-{visitor_number:03d}"
                visitor_number += 1
                known_tracking_ids.append(tracking_id)
                day_tracking_ids.append(tracking_id)

            repeat_pool = known_tracking_ids
            for click_number in range(total):
                if click_number < len(day_tracking_ids):
                    tracking_id = day_tracking_ids[click_number]
                else:
                    tracking_id = repeat_pool[(click_number - len(day_tracking_ids)) % len(repeat_pool)]

                profile_index = WEIGHTED_PROFILE_INDEXES[(days_ago + click_number) % len(WEIGHTED_PROFILE_INDEXES)]
                profile = CLIENT_PROFILES[profile_index]
                referrer_index = WEIGHTED_REFERRER_INDEXES[(days_ago + click_number) % len(WEIGHTED_REFERRER_INDEXES)]
                location_index = WEIGHTED_LOCATION_INDEXES[(days_ago + click_number) % len(WEIGHTED_LOCATION_INDEXES)]
                location = LOCATIONS[location_index]
                link_visits.append(
                    {
                        "link_id": link_id,
                        "alias": fixture.alias,
                        "tracking_id": tracking_id,
                        "source_ip": f"192.0.2.{1 + (click_number % 200)}",
                        "time": today - timedelta(days=days_ago) + timedelta(minutes=click_number),
                        "user_agent": profile.user_agent,
                        "referer": REFERRERS[referrer_index],
                        "state_code": location.state_code,
                        "country_code": location.country_code,
                        "seed_fixture": FIXTURE_ID,
                    }
                )

        unique_visits = len({visit["tracking_id"] for visit in link_visits})
        links.append(
            {
                "_id": link_id,
                "title": fixture.title,
                "alias": fixture.alias,
                "long_url": "https://example.com/",
                "timeCreated": now,
                "visits": len(link_visits),
                "unique_visits": unique_visits,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": resolve_entity(fixture.owner_key, owner),
                "domain": "",
                "viewers": [resolve_entity(key, owner) for key in fixture.viewer_keys],
                "editors": [resolve_entity(key, owner) for key in fixture.editor_keys],
                "is_tracking_pixel_link": False,
                "created_using_api": False,
                "seed_fixture": FIXTURE_ID,
            }
        )
        visits.extend(link_visits)

    if len(users) != USER_COUNT:
        raise AssertionError(f"Expected {USER_COUNT} users, built {len(users)}")
    if len(organizations) != ORGANIZATION_COUNT:
        raise AssertionError(f"Expected {ORGANIZATION_COUNT} organizations, built {len(organizations)}")
    if len(links) != LINK_COUNT:
        raise AssertionError(f"Expected {LINK_COUNT} links, built {len(links)}")

    return users, organizations, links, visits, endpoint_statistics


def print_summary(
    users: list[dict[str, Any]],
    organizations: list[dict[str, Any]],
    links: list[dict[str, Any]],
    visits: list[dict[str, Any]],
    endpoint_statistics: list[dict[str, Any]],
) -> None:
    print(f"Test users: {len(users)}")
    print("  " + ", ".join(user["netid"] for user in users[:5]))
    print(f"  ... and {len(users) - 5} generated test users")
    print(f"Test organizations: {len(organizations)}")
    for organization in organizations:
        print(
            f"  {organization['name']}: id={organization['_id']} members={len(organization['members'])}",
        )
    print(f"Links: {len(links)}")
    print("Core visits-chart fixtures:")
    for link in links[: len(CORE_FIXTURES)]:
        print(
            f"  {link['alias']}: id={link['_id']} owner={link['owner']} "
            f"total={link['visits']} unique={link['unique_visits']}",
        )
    print(f"  ... and {len(links) - len(CORE_FIXTURES)} generated links")
    print(f"Visit documents: {len(visits)}")
    print(f"Endpoint statistics: {len(endpoint_statistics)} documents across {len(ENDPOINTS)} endpoints")
    print("Development logins: /api/core/devlogins/admin, user, facstaff, power, guest")
    print("Run again from the repository root with:")
    print("  docker compose exec backend python scripts/seed_data.py")


def seed_database(
    users: list[dict[str, Any]],
    organizations: list[dict[str, Any]],
    links: list[dict[str, Any]],
    visits: list[dict[str, Any]],
    endpoint_statistics: list[dict[str, Any]],
) -> None:
    if os.getenv("SHRUNK_DEV_LOGINS") != "1":
        raise SystemExit("Refusing to seed unless SHRUNK_DEV_LOGINS=1")

    host = os.getenv("SHRUNK_DB_HOST")
    port = os.getenv("SHRUNK_DB_PORT")
    database_name = os.getenv("SHRUNK_DB_NAME")
    if not host or not port or not database_name:
        raise SystemExit("SHRUNK_DB_HOST, SHRUNK_DB_PORT, and SHRUNK_DB_NAME must be set")

    client: MongoClient[dict[str, Any]] = MongoClient(
        host,
        int(port),
        replicaSet=os.getenv("SHRUNK_REPLICA_SET_NAME") or None,
        serverSelectionTimeoutMS=5_000,
    )
    client.admin.command("ping")
    database = client[database_name]
    aliases = [fixture.alias for fixture in FIXTURES]
    link_ids = [link["_id"] for link in links]
    organization_ids = [organization["_id"] for organization in organizations]
    organization_names = [organization["name"] for organization in organizations]

    conflict = database.urls.find_one(
        {
            "$or": [
                {"_id": {"$in": link_ids}},
                {"alias": {"$in": aliases}},
            ],
            "seed_fixture": {"$ne": FIXTURE_ID},
        },
        {"alias": 1},
    )
    if conflict:
        raise SystemExit(
            f"Refusing to replace non-fixture link {conflict.get('alias', str(conflict['_id']))!r}",
        )

    organization_conflict = database.organizations.find_one(
        {
            "$or": [
                {"_id": {"$in": organization_ids}},
                {"name": {"$in": organization_names}},
            ],
            "seed_fixture": {"$ne": FIXTURE_ID},
        },
        {"name": 1},
    )
    if organization_conflict:
        raise SystemExit(
            f"Refusing to replace non-fixture organization {organization_conflict['name']!r}",
        )

    old_link_ids = [link["_id"] for link in database.urls.find({"seed_fixture": FIXTURE_ID}, {"_id": 1})]
    visit_filters: list[dict[str, Any]] = [{"seed_fixture": FIXTURE_ID}]
    if old_link_ids:
        visit_filters.append({"link_id": {"$in": old_link_ids}})

    database.visits.delete_many({"$or": visit_filters})
    database.endpoint_statistics.delete_many({"seed_fixture": FIXTURE_ID})
    database.urls.delete_many({"seed_fixture": FIXTURE_ID})
    database.organizations.delete_many({"seed_fixture": FIXTURE_ID})

    for user in users:
        database.users.update_one(
            {"netid": user["netid"]},
            {"$setOnInsert": user},
            upsert=True,
        )
    database.organizations.insert_many(organizations)
    database.urls.insert_many(links)
    if visits:
        database.visits.insert_many(visits)
    if endpoint_statistics:
        database.endpoint_statistics.insert_many(endpoint_statistics)
    client.close()


def main() -> None:
    args = parse_args()
    users, organizations, links, visits, endpoint_statistics = build_documents(
        args.owner,
        datetime.now(timezone.utc),
    )
    if not args.dry_run:
        seed_database(users, organizations, links, visits, endpoint_statistics)
    print_summary(users, organizations, links, visits, endpoint_statistics)


if __name__ == "__main__":
    main()
