# If no permission, run `chmod +x setup.sh`

# Create symbolic links
cd backend/shrunk/static
ln -s ../../../frontend/dist

cd ../../../
cd backend/shrunk/templates
rm index.html
ln -s ../../../frontend/dist/index.html

docker-compose up