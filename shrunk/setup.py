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
    'Flask==1.0.3',
    'Flask-SSO==0.4.0',
    'Flask-Assets==0.12',
    'Flask-WTF==0.14',
    'cssmin==0.2.0',
    'jsmin==2.2.2',
    'Jinja2==2.10.1',
    'MarkupSafe==0.23',
    'WTForms==2.0.1',
    'Werkzeug==0.15.4',
    'itsdangerous==0.24',
    'pyasn1==0.1.7',
    'pymongo==3.8.0',
    'geoip2==2.4.0',
    'uwsgidecorators==1.1.0',
    'httpagentparser==1.8.2',
    'python-ldap==3.2.0'
]

setup(
    name="shrunk",
    version="1.0.3",
    packages=["shrunk"],
    install_requires=require,
    package_dir={"shrunk": "shrunk"},
    package_data={"shrunk": ["util/*", "roles/*", "static/css/*", "static/img/*", "static/js/*",
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
