""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

# Text from the README
try:
    with open("README.rst") as fd:
        readme_text = fd.read()
except:
    readme_text = ""

require = [
    'Flask>=0.10.1',
    'Flask-SSO>=0.4.0',
    'Jinja2>=2.7.3',
    'MarkupSafe>=0.23',
    'WTForms>=2.0.1',
    'Werkzeug>=0.9.6',
    'itsdangerous>=0.24',
    'pyasn1>=0.1.7',
    'pymongo>=2.7.2',
]

setup(
    name = "shrunk",
    version = "0.4.5",
    packages = ["shrunk"],
    requires = require,
    package_dir = {"shrunk": "shrunk"},
    package_data = {"shrunk": ["static/css/*", "static/img/*", "static/js/*",
                               "templates/*"]},
    author = "Rutgers Open System Solutions",
    author_email = "oss@oss.rutgers.edu",
    description = "Rutgers University URL Shortener",
    long_description = readme_text,
    keywords = "shrunk rutgers url shortener",
    classifiers = [
        "Development Status :: 4 - Beta",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Topic :: Utilities"
    ],
    url = "https://github.com/oss/shrunk"
)
