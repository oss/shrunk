"""Shrunk, the official URL shortener of Rutgers University."""

import base64
import binascii
import codecs
import datetime
import json
import os
import logging
from typing import Any

import bson.errors
import flask
from flask import (
    Flask,
    current_app,
    jsonify,
    redirect,
    request,
    session,
    send_file,
    send_from_directory,
)
from backports import datetime_fromisoformat
from bson import ObjectId
from flask.json import JSONEncoder
from flask.logging import default_handler
from flask_mailman import Mail
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.routing import BaseConverter, ValidationError

# Extensions
# Blueprints
from . import api, dev_logins, linkhub_viewer, sso, views
from .client import ShrunkClient
from .util.github import pull_outlook_assets_from_github
from .util.ldap import is_valid_netid
from .util.string import get_domain, validate_url
from .util.verification import verify_signature


class ObjectIdConverter(BaseConverter):
    """URL converter for BSON object IDs, which we commonly use
    as canonical IDs for objects."""

    def to_python(self, value: str) -> ObjectId:
        try:
            return ObjectId(value)
        except bson.errors.InvalidId as e:
            raise ValidationError from e

    def to_url(self, value: ObjectId) -> str:
        return str(value)


class Base32Converter(BaseConverter):
    """URL converter to handle base32-encoded strings. This is useful
    since Apache apparently has problems with urlencoded-slashes."""

    def to_python(self, value: str) -> str:
        try:
            return str(base64.b32decode(bytes(value, "utf8")), "utf8")
        except binascii.Error as e:
            raise ValidationError from e

    def to_url(self, value: str) -> str:
        return str(base64.b32encode(bytes(value, "utf8")), "utf8")


class ShrunkEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return JSONEncoder.default(self, o)


class HexTokenConverter(BaseConverter):
    def to_python(self, value: str) -> bytes:
        try:
            token = codecs.decode(bytes(value, "utf8"), encoding="hex")
        except binascii.Error as e:
            raise ValidationError from e
        if len(token) != 16:
            raise ValidationError("Token should be 16 bytes in length")
        return token

    def to_url(self, value: bytes) -> str:
        return str(codecs.encode(value, encoding="hex"), "utf8")


class RequestFormatter(logging.Formatter):
    def format(self, record: Any) -> str:
        record.url = None
        record.remote_addr = None
        record.user = None
        if flask.has_request_context():
            record.url = flask.request.url
            record.remote_addr = flask.request.remote_addr
            if "user" in flask.session:
                record.user = flask.session["user"]["netid"]
        return super().format(record)


def _init_logging() -> None:
    """Sets up self.logger with default settings."""
    formatter = logging.Formatter(current_app.config["LOG_FORMAT"])
    handler = logging.FileHandler(current_app.config["LOG_FILENAME"])
    handler.setLevel(logging.INFO)
    handler.setFormatter(formatter)
    current_app.logger.addHandler(handler)
    current_app.logger.setLevel(logging.INFO)


def _init_shrunk_client() -> None:
    """Connect to the database specified in self.config.
    self.logger must be initialized before this function is called."""
    current_app.client = ShrunkClient(**current_app.config)


