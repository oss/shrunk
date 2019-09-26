#!/usr/bin/env python3.6

""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

require = [
    'shrunk==1.1.0',
    'pytest==5.0.0',
    'flake8==3.7.7',
    'pylint==2.3.1',
    'pytest-cov==2.7.1',
    'mypy==0.711',
    'autopep8==1.4.4',
    'beautifulsoup4==4.7.1'
]

setup(
    name="shrunk_test",
    version="1.1.0",
    packages=["shrunk.test"],
    install_requires=require,
    package_dir={"shrunk_test": "test"},
    author="Rutgers Open System Solutions",
    author_email="oss@oss.rutgers.edu",
    description="Rutgers University URL Shortener (unit tests)",
    keywords="shrunk rutgers url shortener",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.6",
        "Topic :: Utilities"
    ],
    url="https://github.com/oss/shrunk"
)
