from typing import Any

from flask import (Blueprint,
                   send_from_directory,
                   make_response)

__all__ = ['bp']

bp = Blueprint('linkhub', __name__, url_prefix='/h', static_folder="app", static_url_path="/app")


@bp.route('/', methods=['GET'])
def index() -> Any:
    resp = make_response(send_from_directory('static/dist', 'linkhub-loader.html'))
    return resp