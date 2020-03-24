def pytest_configure(config):
    config.addinivalue_line('markers', 'slow: mark the test as slow')
