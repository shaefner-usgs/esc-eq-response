esc-eq-response Changelog
-------------------------

## master

An in-progress version being developed on the `master` branch.

* Add reset button / req'd fields text
* Move instructions to new help pane; update text
* Improve error handling
* Add note when eq time at epicenter is not available in geojson feed
* Add distance / direction to mainshock field in summary tables
* Set map bounds to fully contain each feature layer as it is added
* Tweak colors so navbar is more prominent
* Right align columns (mag, depth, binned totals) in tables for readability
* Use rupture length for calculating default params
* Move "Find Earthquake" links to instructions; add image showing Event Id
* Mobile friendly: hide Leaflet zoom/attr controls; disable zoom when focusing form input
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
