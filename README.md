shrunk
======
A URL shortener for Rutgers University.

Uses MongoDB. Python code targets _Python 3.3_.

Virtual Environment
-------------------
Python dependencies are enumerated in `pip.req`. You can set up an appropriate
virtual environment with the following:

    $ virtualenv --no-site-packages --python="python3" virtualenv
    $ source virtualenv/bin/activate
    $ pip install -r pip.req

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
