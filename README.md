shrunk
======

A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.6**.

Getting started
---------------

this instructions are for a locla native install, but you can also use the
shrunk-docker repo, to set things up much easier.
First set up a virtual environment and install the python dependencies with:

	$ sudo yum install python-devel openldap-devel
	$ (or if on debian) sudo apt-get install libsasl2-dev python-dev libldap2-dev libssl-dev
	$ virtualenv --no-site-packages --python="python3" venv
    $ source venv/bin/activate
	$ pip install wheel
    $ pip install -r backend/requirements.txt
    $ pip install -r backend/requirements-dev.txt

you need to make a copy of the example config and setup a local mongodb

	$ cp backend/shrunk/config.py.example backend/shrunk/config.py

now to setup the frontend

	$ cd frontend
	$ npm install
	$ npm run build

Running the backend and development
-------------------

running the backend

	$ cd backend
	$ FLASK_APP=shrunk flask run

for frontend work it is bset to run this command to auto rebuild the frontend

	$ cd frontend
	$ npm run watch

now it should be running on localhost:5000


you may need to put a symbolic link from dist into the backend/shrunk/static folder
to make things work

Then build the HTML documentation with

    $ ./setup.py build_sphinx

This will place the Shrunk developer manual in `./build/sphinx/html`. Open the file
`index.html` in that directory and start reading the tutorials linked therein!

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
