#!/usr/bin/env python3

import subprocess
import fnmatch
from setuptools import Command, setup, find_packages
from setuptools.command.build_py import build_py as _build_py


VERSION = '1.3.2'

AUTHOR = 'Rutgers Open System Solutions'


class BuildWebpack(Command):
    description = 'build webpack assets'

    user_options = [
        ('webpack-config', 'c', 'webpack configuration file')
    ]

    def initialize_options(self):
        self.webpack_config = 'webpack.config.js'

    def finalize_options(self):
        pass

    def run(self):
        subprocess.run(['npx', 'webpack',
                        '--config', self.webpack_config,
                        '--env', 'prod'])


class build_py(_build_py):
    EXCLUDED = ['shrunk/config.py', 'shrunk/test-config.py']

    def find_package_modules(self, package, package_dir):
        modules = super().find_package_modules(package, package_dir)
        return (mod for mod in modules if not any(fnmatch.fnmatchcase(mod[2], pat) for pat in self.EXCLUDED))

    def run(self):
        self.run_command('build_webpack')
        return super().run()


CMDCLASS = {
        'build_py': build_py,
        'build_webpack': BuildWebpack
    }

COMMAND_OPTIONS = {}


try:
    from sphinx.setup_command import BuildDoc
    CMDCLASS['build_sphinx'] = BuildDoc
    COMMAND_OPTIONS['build_sphinx'] = {
        'project': ('setup.py', 'shrunk'),
        'version': ('setup.py', VERSION),
        'source_dir': ('setup.py', 'doc')
    }
except ImportError:
    pass


with open('pip.req', 'r') as f:
    requires = [line.rstrip() for line in f]


with open('README.md', 'r') as f:
    readme = f.read()


setup(
    name='shrunk',
    version=VERSION,
    packages=find_packages(),
    package_data={'shrunk': ['static/webpack-stats.json', 'static/dist/*', 'static/img/*',
                             'templates/*', 'templates/errors/*']},
    include_package_data=True,
    zip_safe=False,
    install_requires=requires,
    author=AUTHOR,
    author_email='oss@oss.rutgers.edu',
    description='Rutgers University URL Shortener',
    long_description=readme,
    long_description_content_type='text/markdown',
    keywords='shrunk rutgers url shortener',
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3.6',
        'Topic :: Utilities'
    ],
    url='https://github.com/oss/shrunk',
    command_options=COMMAND_OPTIONS,
    cmdclass=CMDCLASS
)
