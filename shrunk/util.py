import json

from flask import make_response

def unauthorized():
    headers = {'Content-Type': 'text/plain; charset=utf-8'}
    return make_response('Unauthorized', 401, headers)

def make_plaintext_response(data, *, status=200, filename=None):
    headers = {'Content-Type': 'text/plain; charset=utf-8'}
    if filename:
        headers['Content-Disposition'] = 'attachment; filename={}'.format(filename)
    return make_response((data, status, headers))

def make_json_response(data, *, status=200, filename=None):
    return make_plaintext_response(json.dumps(data), status=status, filename=filename)
