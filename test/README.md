shrunk: Unit Tests
==================
Unit tests for shrunk.

Test Dependencies
-----------------
At the very least, the tests require the shrunk package as well as nose. For
convenience, `pip.req` contains optional dependencies that help with testing.
To install, simply create a virtual environment and do:

    $ pip install pip.req

Running Tests
-------------
To run all of the tests, simply do:

    $ nosetests

To run only one test or tests, specify their names as arguments:

    $ nosetests test_feature.py

Note that these should be done in an appropriate virtual environment so that the
application has all of its required dependencies.
