#!/usr/bin/env python3

from typing import Any
import fnmatch
from setuptools import setup, find_packages
from setuptools.command.build_py import build_py as _build_py


VERSION = "2.4.7"

AUTHOR = "Rutgers Open System Solutions"


class build_py(_build_py):
    EXCLUDED = ["shrunk/config.py"]

    def find_package_modules(self, package: Any, package_dir: Any) -> Any:
        modules = super().find_package_modules(package, package_dir)
        return (
            mod
            for mod in modules
            if not any(fnmatch.fnmatchcase(mod[2], pat) for pat in self.EXCLUDED)
        )


CMDCLASS = {
    "build_py": build_py,
}

COMMAND_OPTIONS = {}


try:
    from sphinx.setup_command import BuildDoc

    CMDCLASS["build_sphinx"] = BuildDoc  # type: ignore
    COMMAND_OPTIONS["build_sphinx"] = {
        "project": ("setup.py", "shrunk"),
        "version": ("setup.py", VERSION),
        "source_dir": ("setup.py", "doc"),
    }
except ImportError:
    pass


with open("requirements.txt", "r") as f:
    requires = [line.rstrip() for line in f]


with open("../README.md", "r") as f:
    readme = f.read()


setup(
    name="shrunk",
    version=VERSION,
    packages=find_packages(),
    package_data={
        "shrunk": ["static/dist/*", "static/img/*", "static/css/*", "templates/*"]
    },
    include_package_data=True,
    zip_safe=False,
    install_requires=requires,
    author=AUTHOR,
    author_email="oss@oit.rutgers.edu",
    description="Rutgers University URL Shortener",
    long_description=readme,
    long_description_content_type="text/markdown",
    keywords="shrunk rutgers url shortener",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.6",
        "Topic :: Utilities",
    ],
    url="https://github.com/oss/shrunk",
    command_options=COMMAND_OPTIONS,
    cmdclass=CMDCLASS,
)
