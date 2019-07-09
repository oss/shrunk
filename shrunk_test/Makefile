.PHONY: clean

all: sdist bdist_wheel

sdist bdist_wheel: shrunk setup.py
	./setup.py $@

clean:
	rm -rf build dist shrunk_test.egg-info __pycache__
