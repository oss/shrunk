import os.path
import json
import itertools

import flask


class WebpackError(Exception):
    pass


class WebpackLoader:
    def __init__(self, app):
        self.stats_file_path = os.path.join(app.static_folder, 'webpack-stats.json')
        app.add_template_global(self._bundle, name='bundle')
        self._try_load_webpack_stats()
        if app.config['DEBUG']:
            try:
                self._set_up_watcher(app)
            except ImportError:
                app.logger.error(
                    'watchdog not found. run pip install watchdog to monitor webpack-stats.json for changes.')

    def _set_up_watcher(self, app) -> None:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        class WebpackHandler(FileSystemEventHandler):
            def __init__(self, ext):
                super().__init__()
                self.ext = ext

            def _handle_event(self, event):
                if event.src_path.endswith('webpack-stats.json'):
                    if self.ext._try_load_webpack_stats():
                        app.logger.info('webpack-stats.json reloaded')

            def on_created(self, event):
                self._handle_event(event)

            def on_modified(self, event):
                self._handle_event(event)

        observer = Observer()
        handler = WebpackHandler(self)
        observer.schedule(handler, path=app.static_folder, recursive=False)
        observer.start()
        app.logger.info('Watching webpack-stats.json')

    def _try_load_webpack_stats(self) -> bool:
        try:
            with open(self.stats_file_path, 'r') as stats_file:
                webpack_stats = json.load(stats_file)
            if webpack_stats['status'] != 'done':
                return False
            self.webpack_stats = webpack_stats
            return True
        except (FileNotFoundError, json.decoder.JSONDecodeError):
            return False

    def _bundle(self, entrypoint_name):
        if not hasattr(self, 'webpack_stats'):
            raise WebpackError

        def create_tag(chunk) -> str:
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
        return flask.Markup('\n'.join(map(create_tag, itertools.chain(*entrypoint))))
