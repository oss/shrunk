# shrunk

A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.6**.

## Getting started

First, if you haven't already, [add an SSH key to your GitLab account](https://docs.gitlab.com/ee/ssh/#common-steps-for-generating-an-ssh-key-pair). Then, clone this repository (via ssh) to a local directory:

    $ git clone git@gitlab.rutgers.edu:MaCS/OSS/shrunk.git

### Backend

Note: Prior to beginning the main installation of Shrunk, WSL2 (Windows Subsystem for Linux) users will likely need to [install additional packages first](https://stackoverflow.com/a/4768467/13026376).

Set up a virtual environment for the backend and install the python dependencies with:

    $ cd backend/
    $ virtualenv --no-site-packages --python="python3" venv
    $ source venv/bin/activate
    $ pip install wheel
    $ pip install -r backend/requirements.txt
    $ pip install -r backend/requirements-dev.txt

you need to make a copy of the example config and setup a local mongodb

    $ cd backend
    $ ./setup.py build_sphinx

This will place the Shrunk developer manual in `./build/sphinx/html`. Open the file
`index.html` in that directory to learn how to finish setting up the backend and setting up the frontend by reading the tutorials linked therein!

### Docs

The backend docs are written with reStructuredText. Here's a [cheatsheat](https://docutils.sourceforge.io/docs/user/rst/quickref.html) to quickly get started with it.

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

### ACL link permissions by endpoint

- you can list all the endpoint with `flask routes`
