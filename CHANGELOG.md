esc-eq-response Changelog
-------------------------

## master

An in-progress version being developed on the `master` branch.

* Add 'autoscale' button to hypocenters plot
* Set default view of hypocenters plot to map view
* Bug fix: don't recreate map panes for features if they already exist
* Add cumulative aftershocks plot
* Add ShakeMap stations layer
* Bug fix: layer order in layer controller should be same as rendered on map
* Sort layers in layer controller
* Bug fix: ensure status bar displays on top of map pane
* Make font sizes / colors more consistent btwn app panes
* Change 'View Map' button to green to be more intuitive
* Set z-index on status bar entries to control display order
* Add link to Napa quake (as an example)
* Bug fix: suppress DOM errors from fault mouseover layer (Utfgrid.js patch)
* Bug fix: ensure navbar is above plot controls
* Bug fix: only show 'Event ID not found' error for mainshock feed 404s
* Upgrade to Leaflet 1.x
  - Use new pane management feature to control order of layers on map
  - Bug fix: layers now stay in correct order when toggling on/off
  - Bug fix: map always zooms to correct extent on initial load (hopefully)

## 0.3.0 (2017-08-25)

* Use same font stack for plots as rest of app
* Add :visited link color
* Add plot: aftershocks - magnitude vs. time
* Bug fix: clone eq moment before manipulating it in Earthquakes.js
* Add tsunami button to large events in oceanic regions
* Remember user's scroll position when switching between panes
* Bug fix: set all default values properly when selecting a new event
* Switch to using UTC time by default (only show localtime on map popups, ms details)
* Handle case of no eqs/no eqs above threshold more elegantly on summary pane
* Add view map button on edit pane; change reset link to a button
* Change order of input fields (show mag first) on edit pane
* Add plot: aftershocks - 3d hypocenters
* Refactor features: better separation of concerns, more readable code
* Add impact bubbles / link to mainshock details on edit pane
* Bug fix: calculate magInt based on rounded mag so data in tables is accurate
* Bug fix: only show utc note when filtered quakes contain utc time
* Darken stroke width so eqs stand out more

## 0.2.0 (2017-02-04)

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
* Add earthquake count to layer names
* Bug fixes


## 0.0.0 (2016-10-13)

Initial release. Basic app structure / routing and (mostly) functionally
complete for Step 1 priorities.
