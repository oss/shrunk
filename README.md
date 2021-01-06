# shrunk

A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.6**.

## Getting started

First, clone this repository to a local directory:
$ git clone https://gitlab.rutgers.edu/MaCS/OSS/shrunk.git # via http

### Backend

Set up a virtual environment for the backend and install the python dependencies with:
$ cd backend/
$ virtualenv --no-site-packages --python="python3" venv
$ source venv/bin/activate
$ pip install -r requirements.txt
$ pip install -r requirements-dev.txt

Then build the HTML documentation with

    $ ./setup.py build_sphinx

This will place the Shrunk developer manual in `./build/sphinx/html`. Open the file
`index.html` in that directory and start reading the tutorials linked therein! Be sure to set up the frontend and the backend by reading the tutorials in order to get the web app running.

## Features

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
