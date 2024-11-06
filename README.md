# Shrunk ![license: MIT](https://img.shields.io/badge/license-MIT-blue) ![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg) ![code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)

[Shrunk](https://go.rutgers.edu/) is an open-source full-stack application primarily made to shorten URLs for faculty, staff, and professors of Rutgers University. It is written in [Python 3.6](https://www.python.org/) and [TypeScript](https://www.typescriptlang.org/) and uses [MongoDB](https://www.mongodb.com/), [React](https://react.dev/), and [Flask](https://flask.palletsprojects.com/).

<div align="center">
    <img src="./docs/images/home.png" height=400 width='auto'>
</div>

## Features

- Shorten long URLs
- Create a collection of URLs onto a customizable webpage
- Supports Rutgers Central Authentication Service (CAS)
- Statistics on number of visits on a shortened URL with dynamic charts and geographic maps
- Share multiple shortened URLs via organizations
- Restricted permissions on certain actions

## Build Instructions

### Build with Docker (Developer)

1. Install [Docker Desktop](https://docs.docker.com/desktop/)
2. Create a copy of `backend/shrunk/config.py.example` to `config.py`
3. Change the value `DB_HOST` to `mongodb` in the backend's config file
4. Start the Docker containers:

```
docker-compose up
```

5. Start developing at `http://localhost:4343` [(click to learn more about this change)](https://stackoverflow.com/questions/72369320/why-always-something-is-running-at-port-5000-on-my-mac)

### Build manually

If you want a more detailed set of instructions on how to build without Docker, click [here](./docs/build-instructions.md) for the build instructions.

## Contributing

### Formatting

We use [pytest](https://pytest.org) for our unit tests framework, you can run this command inside the backend directory to check if you've made regressive changes.

```
python -m pytest
```

We use [black](https://github.com/psf/black) for our backend's formatting, while using pylint, flake8, and mypy for linting in the GitLab CI/CD, you can run this command to make sure your code is up to standards. If you're using Visual Studio Code, it does this automatically.

```
black .
```

We also use [Prettier](https://prettier.io/) for our frontend's formatting, you can run this command to make sure your code is up to standards. If you're using Visual Studio Code, it does this automatically.

```
prettier --write .
```

### Adding dependencies to backend

Make sure you're
 - using Python 3.6.x
 - inside a virtual environment
 - run `pip install poetry`
 - run `poetry cache clear --all pypi` if you're having problems with poetry