# shrunk: Unit Tests

Unit tests for shrunk.
this assumes you are using the shrunk docker enviroment

## Test Dependencies

At the very least, the tests require the shrunk package as well as pytest. For
convenience, `pip.req` contains optional dependencies that help with testing.
To install, simply create a virtual environment and do:

    $ ./test install

## Running Tests

To run all of the tests, simply do:

    $ ./test run

you can also run with coverage by doing
$ ./test coverage
