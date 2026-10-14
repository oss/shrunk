"""Error helpers must retain a safe response for unlisted HTTP statuses."""

import pytest

from shrunk.api_errors import ApiProblem, http_error_payload


@pytest.mark.parametrize("fields", [None, {}, {"url": "Enter a valid URL."}])
def test_actionable_error_preserves_its_public_contract(fields: dict[str, str] | None) -> None:
    fields = fields.copy() if fields is not None else None
    problem = ApiProblem(422, "INVALID_URL", "Check the URL.", fields=fields)
    assert problem.status_code == 422
    assert str(problem) == "Check the URL."
    expected = {"code": "INVALID_URL", "message": "Check the URL."}
    assert problem.to_dict() == {"error": {**expected, **({"fields": fields} if fields else {})}}
    if fields:
        fields["url"] = "Changed by caller"
        assert problem.to_dict()["error"]["fields"] == {"url": "Enter a valid URL."}


def test_listed_http_status_uses_its_specific_error_payload() -> None:
    assert http_error_payload(403) == {
        "error": {
            "code": "PERMISSION_DENIED",
            "message": "You do not have permission to perform this action.",
        }
    }


@pytest.mark.parametrize("status", [500, 502, 599])
def test_unlisted_http_status_has_generic_error_payload(status: int) -> None:
    assert http_error_payload(status) == {
        "error": {
            "code": f"HTTP_{status}",
            "message": "The server could not complete this request. Please try again.",
        }
    }
