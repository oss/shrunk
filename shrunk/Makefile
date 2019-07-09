.PHONY: clean

all: sdist bdist_wheel

sdist bdist_wheel: shrunk setup.py assets
	./setup.py $@

assets: shrunk
	cp shrunk/config.py.example shrunk/config.py
	LANG=en_US.utf8 FLASK_APP=shrunk flask assets build

clean:
	rm -rf build dist shrunk.egg-info instance shrunk.log \
	    shrunk/config.py shrunk/static/out shrunk/static/.webassets-cache
