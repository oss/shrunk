#!/usr/bin/env python3.6

""" shrunk - Rutgers University URL Shortener """

from setuptools import setup

require = [
    'shrunk',
    'pytest==5.0.0',
    'pytest-cov==2.7.1'
]

setup(
    name="shrunk_test",
    version="0.6.7",
    packages=["shrunk.test"],
    install_requires=require,
    package_dir={"shrunk_test": "test"},
    author="Rutgers Open System Solutions",
    author_email="oss@oss.rutgers.edu",
    description="Rutgers University URL Shortener (unit tests)",
    keywords="shrunk rutgers url shortener",
    classifiers=[
        "Development Status :: 4 - Beta",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Topic :: Utilities"
    ],
    url="https://github.com/oss/shrunk"
)
