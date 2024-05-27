Installing / Upgrading
======================
.. highlight:: bash

**Shrunk** is in the `Python Package Index
<http://pypi.python.org/pypi/shrunk>`_.

Installing with pip
-------------------
You can use `pip <http://pypi.python.org/pypi/pip>`_ to install shrunk::

    $ pip install shrunk

To use a specific version of shrunk:

.. parsed-literal::

    $ pip install shrunk==\ |version|\

You can also upgrade shrunk via pip::

    $ pip install --upgrade shrunk

Installing from Source
----------------------
You can install Shrunk from source, which provides the latest features but may
be unstable and is not suitable for the production server. Just clone the
repository and use the Python installation command::

    $ git clone git@gitlab.rutgers.edu:MaCS/OSS/shrunk.git ( via ssh)
    $ cd shrunk
    $ ./setup.py install
