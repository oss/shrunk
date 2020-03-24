#!/usr/bin/env python3

import subprocess
from setuptools import Command, setup, find_packages
from setuptools.command.build_py import build_py as _build_py


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
    def run(self):
        self.run_command('build_webpack')
        return super().run()


with open('pip.req', 'r') as f:
    requires = [line.rstrip() for line in f]


with open('README.md', 'r') as f:
    readme = f.read()


setup(
    name='shrunk',
    version='1.3.0',
    packages=find_packages(),
    package_data={'shrunk': ['static/webpack-stats.json', 'static/dist/*', 'static/img/*', 'templates/*', 'templates/errors/*']},
    include_package_data=True,
    zip_safe=False,
    install_requires=requires,
    author='Rutgers Open System Solutions',
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
    cmdclass={
        'build_py': build_py,
        'build_webpack': BuildWebpack
    }
)
