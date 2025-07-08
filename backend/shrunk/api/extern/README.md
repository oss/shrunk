# Contributing & Style Guidelines

1. All routes must be under `/api/core/...`
2. Everything must be unit tested; when unit tests are created, the results should never be modified unless a new API version is created
3. All routes and property names must be in `hypen-case`
4. When returning one property, they **DO NOT** need to be jsonified! You can just return it as a string