#!/bin/sh

OUTPUT_DIR=./docs_out

if [ ! -e virtualenv ]; then
   echo "You need to setup virtualenv first. See README.md."
   exit 1
fi

if ! which sphinx-build; then
    echo "You need to install sphinx."
    exit 1
fi

source virtualenv/bin/activate

# we need to run sphinx-build like this to make sure it uses the virtualenv python
python $(which sphinx-build) -b html documentation $OUTPUT_DIR
