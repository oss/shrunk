from flask import current_app
import ldap


def validate_netid_chars(netid):
    return netid.isalnum()


def is_valid_netid(netid):
    """ Return True if the netid is valid, false otherwise. """
    if not current_app.config['LDAP_VALIDATE_NETIDS']:
        return True

    if current_app.config['DEV_LOGINS'] and netid.startswith('DEV_'):
        return True

    if not validate_netid_chars(netid):
        return False

    conn = ldap.initialize(current_app.config['LDAP_URI'])
    try:
        conn.simple_bind_s(current_app.config['LDAP_BIND_DN'], current_app.config['LDAP_CRED'])
        query = current_app.config['LDAP_QUERY_STR'].format(netid)
        res = conn.search_s(current_app.config['LDAP_BASE_DN'], ldap.SCOPE_SUBTREE, query)
        if res:
            current_app.logger.debug(f'validated netid {netid}: {res}')
            return True
        current_app.logger.debug(f'failed to validate netid {netid}')
        return False
    except ldap.INVALID_CREDENTIALS:
        current_app.logger.error('could not bind to LDAP server!')
        return True
    except ldap.SERVER_DOWN:
        current_app.logger.error(f'LDAP server down: could not validate {netid}')
        return True
