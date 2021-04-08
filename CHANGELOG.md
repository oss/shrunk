# Changelog

All notable changes to Shrunk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Sharing tab to manage which people/organizations your link is shared with (Link ACLs)
- Updated link editing user interface.

### Fixed
- Fixed use of duplicate alias
- Fixed reuse of deleted/inactive alias
- Fixed ui bug: edit link modal form reverting back to original values


## [1.4.0] - 2020-10-15

### Added
- Complete overhaul of website design.
- Ability to request access to edit links.

## [1.3.3] - 2020-09-08

### Added
- Phishtrain checking to stop people from shortening known fishing links.
- A users links are now disabled instead of deleted when a user is blacklisted.
- Improved admin stats.
- Admins can view all organizations.
- Option to shrunk to require 2fa from shibboleth (not enabled, using vpn instead).
- Now using webpack for js and css.
- Code cleanup/refactoring.
- Cleaned up documentation.
- Styling updates.

### Fixed
- Fixed packaging problems.
- QR ui bugs.
