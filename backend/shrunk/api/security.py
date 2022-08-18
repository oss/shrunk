from crypt import methods
from os import link
from pydoc import cli
from typing import Any

from flask import Blueprint, abort, current_app, jsonify
from shrunk.client import ShrunkClient
from ..client.exceptions import NoSuchObjectException, InvalidStateChange
from shrunk.util.decorators import require_login
from bson import ObjectId

__all__ = ['bp']

bp = Blueprint('security', __name__, url_prefix='/api/v1/security')


@bp.route('/promote/<ObjectId:link_id>', methods=['PATCH'])
@require_login
def promote(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``PATCH /api/v1/security/promote``

    Promotes a pending link to an actual link, creating a link document in
    the link collection.

    :param link_id: id of link to promote
    """
    if not client.roles.has('admin', netid):
        abort(403)

    current_app.logger.warning(f'calling link status with objectid of {link_id}')
    current_app.logger.warning(client.security.get_pending_links())

    try:
        link_id = client.security.promote_link(netid, link_id)
    except NoSuchObjectException:
        return jsonify({'errors': ['link is not pending']}), 404
    except InvalidStateChange:
        return jsonify({'errors': ['cannot promote non-pending link']}), 409
    except Exception as err:
        current_app.logger.warning(err)

    return jsonify({'_id': link_id}), 200


@bp.route('/reject/<ObjectId:link_id>', methods=['PATCH'])
@require_login
def reject(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``PATCH /api/v1/security/patch``

    Rejects a pending link, denying link creation in link collection forever.

    :param link_id: id of link to reject

    """
    if not client.roles.has('admin', netid):
        abort(403)

    try:
        client.security.reject_link(netid, link_id)
    except NoSuchObjectException:
        return jsonify({'errors': ['link is not pending']}), 404
    except InvalidStateChange:
        return jsonify({'errors': ['cannot demote non-pending link']}), 409
    except Exception as err:
        current_app.logger.warning(err)

    return jsonify({}), 200


@bp.route('/security_test/<b32:long_url>', methods=['GET'])
@require_login
def security_test(netid: str, client: ShrunkClient, long_url: str) -> Any:
    """``GET /api/v1/security/security_test/<b32:long_url>``

    This endpoint is meant for testing purposes only; it should only be called in the unit tests.
    The purpose of this endpoint is to modularize testing of the security measures. In the case
    that the security measures do not work, this test will be the first to clearly show that.
    """

    if not client.roles.has('admin', netid):
        abort(403)
    return jsonify({'detected': client.security.security_risk_detected(long_url)})


@bp.route('/pending_links', methods=['GET'])
@require_login
def get_pending_links(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/v1/security/pending_links``

    Retrieves a list of pending links
    """
    if not client.roles.has('admin', netid):
        abort(403)

    return jsonify({'pendingLinks': client.security.get_pending_links()}), 200


@bp.route('/pending_links/count', methods=['GET'])
@require_login
def get_pending_link_count(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/v1/security/pending_links/count``

    Retrieves the length of the list of pending links
    """
    if not client.roles.has('admin', netid):
        abort(403)
    return jsonify({
        'pending_links_count': client.security.get_number_of_pending_links()
        }), 200


@bp.route('/status/<ObjectId:link_id>', methods=['GET'])
@require_login
def get_link_status(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/v1/security/status/<ObjectId:link_id>``

    Gets the status of a pending link by id.
    :param link_id:
    """
    if not client.roles.has('admin', netid):
        abort(403)
    try:
        link_document = client.security.get_unsafe_link_document(link_id)
    except NoSuchObjectException:
        return jsonify({'error': ['object does not exist']}), 404
    except Exception:
        return jsonify({'error': ['an unknown exception when getting link status']}), 500

    return jsonify({
        'title': link_document['title'],
        'status': link_document['status']
    }), 200


@bp.route('/toggle', methods=['PATCH'])
@require_login
def toggle_security(netid: str, client: ShrunkClient) -> Any:
    """``PATCH /api/v1/security/toggle``

    Toggles whether or not security measures are on
    """
    if not client.roles.has('admin', netid):
        abort(403)
    try:
        status = client.security.toggle_security()
    except Exception:
        return jsonify({'error': ['an error occurred while toggling security']}), 500

    return jsonify({
        'status': status
    }), 200


@bp.route('/get_status', methods=['GET'])
@require_login
def get_security_status(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/v1/security/get_status``

    Checks the status of security measures
    """
    if not client.roles.has('admin', netid):
        abort(403)
    try:
        status = client.security.get_security_status()
    except Exception:
        return jsonify({'error': ['an error occurred while obtaining security status']}), 500

    return jsonify({
        'status': status
    }), 200
