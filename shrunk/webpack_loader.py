import os.path
import json
import itertools

import flask


class WebpackError(Exception):
    pass


class WebpackLoader:
    def __init__(self, app):
        stats_file_path = os.path.join(app.static_folder, 'webpack-stats.json')
        with open(stats_file_path, 'r') as stats_file:
            webpack_stats = json.load(stats_file)
        if webpack_stats['status'] != 'done':
            raise WebpackError
        self.webpack_stats = webpack_stats
        app.add_template_global(self._bundle, name='bundle')

    def _bundle(self, entrypoint_name):
        def create_tag(chunk):
            name = chunk['name']
            public_path = chunk['publicPath']
            if name.endswith('.js'):
                return f'<script type="text/javascript" src="{public_path}"></script>'
            if name.endswith('.css'):
                return f'<link type="text/css" rel="stylesheet" href="{public_path}"/>'
            return ''

        try:
            entrypoint = self.webpack_stats['entryPoints'][entrypoint_name]
        except IndexError:
            raise WebpackError
        return flask.Markup('\n'.join(create_tag(chunk) for chunk in itertools.chain(*entrypoint)))
