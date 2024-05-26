import requests
import os
import shutil
import glob

"""
/var/www/shrunk should exist beforehand and permissions must be given so that it's readable and writeable
by the script executioner.s
"""


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
    )

    # Check if the request was successful
    if response.status_code == 200:
        print("Successfully retrieved data")
        data = response.json()
        tagname = data["tag_name"]
        asset_url = data["assets_url"]
    else:
        print("Failed to retrieve data")
        data = None

    print("Downloading assets of latest release... {tag_name}".format(tag_name=tagname))
    assets_response = requests.get(
        asset_url,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )

    asset_zip_names = []
    asset_zip_urls = []

    for asset in assets_response.json():
        asset_zip_names.append(asset["name"])
        asset_zip_urls.append(asset["browser_download_url"])

    if len(asset_zip_names) != len(asset_zip_urls):
        print(
            "Error: Number of asset zip names does not match number of asset zip urls"
        )
        exit(1)

    for url in asset_zip_urls:
        print("Downloading asset from {url}".format(url=url))
        asset_response = requests.get(url, allow_redirects=True)
        filename = url.split("/")[-1]
        filename_path = os.path.join("/tmp/shrunk", filename)

        open(filename_path, "wb").write(asset_response.content)
        print(
            "Downloaded asset from {url} to {folder}".format(
                url=url, folder=filename_path
            )
        )

        # now, unzip the files
        for asset in asset_zip_names:
            isDev = "dev" in asset
            folder = "dev" if isDev else "prod"
            print("Unzipping {asset}".format(asset=asset))
            shutil.unpack_archive(asset, os.join(var_folder, folder))
            print("Unzipped {asset}".format(asset=asset))
            # then move all the extracted files to the var_folder

    # os.chdir(var_folder)
    # print("Changed directory to {folder}".format(folder=var_folder))

    # # now, unzip the files
    # for asset in asset_zip_names:
    #     print("Unzipping {asset}".format(asset=asset))
    #     shutil.unpack_archive(asset, var_folder)
    #     os.system("unzip {asset}".format(asset=asset))
    #     print("Unzipped {asset}".format(asset=asset))
    #     os.remove(asset)

    # print("Finished downloading and unzipping assets.")


if __name__ == "__main__":
    pull_outlook_assets_from_github()
