# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

<!--
### Added
### Fixed
### Changed
!-->

### Added

- Semester planning: plan what modules you'll take in future semesters
- Module data for HS25
- Fallback if module type is not defined in selected calculation semester

### Fixed

- Modules with a failed testat in previous semesters no longer count as "ongoing"

## [0.2.2] - 2025-03-04

### Added

- Modules can be added manually (author: [Neyxo](https://github.com/Neyxo))
- ECTS per module can be edited

## [0.2.1] - 2025-02-20

### Added

- Average grade calculation (author: [t1llo](https://github.com/t1llo))

### Fixed

- Major module classification for Wirtschaftsinformatik IT Operation & Security

## [0.2.0] - 2025-02-07

### Added

- Updated module data
- Store module data per semester and add semester setting
  - Depending on module type changes a different calculation semester may make it easier to achieve the bachelor requirements
- New help texts
- Bachelor can be manually set
- Major/minor can be manually set

### Fixed

- Registration UI for ongoing and failed modules
- Major modules are only counted if they are for the correct major
- Module state detection right before grades are published
- Do not show parking permit in module list (lol)

## [0.1.1] - 2024-07-16

- Initial release

[unreleased]: https://github.com/Alainx277/hslu-web-helper/compare/0.2.2...HEAD
[0.2.2]: https://github.com/Alainx277/hslu-web-helper/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/Alainx277/hslu-web-helper/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/Alainx277/hslu-web-helper/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/Alainx277/hslu-web-helper/releases/tag/0.1.1
