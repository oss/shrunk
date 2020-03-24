from flask import make_response


def make_plaintext_response(data, *, status=200, filename=None):
    headers = {'Content-Type': 'text/plain; charset=utf-8'}
    if filename:
        headers['Content-Disposition'] = 'attachment; filename={}'.format(filename)
    return make_response((data, status, headers))


def get_param(name, request, session, *, default=None, validator=None):
    """ Get a parameter. First try the request args, then the session,
        then use the default. Store the final value of the parameter
        in the session. Optionally apply a validator to the parameter,
        falling back to the default if validation fails. """
    if validator:
        assert default
    param = request.args.get(name)
    param = param if param is not None else session.get(name)
    param = param if param is not None else default
    if validator and not validator(param):
        param = default
    if param is not None:
        session[name] = param
    return param