def _init_roles() -> None:
    client: ShrunkClient = current_app.client

    def is_admin(netid: str) -> bool:
        return client.roles.has("admin", netid)

    client.roles.create(
        "admin", is_admin, is_valid_netid, custom_text={"title": "Admins"}
    )

    client.roles.create(
        "power_user",
        is_admin,
        is_valid_netid,
        custom_text={
            "title": "Power Users",
            "grant_title": "Grant power user",
            "revoke_title": "Revoke power user",
            "allow_comment": True,
            "comment_prompt": "Describe why the user has been granted power user access to Go.",
        },
    )

    def onblacklist(netid: str) -> None:
        client.links.blacklist_user_links(netid)

    def unblacklist(netid: str) -> None:
        client.links.unblacklist_user_links(netid)

    client.roles.create(
        "blacklisted",
        is_admin,
        is_valid_netid,
        custom_text={
            "title": "Blacklisted Users",
            "grant_title": "Blacklist a user:",
            "grantee_text": "User to blacklist (and disable their links)",
            "grant_button": "BLACKLIST",
            "revoke_title": "Unblacklist a user",
            "revoke_button": "UNBLACKLIST",
            "empty": "There are currently no blacklisted users",
            "granted_by": "blacklisted by",
        },
        oncreate=onblacklist,
        onrevoke=unblacklist,
    )

    def onblock(url: str) -> None:
        domain = get_domain(url)
        urls = client.db.urls
        current_app.logger.info(
            f"url {url} has been blocked. removing all urls with domain {domain}"
        )

        # . needs to be escaped in the domain because it is regex wildcard
        contains_domain = urls.find(
            {"long_url": {"$regex": "%s*" % domain.replace(".", r"\.")}}
        )

        matches_domain = [
            link for link in contains_domain if get_domain(link["long_url"]) == domain
        ]

        msg = "deleting links: " + ", ".join(
            f'{link["_id"]} -> {link["long_url"]}' for link in matches_domain
        )
        current_app.logger.info(msg)

        client.links.block_urls(list(doc["_id"] for doc in matches_domain))

    def unblock(url: str) -> None:
        urls = client.db.urls
        domain = get_domain(url)
        contains_domain = urls.find(
            {
                "long_url": {"$regex": "%s*" % domain.replace(".", r"\.")},
                "deleted": True,
                "deleted_by": "!BLOCKED",
            }
        )

        matches_domain = [
            link for link in contains_domain if get_domain(link["long_url"]) == domain
        ]
        client.links.unblock_urls(list(doc["_id"] for doc in matches_domain))

    client.roles.create(
        "blocked_url",
        is_admin,
        validate_url,
        custom_text={
            "title": "Blocked URLs",
            "invalid": "Bad URL",
            "grant_title": "Block a URL:",
            "grantee_text": "URL to block",
            "grant_button": "BLOCK",
            "revoke_title": "Unblock a URL",
            "revoke_button": "UNBLOCK",
            "empty": "There are currently no blocked URLs",
            "granted_by": "Blocked by",
        },
        process_entity=get_domain,
        oncreate=onblock,
        onrevoke=unblock,
    )

    client.roles.create(
        "whitelisted",
        lambda netid: client.roles.has_some(["admin", "facstaff", "power_user"], netid),
        is_valid_netid,
        custom_text={
            "title": "Whitelisted Users",
            "grant_title": "Whitelist a user",
            "grantee_text": "User to whitelist",
            "grant_button": "WHITELIST",
            "revoke_title": "Remove a user from the whitelist",
            "revoke_button": "UNWHITELIST",
            "empty": "You have not whitelisted any users",
            "granted_by": "Whitelisted by",
            "allow_comment": True,
            "comment_prompt": "Describe why the user has been granted access to Go.",
        },
    )

    client.roles.create(
        "facstaff",
        is_admin,
        is_valid_netid,
        custom_text={"title": "Faculty or Staff Member"},
    )


