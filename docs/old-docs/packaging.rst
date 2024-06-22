Packaging and distribution
==========================

Packaging
---------

Creating a Shrunk package requires building the frontend bundle using `parcel <https://parceljs.org/>`_, copying the
results of that operation to the appropriate location in the ``backend/shrunk/static`` directory,
and then creating a Python package using `setuptools <https://pypi.org/project/setuptools/>`_.

Generally we do not build Shrunk packages manually due to the complexity of this process. Instead, the CI
pipeline automatically builds a package for every push. You can get the package from a pipeline run by
looking at the artifacts for the ``backend_build`` job on GitLab and downloading the output ``.whl`` file.

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
