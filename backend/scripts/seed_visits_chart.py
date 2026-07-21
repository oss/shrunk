#!/usr/bin/env python3
"""Seed deterministic development data for the frontend visits chart."""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from pymongo import MongoClient


FIXTURE_ID = "visits-chart-v1"
ALIAS_PREFIX = "chart-test-"


@dataclass(frozen=True)
class LinkFixture:
    slug: str
    title: str
    daily_stats: tuple[tuple[int, int, int], ...]

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


FIXTURES = (
    LinkFixture("empty", "Chart test: no visits", ()),
    LinkFixture("single", "Chart test: single visit", ((0, 1, 1),)),
    LinkFixture(
        "week",
        "Chart test: steady week",
        tuple((day, 9 + day, 3 + day // 2) for day in range(7)),
    ),
    LinkFixture(
        "spike",
        "Chart test: monthly spike",
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
    ),
    LinkFixture(
        "year",
        "Chart test: year of returning visitors",
        tuple((day, 18 + ((index * 11) % 29), 2 + (index % 4)) for index, day in enumerate(range(0, 361, 30))),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--owner",
        default=os.getenv("SHRUNK_SUPER_ADMIN"),
        help="NetID that owns the links (default: SHRUNK_SUPER_ADMIN)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="build and summarize fixtures without connecting to MongoDB",
    )
    return parser.parse_args()


def build_documents(
    owner: str,
    now: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    links: list[dict[str, Any]] = []
    visits: list[dict[str, Any]] = []
    today = now.replace(hour=12, minute=0, second=0, microsecond=0)

    for fixture in FIXTURES:
        link_id = ObjectId()
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
                "owner": {"_id": owner, "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
                "is_tracking_pixel_link": False,
                "created_using_api": False,
                "seed_fixture": FIXTURE_ID,
            }
        )
        visits.extend(link_visits)

    return links, visits


def print_summary(links: list[dict[str, Any]]) -> None:
    print("Visits-chart fixtures:")
    for link in links:
        print(
            f"  {link['alias']}: id={link['_id']} total={link['visits']} unique={link['unique_visits']}",
        )
    print("Run again from the repository root with:")
    print("  docker compose exec backend python scripts/seed_visits_chart.py")


def seed_database(links: list[dict[str, Any]], visits: list[dict[str, Any]]) -> None:
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

    conflict = database.urls.find_one(
        {"alias": {"$in": aliases}, "seed_fixture": {"$ne": FIXTURE_ID}},
        {"alias": 1},
    )
    if conflict:
        raise SystemExit(
            f"Refusing to replace non-fixture link with alias {conflict['alias']!r}",
        )

    old_link_ids = [link["_id"] for link in database.urls.find({"seed_fixture": FIXTURE_ID}, {"_id": 1})]
    visit_filters: list[dict[str, Any]] = [{"seed_fixture": FIXTURE_ID}]
    if old_link_ids:
        visit_filters.append({"link_id": {"$in": old_link_ids}})

    database.visits.delete_many({"$or": visit_filters})
    database.urls.delete_many({"seed_fixture": FIXTURE_ID})
    database.urls.insert_many(links)
    if visits:
        database.visits.insert_many(visits)
    client.close()


def main() -> None:
    args = parse_args()
    if not args.owner:
        raise SystemExit("Pass --owner NETID or set SHRUNK_SUPER_ADMIN")

    links, visits = build_documents(args.owner, datetime.now(timezone.utc))
    if not args.dry_run:
        seed_database(links, visits)
    print_summary(links)


if __name__ == "__main__":
    main()
