# Contributing & Style Guidelines

1. All routes must be under `/api/v1/...`
2. Everything must be unit tested; when unit tests are created, the results should never be modified unless a new API version is created
3. All routes must be in `hypen-case`
4. All properties must be in `camelCase`
5. When returning one property, they **DO NOT** need to be jsonified! You can just return it as a string
   1. When returning a `400 BAD REQUEST` error, return the reason such as `"originalURL is not a valid URL."` as plain text