

__all__ = ['bp']

bp = Blueprint('security', __name__, url_prefix='/api/v1/security')


DetectedLinkStatus = Enum(pending='pending',
                          approved='approved',
                          denied='denied',
                          deleted='deleted')

# a copy of link schmea in link api
CREATE_PENDING_LINK_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['title', 'long_url'],
    'properties': {
        'title': {'type': 'string', 'minLength': 1},
        'long_url': {'type': 'string', 'minLength': 1},
        'expiration_time': {'type': 'string', 'format': 'date-time'},
        'editors': {'type': 'array', 'items': ACL_ENTRY_SCHEMA},
        'viewers': {'type': 'array', 'items': ACL_ENTRY_SCHEMA},
        'bypass_security_measures': {'type': 'boolean'},
        'status': {'enum': [status for status in DetectedLinkStatus]},
        'net_id_of_last_modifier': {'type': 'string'}
    },
}