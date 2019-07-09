SUBDIRS = shrunk shrunk_test

.PHONY: $(SUBDIRS) clean

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@ all

clean:
	$(foreach dir,$(SUBDIRS),$(MAKE) -C $(dir) clean;)
