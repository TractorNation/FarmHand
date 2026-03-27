# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep A Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [26.3.3]

### Fixed
 - Performance/efficiency improvements
 - Other minor logistical/"best practice" adjustments
 - Refactoring to remove duplicative code
 - Updated schemas for better usability. (some minor additional changes required still)
 - Resolved bug with teams not autofilling correctly upon completing a form.
 - 
### Added
 - Automatically move to the correct area to begin a new form based on TBA-enabling of Match Number, for different behavior between complete built-in match scouting, pit scouting, custom forms, etc.
 - Supporting changes across QR code filename generation, analysis tools, assessment of TBA event  data response, etc.
 - Disabled Team Number when autofilled to minimize opportunity for human error
 - Visibility of Match Info data when section collapsed in a scouting form
 - Remembered sorting methods and camera selection on QR code screen

### Changed
 - Version number from 2026 to 26
 - Match Numbers changed to indicate "Comp Level" for scouting more of the event (primarily useful for larger events like Worlds)

## [2026.3.2]

### Fixed 

- Small bugfixes

### Added

- 'Persist' flag for fields that should keep their values during reset/completion of a scout report.
- Automatic Team selection for built-in TBA-enabled schemas (using Match schedule data)
- Match Number will automatically increment with each completed scout report.

### Changed

- 2026 Match Scouting schema updated for easier scouting process/cleaner data
- 2026 Pit Scouting schema updated for easier scouting process/cleaner data


## [2026.3.1]

### Fixed 

- Small bugfixes

### Added

- TBA enabled default schemas


## [0.2026.3] (First full release!!)

### Fixed
s
- Schema editor crash issue
- Small bugs
- Double Wide feature not working on tablets

### Added

- Note feature to fields
- Blue alliance match integration
- date range filter for codes
- Folders to store codes in
- Radio button (Multiple choice) option for fields
### Changed

- Small ui fixes for mobile devices
- Slightly updated app icon

## [0.2026.3-beta.3]

### Fixed

- Many mobile device UI issues
- Lead scout mode not doing anything
- App icon for iOS/macOS devices

## [0.2026.3-beta.2]

### Fixed

- Unable to drag fields in schema editor when on mobile device

### Added

- Real app icon
- Builds for macOS !!

## [0.2026.3-beta.1]

### Fixed

- UI with complete scout dialog on mobile
- Back arrow button on the analysis viewing page

## [0.2026.3-beta]

### Added

- Fully featured data analysis tool
- Button to reset settings to defaults

### Fixed

- Fields renaming improperly
- Number fields not working as expected

### Changed

- Small feature updates to Dashboard page
- Updated match completion dialog
- Updated qr share dialog with "Mark as scanned" button and arrows to quickly see the next match code

## [0.2.0-beta.1]

### Added

- "About Us" button now links to Tractornation.org

### Fixed

- Mobile UI issues
- Qr codes not saving
- Number input min and maximum
- Small theme inconsistencies

### Changed

- Reworded the toggle for "Lead Scout Only"
- Current device id now shows on appbar instead of version

## [0.2.0-beta]

### Added

- New Theme options
- Double wide setting for fields in schema editor
- Warning popups to schema editing
- Ability to share schemas through QR codes
- Help page for newcomers

### Fixed

- Default settings not applying properly
- No validity check for new inputs
- Inconsistent dialog styling

### Changed

- Schemas page is now accessed through settings

## [0.1.0-beta]

### Added

- Settings for everything
- Funcitoning home page
- 5 new input types
- Huge UI Overhaul

### Fixed

- Issues with the schema editor crashing
- UI Fixes with Qr codes
