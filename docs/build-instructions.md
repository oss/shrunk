# Build Instructions

1. Clone the repository:
```
git clone git@gitlab.rutgers.edu:MaCS/OSS/shrunk.git
```
2. Run these commands

```
# If you're using Linux.
sudo apt-get install libsasl2-dev libldap2-dev libssl-dev

python3 -m venv venv
source venv/bin/activate
pip install poetry
poetry install
```

1. Create `backend/shrunk/config.py` from `backend/shrunk/config.py.example`
2. Copy `backend/GeoLite2-City.mmdb` into your `/usr/share/GeoIP` directory

3. Install and run ``Docker Desktop`` to run MongoDB in a separate terminal

```
docker run -d -p 27017:27017 --name example-mongo mongo:latest
```

4. Run this command to set up your environment variables

```
export FLASK_APP=shrunk && export FLASK_DEBUG=true && export FLASK_ENV=dev && export WERKZEUG_DEBUG_PIN=off
```

8. Run the backend

```
cd backend
python3 -m flask run
```

1. Install frontend dependencies

```
cd ../
cd frontend
npm install
```

The documentation will be placed in `./frontend/docs/`. Open `index.html` in your local web browser.

1.  Run `npm run watch` to watch your changes be updated in real time
2.  You can now visit the development version of shrunk via `http://127.0.0.1:5000/`.
