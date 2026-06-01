import os
import shutil
import glob
import sys

import requests

# /var/www/shrunk should exist beforehand and permissions must be given so that
# it's readable and writeable by the script executioner.


def pull_outlook_assets_from_github():
    URL = "https://api.github.com/repos/oss/Shrunk-Outlook-Add-In/releases/latest"
    dirs = ["dev", "prod"]  # where to extract the prod and dev assets to
    var_folder = "/var/www/shrunk/outlook/"

    for dir_dist in dirs:
        path = os.path.join(var_folder, dir_dist + "/*")
        files = glob.glob(path)
        for f in files:
            os.remove(f)

    response = requests.get(
        URL,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=30,
    )

    if response.status_code == 200:
        print("Successfully retrieved data")
        data = response.json()
        tagname = data["tag_name"]
        asset_url = data["assets_url"]
    else:
        print("Failed to retrieve data")
        return

    print(f"Downloading assets of latest release... {tagname}")
    assets_response = requests.get(
        asset_url,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=30,
    )

    asset_zip_names = []
    asset_zip_urls = []

    for asset in assets_response.json():
        asset_zip_names.append(asset["name"])
        asset_zip_urls.append(asset["browser_download_url"])

    if len(asset_zip_names) != len(asset_zip_urls):
        print("Error: Number of asset zip names does not match number of asset zip urls")
        sys.exit(1)

    for url in asset_zip_urls:
        print(f"Downloading asset from {url}")
        asset_response = requests.get(url, allow_redirects=True, timeout=60)
        filename = url.split("/")[-1]
        filename_path = os.path.join("/tmp/shrunk", filename)

        with open(filename_path, "wb") as fh:
            fh.write(asset_response.content)
        print(f"Downloaded asset from {url} to {filename_path}")

        for asset in asset_zip_names:
            is_dev = "dev" in asset
            folder = "dev" if is_dev else "prod"
            print(f"Unzipping {asset}")
            shutil.unpack_archive(asset, os.path.join(var_folder, folder))
            print(f"Unzipped {asset}")


if __name__ == "__main__":
    pull_outlook_assets_from_github()
