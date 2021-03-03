Backend development tutorial
============================

.. _shrunk-venv:

Setting up your Shrunk dev environment
--------------------------------------

First, clone the git repo to a local directory (via ssh)::

  $ git clone git@gitlab.rutgers.edu:MaCS/OSS/shrunk.git 

``cd`` into the repository, create a new virtual environment, and install the Python dependencies::

  $ python -m venv venv
  $ source venv/bin/activate
  $ pip install -r backend/requirements.txt
  $ pip install -r backend/requirements-dev.txt

Setting up Mongo
----------------

Now, install MongoDB. Shrunk uses MongoDB v4.x. On CentOS, this can be accomplished by following the official `instructions <https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/>`__.

After you have installed mongodb, start and enable it with:

.. parsed-literal::

  \# systemctl enable --now mongod

You should now check that mongodb is running. You can do this by executing the mongo shell::

  $ mongo

If you get a prompt, everything is good. Now you can go ask someone for a dump of the Shrunk database
and ``mongorestore`` it so that you have some data to work with.

After running mongorestore, you'll have to update the database since the data format was changed. So inside ``backend/``, if you have ``npx`` installed, run:

  $ npx migrate-mongo up

And you should be good to go!

Setting up Configs
------------------
Create your own config file (or copy ``backend/shrunk/config.py.example``) in ``backend/``. For development purposes, you'll want to set ``DEV_LOGINS = True``.

Setting up GeoIP
----------------
You'll also likely have to copy the GeoLite2 file in ``backend/`` to your ``/usr/share/GeoIP`` directory.

Running Shrunk
--------------

.. warning::

   Make sure you've set up Mongo (see above) before attempting these steps!

.. warning::

   Make sure you've activated your virtual environment before attempting these steps!

To run Shrunk for development, you should execute the ``flask run``
command from the ``backend`` directory in the repo. Before executing this command,
you need to set up a few environment variables. Note that you'll need to export these variables every time you open up a new shell::

  $ export FLASK_APP=shrunk
  $ export FLASK_DEBUG=true
  $ export FLASK_ENV=dev
  $ export WERKZEUG_DEBUG_PIN=off

Here's a one-liner so you don't have to type all of those separately:

  $ export FLASK_APP=shrunk && export FLASK_DEBUG=true && export FLASK_ENV=dev && export WERKZEUG_DEBUG_PIN=off

Finally, execute the app::

  $ cd backend
  $ flask run

You should see a line of the form ``* Running on
http://127.0.0.1:5000/ (Press CTRL+C to quit)``. At this point, you
should be able to point your browser at that URL and see the Shrunk
login page.

Common Errors
--------------
Don't forget to import the GeoIP database.

(Note for MacOs users: After the Catalina update, you can no longer write to root directory using command line (meaning you cannot mkdir /usr/share/GeoIp). Instead you can go to config.py and set GEOLITE_PATH to where the GeoLite2-City.mmdb is currently located on your local computer.)

Be sure to create your own config file.

Don't forget to restore a copy of the database.

If you are seeing blank pages, make sure all symlinks are working. There are two soft links, one for ``backend/shrunk/static/dist``, and one for ``frontend/dist/index.html``.

To create the symbolic link:

  $ cd backend/shrunk/static
  $ ln -s ../../../frontend/dist

(for development only) If logging in still leads to a blank page, the set_cookie may be blocked. Try setting the ``secure`` parameter to ``False`` in set_cookie in ``views.py``.

Make sure your MongoDB version >=4.0.

Shrunk coding and style guidelines
----------------------------------

Style
~~~~~

We like to conform to `PEP8
<https://www.python.org/dev/peps/pep-0008/>`__ whenever possible. Also,
we prefer single quotes to double quotes, unless using single quotes
would mean escaping. And use f-strings whenever you can (they're
better than :py:func:`format`).  To check whether your code conforms
to PEP8, you can use the ``flake8`` tool (see below).

Documentation
~~~~~~~~~~~~~

Shrunk should be kept well-documented. Most of Shrunk's documentation
is contained in the docstrings accompanying functions, methods,
classes, and modules. This documentation is written in the
reStructuredText format and is processed by the `sphinx
<https://www.sphinx-doc.org/en/master/>`__ tool into the nice HTML
pages that you're reading right now. For an introduction to the use of
sphinx and reStructuredText for documenting python, see `here
<https://www.sphinx-doc.org/en/master/usage/quickstart.html>`__.

Whenever you add or modify an item, you should create or update its
docstring. In particular, make sure you document its parameters,
return type and value, and any exceptions that may be raised.

.. _python-type-annotations:

Type annotations
~~~~~~~~~~~~~~~~

We try to use python `type annotations
<https://docs.python.org/3/library/typing.html>`__ as much as
possible. These annotations are optional and are **ignored** by the
python interpreter. However, they serve two important purposes: they
provide precise documentation about a function's arguments and return
value, and they can by checked by third-party type checking tools like
``mypy`` (see below). This makes them a useful tool for catching bugs
that we wouldn't otherwise see until runtime.

Linters and checkers
--------------------

Before committing code, you should ideally run ``mypy``, ``pylint``, and ``flake8``.
These linters will be run by the CI pipeline, but it's nice to catch issues before pushing.
Regardless, make sure your code passes linting before merging it into ``master``.

``pylint``
~~~~~~~~~~

`pylint <https://www.pylint.org/>`__ is a widely-used linter for python code.
It can complain about tons of stuff, including code-style and correctness issues.
You can run ``pylint`` on the shrunk codebase with::

  $ pylint ./backend

If you don't have the ``pylint`` package installed, try:

  $ python -m pylint backend/

``flake8``
~~~~~~~~~~

`flake8 <https://pypi.org/project/flake8/>`__ is a style-checker for python code.
It has some overlap with ``pylint``, but is much less verbose and consequentally
less annoying. You can run ``flake8`` on the shrunk codebase with::

  $ flake8 backend/

``mypy``
~~~~~~~~

`mypy <http://mypy-lang.org/>`__ is a static type checker for python. It is the tool
we use to check our :ref:`python-type-annotations`. You can run ``mypy`` on the shrunk
codebase with::

  $ mypy backend/

Unit testing
------------

Shrunk comes with an extensive suite of unit tests built on the
`pytest <https://docs.pytest.org/en/latest/>`__ framework. Generally,
we try to keep unit test coverage at around 90% or better. Whenever
you add or modify functionality, you should extend or update the unit
tests as appropriate.

You can run a particular unit test file by simply executing (from inside ``backend/``)::

  $ python -m pytest tests/test_X.py

To run all the tests, you can use (from inside ``backend/``)::

  $ python -m pytest

Some of the tests can take a long time to complete. To ignore these
tests, you can pass the ``-m 'not slow'`` option on the pytest command
line. To select only tests whose name contains a particular substring,
you can pass the ``-k "substring"`` option. To see the name of each
test as it is executed, pass ``-v``.  For more information, see the
output of::

  $ pytest --help

or the `pytest manual <https://docs.pytest.org/en/latest/contents.html>`__.