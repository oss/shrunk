import re
import segno
from io import BytesIO
from werkzeug.exceptions import abort
from PIL import Image

from shrunk.client import ShrunkClient
from flask import Blueprint, jsonify, request, Response
from shrunk.util.decorators import require_external_token_auth, request_schema


__all__ = ["bp"]

bp = Blueprint("extern_link", __name__, url_prefix="/api/v1/link")


@bp.route("/", methods=["GET"])
def hi() -> str:
    return "Hi"

CREATE_LINK_SCHEMA = {
    "type": "object",
    "required": ["originalUrl"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "originalUrl": {"type": "string", "minLength": 1},
    },
}
@bp.route("/", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_external_token_auth
def create_link(_: str, client: ShrunkClient, req: dict) -> Response:
    original_url = req["originalUrl"]
    title = req.get("title")

    if not original_url:
        return jsonify({"error": "originalUrl is required"}), 400

    link = client.links.create(title, original_url)
    return "Hi"

@bp.route("/qrcode", methods=["GET"])
def generate_qrcode():
    """
    ``GET /api/v1/link/qrcode``

    Quick test route: http://localhost:4343/api/core/link/qrcode?text=https://rutgers.edu
    """
    allowed_patterns = [
        r"^https?:\/\/([0-9a-z]+\.)?rutgers\.edu(?:\/.*)?$",
        r"^https?:\/\/([0-9a-z]+\.)?scarletknights\.com(?:\/.*)?$",
    ]
    text = request.args.get("text", default="", type=str)
    width = request.args.get("width", default=300, type=int)
    height = request.args.get("height", default=300, type=int)

    if not any(re.match(pattern, text) for pattern in allowed_patterns):
        abort(403)

    # Generate the QR code using segno
    qr = segno.make(text)

    # Create a BytesIO stream for the image
    img_io = BytesIO()

    # Save the QR code to the BytesIO stream as PNG
    qr.save(img_io, kind="png", scale=10)
    img_io.seek(0)

    img = Image.open(img_io)
    resized_img = img.resize((width, height), Image.NEAREST)

    resized_img_io = BytesIO()
    resized_img.save(resized_img_io, format="PNG")
    resized_img_io.seek(0)

    return Response(
        resized_img_io.getvalue(), mimetype="image/png", direct_passthrough=True
    )
