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
