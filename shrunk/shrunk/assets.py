""" Creates asset bundles. """

import flask_assets

ext = flask_assets.Environment()

# Compile+minify bootstrap with our custom settings.
ext.register('shrunk_bootstrap',
             flask_assets.Bundle('scss/shrunk_bootstrap.scss',
                                 filters='scss,cssmin',
                                 output='out/shrunk_bootstrap.css'))

# Minify Shrunk CSS.
ext.register('shrunk_css',
             flask_assets.Bundle('css/*.css',
                                 filters='cssmin',
                                 output='out/shrunk_css.css'))

JS_BUNDLES = {
    'shrunk_js': [],
    'shrunk_index': ['js/index.js', 'js/ajax_form.js'],
    'shrunk_qr': ['js/qrcode.js', 'js/shrunkqr.js'],
    # Why does 'shrunk_stats_' end in an underscore? Because uBlock likes to block
    # scripts whose name ends in 'stats.js'.
    'shrunk_stats_': ['js/stats.js'],
    'shrunk_organizations': ['js/organizations.js', 'js/delete_organization.js',
                             'js/ajax_form.js'],
    'shrunk_manage_org': ['js/manage_organization.js', 'js/delete_organization.js',
                          'js/ajax_form.js'],
}

for bundle_name, bundle_files in JS_BUNDLES.items():
    ext.register(bundle_name,
                 flask_assets.Bundle('js/shrunk.js', *bundle_files,
                                     filters='jsmin',
                                     output=f'out/{bundle_name}.js'))
