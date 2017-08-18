esc-eq-response Changelog
-------------------------

## master

An in-progress version being developed on the `master` branch.

* Add tsunami button to large events in oceanic regions
* Remember user's scroll position when switching between panes
* Bug fix: set all default values properly when selecting a new event
* Switch to using UTC time by default (only show localtime on map popups, ms details)
* Handle case of no eqs/no eqs above threshold more elegantly on summary pane
* Add view map button on edit pane; change reset link to a button
* Change order of input fields (show mag first) on edit pane
* Add 3d aftershocks plot
* Refactor: better separation of concerns, more readable code
* Add impact bubbles / link to mainshock details on edit pane
* Bug fix: calculate magInt based on rounded mag so data in tables is accurate
* Bug fix: only show utc note when filtered quakes contain utc time
* Darken stroke width so eqs stand out more
* Only set map bounds on initial loading of layers for each eqid
* Always plot aftershocks on top of historical
* Add timezone to updated stamp on summary pane
* Strip whitespace from param values in form fields
* Add option for user to sort data tables
* Add minmag params for aftershocks, historical seismicity
* Add mainshock impact bubbles to summary pane; reformat eq details
* Add time at epicenter to map popups (when available)
* Add mainshock details to <title> tag
* Only set default values for mainshock if empty or new eqid entered by user
* Add Significant Earthquakes pulldown menu
* Fix for browser's back/fwd buttons to navigate between panes
* Add reset button / req'd fields text
* Move instructions to new help pane; update text
* Improve error handling, and error messages
* Add note when eq time at epicenter is not available in geojson feed
* Add distance / direction to mainshock field in summary tables
* Set map bounds to fully contain each feature layer as it is added
* Tweak colors so navbar is more prominent
* Right align columns (mag, distance, depth, binned totals) in tables for readability
* Use rupture length for calculating default params
* Move "Find Earthquake" links to instructions; add image showing Event Id
* More mobile friendly:
  - hide Leaflet zoom/attr controls; disable zoom when focusing form input
  - css tweaks: summary tables shorter, less R/L padding, etc.
  - hide location field in summary tables
* Bug fixes

## 0.1.0 (2016-11-02)

App is fully functional for Step 1 priorities and all known bugs squashed.

* Add css styles for page layout and map display, etc. and improve presentation
* Add title, description, instructions, etc to edit pane
* Add loading module to show loading progress, error messages
* Add html5 form validation
* Show mainshock details on edit pane
* Add listeners to aftershocks / historical form fields to trigger updates when changed
* Update url params / validate event id as user types
* Plot mainshock as top layer on map
* Allow scrollwheel zoom on map
* Add impact bubbles to map popups
* Add text descriptions to summary
* Add binned earthquake data to summary
* Add last aftershock to summary
* Reverse order of eqs in summary tables (newest first)
* Add point feature (eq) count to layer name
* Bug fixes


## 0.0.0 (2016-10-13)

Initial release. Basic app structure / routing and (mostly) functionally
complete for Step 1 priorities.
