shrunk
======

A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.6**.

Development Environment
-----------------------

Python dependencies are enumerated in `pip.req`. You can set up an appropriate
virtual environment with the following:

    $ virtualenv --no-site-packages --python="python3" venv
    $ source venv/bin/activate
    $ pip install -r pip.req

Optional dev dependencies are enumerated in `pip.req.dev`. You can install them
with

    $ pip install -r pip.req.dev

After setting up the python development environment, install the Javascript dependencies
with

    $ npm i

This command will install dependencies from `package-lock.json`.

Documentation
-------------

After setting up the virtual environment, you can generate HTML documentation
by running `./build_docs.sh` from the root of the project. The documentation will
be placed in `./docs_out`.

Features
--------

### Web Application

- Log in with a Rutgers NetID
- Create a short URL from a long URL
- Given a NetID, what URLs have they created?
- Analytics on visits. With graphs and maps!
- Create organizations to share links with your friends!

### URL Shortening Service

- Given a short URL, redirect to the long URL
- Track visits to the short URL
- Track popularity and number of clicks

Distribution steps
------------------

1. cd to the root of the git repo
2. change the version in setup.py
3. `git tag <your version> -m "some description/changelog"`
4. `rm -rf dist/ build/ shrunk.egg-info`
5. `./setup.py bdist_wheel` puts a whl in `dist/`
6. `python -m twine upload --repository-url https://test.pypi.org/legacy/ dist/*` to upload to test pypi
7. `python -m twine upload dist/*` to upload to pypi

WARNING: don't use `sdist`. `sdist` won't run webpack, so the frontend assets won't get compiled. Use `bdist_wheel`.
