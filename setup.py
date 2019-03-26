""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

# Text from the README
try:
    with open("README.rst") as fd:
        readme_text = fd.read()
except:
    readme_text = ""

setup(
    name = "shrunk",
    version = "0.9",
    packages = ["shrunk"],
    # requires = ["pymongo", "wtforms", "flask"],
    install_requires = [
        'Flask==0.10.1',
        'Flask-Login==0.2.11',
        'flask-restful==0.3.5',
        'Jinja2==2.7.3',
        'MarkupSafe==0.23',
        'WTForms==2.0.2',
        'Werkzeug==0.11.11',
        'itsdangerous==0.24',
        'pyasn1==0.1.7',
        'pymongo==3.1.1',
        'python3-ldap>=0.9.7',
        'geoip2==2.4.0',
        'pyqrcode==1.2.1',
        'pypng==0.0.18',
        'mongoengine==0.11.0'],
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
