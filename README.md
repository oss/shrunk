shrunk
======

A URL shortener for Rutgers University. For more information, contact [Rutgers
Open System Solutions](http://oss.rutgers.edu).

Uses MongoDB. Python code targets **Python 3.6**.

Getting started
---------------
### Backend

First set up a virtual environment for the backend and install the python dependencies with:
    $ cd backend/
    $ virtualenv --no-site-packages --python="python3" venv
    $ source venv/bin/activate
    $ pip install -r requirements.txt
    $ pip install -r requirements-dev.txt

Then build the HTML documentation with

    $ ./setup.py build_sphinx

This will place the Shrunk developer manual in `./build/sphinx/html`. Open the file
`index.html` in that directory and start reading the tutorials linked therein!

### Frontend

Now install the npm dependencies and build the documentation for the frontend by doing the following:
    $ cd ../frontend
    $ npm i
    $ npm run doc

After running those commands, you will see that the npm modules have been installed in `./node_modules`, and the documentation will have been placed in `./docs`. Open the `index.html` file there to read the documentation!

### Running the Application

To run the application, there are some things you need to do first.
1. To start the backend (for development):
    1. Export the environmental variables specified in the sphinx docs.
    2. Create your own config file (or copy the example) in `backend/`.
    3. Run the following command in `backend/`:
        $ flask run

You'll see that the server is now running on 127.0.0.1:5000, or something similar.

2. Start the frontend by running the following command in `frontend` in a separate terminal:
    $ npm run watch

Now go to 127.0.0.1:5000 in your web browser, and you should be greeted with the Go login page.

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
