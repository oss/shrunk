SUBDIRS = shrunk shrunk_test
PIP = pip3.6

.PHONY: $(SUBDIRS) clean

all: $(SUBDIRS)

$(SUBDIRS): pip
	$(MAKE) -C $@ all

pip: pip.req
	$(PIP) install -r pip.req

clean:
	$(foreach dir,$(SUBDIRS),$(MAKE) -C $(dir) clean;)
