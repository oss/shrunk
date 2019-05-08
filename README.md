shrunk
======
A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.3**.

Virtual Environment
-------------------
Python dependencies are enumerated in `pip.req`. You can set up an appropriate
virtual environment with the following:

    $ virtualenv --no-site-packages --python="python3" virtualenv
    $ source virtualenv/bin/activate
    $ pip install -r pip.req

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
- Analytics on visits

### URL Shortening Service
- Given a short URL, redirect to the long URL
- Track visits to the short URL
- Track popularity and number of clicks

Distribution steps
--------
assuming you're in the root of the git repo
1. git tag <your version> -m "some description/changelog"
2. `rm -rf dist/ shrunk.egg-info`
3. `python3 setup.py sdist` puts a tar in dist/
4. `python3 -m twine upload --repository-url https://test.pypi.org/legacy/ dist/*` to upload to test pypi
5. `python3 -m twine upload dist/*` to upload to pypi
WARNING: Don't use bdist_wheel. bdist_wheel refuses to exclude config.py,
so if you have one in here for testing, it will package it and give our secret
and privs out to the public