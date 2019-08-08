#!/usr/bin/env python3.6

""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

require = [
    'shrunk==1.0.2',
    'pytest==5.0.0',
    'pytest-cov==2.7.1',
    'beautifulsoup4==4.7.1'
]

setup(
    name="shrunk_test",
    version="1.0.2",
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