def create_app(config_path: str = "config.py", **kwargs: Any) -> Flask:
    # Backport the datetime.datetime.fromisoformat method. Can be removed
    # once we update to Python 3.7+.
    datetime_fromisoformat.MonkeyPatch.patch_fromisoformat()

    app = Flask(__name__, static_url_path="/static")
    app.config.from_pyfile(config_path, silent=False)
    app.config.update(kwargs)

    app.json_encoder = ShrunkEncoder

    formatter = RequestFormatter(
        "[%(asctime)s] [%(user)s@%(remote_addr)s] [%(url)s] %(levelname)s "
        + "in %(module)s: %(message)s",
    )
    default_handler.setFormatter(formatter)

    # install url converters
    app.url_map.converters["ObjectId"] = ObjectIdConverter
    app.url_map.converters["b32"] = Base32Converter
    app.url_map.converters["hex_token"] = HexTokenConverter

    # call initialization functions
    app.before_first_request(_init_logging)
    app.before_first_request(_init_shrunk_client)
    app.before_first_request(_init_roles)

    # wsgi middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore

    # set up blueprints
    app.register_blueprint(views.bp)
    app.register_blueprint(linkhub_viewer.bp)
    if app.config.get("DEV_LOGINS", False) is True:
        app.register_blueprint(dev_logins.bp)
    app.register_blueprint(api.link.bp)
    app.register_blueprint(api.org.bp)
    app.register_blueprint(api.role.bp)
    app.register_blueprint(api.search.bp)
    app.register_blueprint(api.admin.bp)
    app.register_blueprint(api.alert.bp)
    app.register_blueprint(api.request.bp)
    app.register_blueprint(api.security.bp)
    app.register_blueprint(api.linkhub.bp)
    app.register_blueprint(api.ticket.bp)
    app.register_blueprint(api.user.bp)

    # set up extensions
    mail = Mail()
    mail.init_app(app)
    app.mail = mail
    sso.ext.init_app(app)

    @app.route("/", methods=["GET"])
    def _redirect_to_real_index() -> Any:
        return redirect("/app")

    @app.route("/api/v1/release-notes", methods=["GET"])
    def serve_release_notes() -> Any:
        releases = json.load(
            open(
                os.path.join(
                    current_app.root_path,
                    current_app.static_folder,
                    "data",
                    "release_notes.json",
                )
            )
        )
        contributors = json.load(
            open(
                os.path.join(
                    current_app.root_path,
                    current_app.static_folder,
                    "data",
                    "contributors.json",
                )
            )
        )

        for release in releases:
            for category, changes in release["categories"].items():
                for change in changes:
                    change["contributors"] = [
                        contributors.get(contrib_id, contrib_id)
                        for contrib_id in change["contributors"]
                    ]

        return jsonify(releases)

    @app.route("/api/v1/logout", methods=["POST"])
    def logout() -> Any:
        """Clears the user's session and sends them to Shibboleth to finish logging out.
        Redirects to index if user is not logged in."""
        if "user" not in session:
            return jsonify({}), 200

        # Get the current netid and clear the session.
        netid = session["user"]["netid"]
        session.clear()

        # If the user is a dev user, all we need to do to log out is to clear the session,
        # which we did above.
        if current_app.config.get("DEV_LOGINS") and netid in {
            "DEV_USER",
            "DEV_FACSTAFF",
            "DEV_PWR_USER",
            "DEV_ADMIN",
        }:
            return jsonify({}), 200

        # If the user is not a dev user, redirect to shibboleth to complete the logout process.
        return jsonify({"redirect-to": "/shibboleth/Logout"}), 200

    @app.route("/api/v1/config", methods=["GET"])
    def get_features_status() -> Any:
        return jsonify(
            {
                "devlogins": app.config.get("DEV_LOGINS", False),
                "slack_bot": app.config.get("SLACK_INTEGRATION_ON", False),
                "tracking_pixel": app.config.get("TRACKING_PIXEL_UI_ENABLED", False),
                "linkhub": app.config.get("LINKHUB_INTEGRATION_ENABLED", False),
                "domains": app.config.get("DOMAIN_ENABLED", False),
                "role_requests": app.config.get("ROLE_REQUESTS_ENABLED", False),
            }
        )

    # webhook for GitHub Actions to alert server of new Outlook add-in release
    @app.route("/outlook/update", methods=["POST"])
    def _outlook_webhook() -> Any:
        pull_outlook_assets_from_github()
        try:
            data = request.get_data()
            data_json = json.loads(data)
            app.logger.info(current_app.config["GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET"])

            verify_signature(
                data,
                current_app.config["GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET"],
                request.headers.get("X-Hub-Signature-256"),
            )

            app.logger.info(
                "Signature verified. Proceeding with updating Outlook add-in version."
            )
        except Exception:
            app.logger.error("Signature was incorrect or unable to be verified.\n")
            return "Unauthorized", 401

        github_event = request.headers.get("X-GitHub-Event")

        def run_update_outlook_script():
            try:
                pull_outlook_assets_from_github()
            except Exception as e:
                app.logger.error("Unable to run outlook update function.\n", e)
                return "Server Error", 500

        if github_event == "create":
            ref_type = data_json["ref_type"]
            if ref_type == "tag":
                run_update_outlook_script()
        else:
            print("Not a create event. Ignoring.")
            return "OK"

        return "OK"

    @app.route("/outlook/assets/<string:env>/<path:filename>", methods=["GET"])
    def _outlook_assets_prod(env: str, filename: str) -> Any:
        OUTLOOK_PATH = f"/var/www/outlook/{env}"
        if env == "dev":
            return send_file(f"{OUTLOOK_PATH}/{filename}")
        elif env == "prod":
            return send_file(f"{OUTLOOK_PATH}/{filename}")
        else:
            return "Bad Request. Env variable was invalid.", 400

    # serve redirects
    @app.route("/<alias>", methods=["GET"])
    def _serve_shortened_links(alias: str) -> Any:
        client: ShrunkClient = current_app.client

        # Check if the alias is a legacy tracking pixel link
        link_info = client.links.get_link_info_by_alias(alias)
        if link_info is None:
            link_info = client.links.get_link_info_by_alias(alias.lower())
            alias = alias.lower()

        if link_info is None:
            return jsonify({"message": "Link not found"}), 404

        is_tracking_pixel_link = client.links.is_tracking_pixel_link(alias)
        if is_tracking_pixel_link:
            # TODO: Add legacy testing after this is done: https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/223

            # Documents have "is_trackingpixel_legacy_endpoint" field if not legacy.. lol
            if link_info.get("is_trackingpixel_legacy_endpoint", True):
                # Treat legacy tracking pixels.

                # TODO: Make this for the /<alias> route
                return redirect(f"/api/v1/t/{alias}")
            else:
                # We do not want to promote the use of tracking pixels used under the alias route.
                return jsonify({"message": "Link not found"}), 404

        long_url = client.links.get_long_url(alias)
        if long_url is None:
            return jsonify({"message": "Link not found"}), 404

        # Get or generate a tracking id
        tracking_id = request.cookies.get("shrunkid") or client.tracking.get_new_id()

        # Check if the request is coming from a custom domain
        full_domain = request.headers.get("Host", "")
        custom_domain_alias = None
        request_domain = full_domain.split(".")[0] if full_domain else ""

        if request_domain.startswith("localhost"):
            request_domain = "localhost"
        if not is_tracking_pixel_link and request_domain not in {
            "localhost",
            "go",
            "shrunk",
        }:
            custom_domain_alias = client.links.get_custom_domain(alias)
            if request_domain != custom_domain_alias:
                return jsonify({"message": "Domain not found"}), 404

        if long_url is None and not is_tracking_pixel_link:
            return jsonify({"message": "Link not found"}), 404

        # Get or generate a tracking id
        tracking_id = request.cookies.get("shrunkid") or client.tracking.get_new_id()

        client.links.visit(
            alias,
            tracking_id,
            request.remote_addr,
            request.headers.get("User-Agent"),
            request.headers.get("Referer"),
        )

        if "://" not in long_url:
            long_url = f"http://{long_url}"

        # Preserve URL parameters from the original request
        if request.query_string:
            separator = "&" if "?" in long_url else "?"
            long_url = f"{long_url}{separator}{request.query_string.decode('utf-8')}"

        response = redirect(long_url)

        # Not entirely sure what this is here for, maybe to track unique visitors?
        response.set_cookie("shrunkid", tracking_id)

        return response

    # Add "/api/v1/t/" because you're technically using an API endpoint for the websites using the tracking pixel.
    # This will also make it easier for the NGINX server in the near future.
    @app.route("/api/v1/t/<tracking_pixel>", methods=["GET"])
    def _serve_tracking_pixel(tracking_pixel: str) -> Any:
        client: ShrunkClient = current_app.client
        tracking_id = request.cookies.get("shrunkid") or client.tracking.get_new_id()

        if client.links.get_link_info_by_alias(tracking_pixel) is None:
            return "There was an error trying to find your tracking pixel.", 404

        client.links.visit(
            tracking_pixel,
            tracking_id,
            request.remote_addr,
            request.headers.get("User-Agent"),
            request.headers.get("Referer"),
        )

        extension = None

        if "." in tracking_pixel:
            extension = tracking_pixel.split(".")[-1]
        else:
            extension = "gif"

        filename = "./static/img/pixel.{}".format(extension)
        response = send_file(filename, mimetype="image/{}".format(extension))
        response.headers["X-Image-Name"] = "pixel.{}".format(extension)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        response.set_cookie("shrunkid", tracking_id)

        return response

    @app.before_request
    def _record_visit() -> None:
        netid = flask.session["user"]["netid"] if "user" in flask.session else None
        endpoint = flask.request.endpoint or "error"
        current_app.client.record_visit(netid, endpoint)

    return app
