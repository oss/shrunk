#!/usr/bin/env python3.6

""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

# Text from the README
try:
    with open("../README.md") as fd:
        readme_text = fd.read()
except FileNotFoundError:
    readme_text = ""

require = [
    'Flask==1.1.1',
    'Flask-SSO==0.4.0',
    'Flask-Assets==0.12',
    'Flask-WTF==0.14.2',
    'cssmin==0.2.0',
    'jsmin==2.2.2',
    'Jinja2==2.10.1',
    'MarkupSafe==1.1.1',
    'WTForms==2.2.1',
    'Werkzeug==0.16.0',
    'itsdangerous==1.1.0',
    'pymongo==3.9.0',
    'geoip2==2.9.0',
    'httpagentparser==1.9.0',
    'click==7.0',
    'python-ldap==3.2.0'
]

setup(
    name="shrunk",
    version="1.1.2",
    packages=["shrunk"],
    install_requires=require,
    package_dir={"shrunk": "shrunk"},
    package_data={"shrunk": ["util/*", "roles/*", "client/*", "static/css/*", "static/img/*", "static/js/*",
                             "static/scss/*", "static/out/*", "static/bootstrap/*",
                             "templates/*", "templates/errors/*", "../scripts/*"]},
    author="Rutgers Open System Solutions",
    author_email="oss@oss.rutgers.edu",
    description="Rutgers University URL Shortener",
    long_description=readme_text,
    long_description_content_type="text/markdown",
    keywords="shrunk rutgers url shortener",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.6",
        "Topic :: Utilities"
    ],
    url="https://github.com/oss/shrunk",
    entry_points={
        'flask.commands': [
            'assets = flask_assets:assets'
        ]
    }
)
