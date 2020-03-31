Frontend development tutorial
=============================

.. _npm:

npm
---

Shrunk's javascript dependencies are managed with the ``npm`` package manager. After installing
``npm`` through your distro's package manager or the ``nvm`` tool, install the dependencies
by executing::

  $ npm i

in the root of the git repo. This will install the dependencies specified in ``package-lock.json``.

Jinja2
------

Our HTML pages are templated using the `Jinja2
<https://jinja.palletsprojects.com/en/2.11.x/>`__ templating
engine. Jinja is pretty simple, and it shouldn't take long to get the
hang of it. You can peruse the template designer documentation `here
<https://jinja.palletsprojects.com/en/2.11.x/templates/>`__. The
following features are particularly useful:
- `macros <https://jinja.palletsprojects.com/en/2.11.x/templates/#macros>`__
- `template inheritance <https://jinja.palletsprojects.com/en/2.11.x/templates/#template-inheritance>`__

After reading the documentation, you can look at our templates under ``./shrunk/templates`` to get
a feel for how Jinja is used in real life.

Bootstrap
---------

We use the `Bootstrap 4 <https://getbootstrap.com/>`__ CSS library extensively for page layout and styling.
You can find its documentation `here <https://getbootstrap.com/docs/4.4/getting-started/introduction/>`__.
Start with the `overview <https://getbootstrap.com/docs/4.4/layout/overview/>`__ and pay particular
attention to the `grid system <https://getbootstrap.com/docs/4.4/layout/grid/>`__, which is the heart of layout in Shrunk.

SASS
----

`SASS <https://sass-lang.com/>`__ is a superset of CSS that adds
features such as variables, loops, and mixins. Both Bootstrap and our
custom stylesheets are written in SASS. You should have a look at the
`SASS quickstart guide <https://sass-lang.com/guide>`__.  If you're already familiar with CSS, SASS
won't look too different. Shrunk's SASS code is located in the
``./shrunk/static/scss`` directory.

Typescript
----------

`Typescript <https://www.typescriptlang.org/>`__ is a superset of
Javascript that adds type checking while maintaining interoperability
with legacy Javascript. All of our frontend code is written in
Typescript. Using Typescript helps make our code more maintainable and
prevents silly bugs (cf. :ref:`python-type-annotations`). You can find the Typescript tutorial `here <https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html>`__.

.. _webpack:

Webpack
-------

To integrate all these technologies, we use the `Webpack
<https://webpack.js.org/>`__ bundler. Webpack is responsible for
compilation of SASS to CSS and of Typescript to JS, minification of
CSS and JS, and resolution of module references in SASS and
Typescript. You can execute Webpack by running::

  $ npx webpack --env ENV

where ``ENV`` is one of ``dev`` or ``prod``. In ``dev`` mode, the
output files will include source maps and will not be minified, and
Webpack will watch for changes and automatically recompile modified
files. In ``prod`` mode, output will be minified and source maps will
not be emitted. When you're working on Shrunk, you should probably
execute Webpack in ``dev`` mode and leave it running in the
background.
