Build Instructions
==================

1. Clone the repository:
   ``git clone git@gitlab.rutgers.edu:MaCS/OSS/shrunk.git``
2. Run these commands

.. code:: shell

   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   pip install -r backend/requirements-dev.txt

If you are having trouble installing ``python-ldap``, run

.. code:: shell

   sudo apt-get install libsasl2-dev libldap2-dev libssl-dev

3. Create ``backend/shrunk/config.py`` from
   ``backend/shrunk/config.py.example``
4. Copy ``backend/GeoLite2-City.mmdb`` into your ``/usr/share/GeoIP``
   directory
5. Create symbolic links by running these commands

.. code:: shell

   cd backend/shrunk/static
   ln -s ../../../frontend/dist
   cd backend/shrunk/templates
   rm index.html
   ln -s ../../../frontend/dist/index.html

6. Install and run ``Docker Desktop`` to run MongoDB in a separate
   terminal

.. code:: shell

   docker run -d -p 27017:27017 --name example-mongo mongo:latest

7. Run this command to set up your environment variables

.. code:: shell

   export FLASK_APP=shrunk && export FLASK_DEBUG=true && export FLASK_ENV=dev && export WERKZEUG_DEBUG_PIN=off

8. Run the backend

.. code:: shell

   cd backend
   flask run

You should be able to see the line

::

    * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)

9. Install frontend dependencies

.. code:: shell

   cd ../
   cd frontend
   npm install

10. (Optional) Build the documentation for the frontend

::

   npm run doc

The documentation will be placed in ``./frontend/docs/``. Open
``index.html`` in your local web browser.

11. Run ``npm run watch`` to watch your changes be updated in real time
12. You can now visit the development version of shrunk via
    ``http://127.0.0.1:5000/``.

