from . import link

import re
import segno
from io import BytesIO
from flask import Blueprint, request, Response
from werkzeug.exceptions import abort
from PIL import Image

__all__ = ["link"]

bp = Blueprint("base_extern", __name__)


@bp.route("/api/core/link/qrcode", methods=["GET"])
def generate_qrcode():
    """
    ``GET /api/core/link/qrcode``

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
