# Deployment

Shrunk is actually just a wheel file; Dockerfiles are provided to the developer to start up their developer environment easier and the production environment has nothing to do with Docker. The production environment is intended for [Python 3.8 (or newer)](https://www.python.org/downloads/release/python-381/) on [Red Hat Enterprise Linux 9](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9) using [MongoDB 5.0 (or newer)](https://www.mongodb.com/docs/manual/installation/).

You can build Shrunk on your machine by running these commands.

```
cd frontend
npm install && npm run build
cd ../backend
pip install poetry
poetry install && poetry build
```

You can also [download directly from GitLab](https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/artifacts).