Packaging and distribution
==========================

Packaging
---------

.. important::

   Make sure you've set up your shrunk virtual envirnoment before building! (:ref:`shrunk-venv`)

.. important::

   Make sure you've set up the node environment before building! (:ref:`npm`)

Shrunk is packaged using `setuptools <https://pypi.org/project/setuptools/>`_. All the steps
necessary to build shrunk are described in ``setup.py``. Before building Shrunk, you should
update the :py:data:`VERSION` constant in that module. You can then build shrunk by executing::

  $ ./setup.py bdist_wheel

this command will execute :ref:`webpack` to build static assets and then package our python code,
templates, and compiled assets together in a ``.whl`` file located in the ``./dist`` directory.

.. warning::

   Don't use ``sdist``. ``sdist`` will not run Webpack, which can result in the static assets being missing or
   out-of-date.

Distribution
------------

Python packages are distributed on the `Python Package Index
<https://pypi.org/>`_ (PyPI). Before uploading a Shrunk package to
PyPI, you should first upload it to `test PyPI
<https://test.pypi.org/>`_ and check that it installs cleanly from
there. Packages are uploaded to PyPI using `twine <https://twine.readthedocs.io/en/latest/>`_.
A built Shrunk package can be uploaded to test PyPI with::

  $ python -m twine upload --repository-url https://test.pypi.org/legacy/ dist/PACKAGE.whl

and to production PyPI with::

  $ python -m twine upload dist/PACKAGE.whl
