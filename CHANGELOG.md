esc-eq-response Changelog
-------------------------

## master

An in-progress version being developed on the `master` branch.

## 0.5.0 (2018-06-12)

* Add link to Event Page
* Unselect mainshock in signif. eqs pulldown when user manually changes eqid
* Reset scroll position for all panes except edit when resetting app state
* Change plot download to output .svg (instead of .png)
* Bugfix: cutoff foreshocks, historical feeds at 1 sec before mainshock
* Select mainshock in signif. eqs pulldown when populated on initial load
* Use 'code' prop in GeoJson feed for DYFI thumbnail which is more reliable
* Add intensity border to sm, dyfi thumbs on summary pane
* Mobile css optimizations
* Alert user via status bar when network requests time out
* Bug fix: only apply index shift on aftershocks plot, not historical
* Tweak eq-mag radius calculation for more variability
* Switch default layer to greyscale so features are more visible
* Bug fix: reset <title> when user clicks 'reset' button
* Display loading feature status above rendering status
* Add legend/tips to help pane
* Add range sliders to filter visible list of eqs on summary pane
* Simplify instructions on edit pane
* Only reset scroll positions for plots, summary panes when user picks new event
* Shorten url params to make url more succinct
* Handle status bar display in css instead of js
* Zoom map to fully contain updated features when user changes params on edit pane
* Bug fix: setting the initial map extent to contain features was unreliable
* Add new property to each feature that controls whether map is zoomed on initial load
* Bug fix: mag-time plot for aftershocks was time shifted by one event
* Add row with total for each column to binned tables
* Add new form.scss file for all form styles
* Add tabindex, autocomplete, autofocus attrs
* Visual refresh
  - use same color purple throughout interface for interactive elements
  - product headers are now clickable links
  - tweak fonts / spacing / layout / colors / transparency
  - add css transitions (fades, slides, loading 'spinner')
  - new 2-column layout on edit pane
* Purge plots when removing them for performance reasons
* Throttle rapid-firing, repeating events in UI
* Bug fix: previous feature layers sometimes left behind when updating params rapidly
* Tweak display of cumulative plot so eq circles are more discernible
* Add loading message when rendering (now that plots are rendered on-the-fly)
* Make eqs in plots / summary clickable - opens map pane w/ popup displayed

## 0.4.0 (2018-02-01)

* Bug fix: use more standard api for remembering scroll position
* Render plots 'on the fly' when user clicks 'Plots' tab to address plotly.js issues
* Bug fix: hide faults tooltip placeholder that was rendering on top left of map
* Bug fix: don't create 'empty' plots when there is no data
* Add generic 'Loading...' message in status bar when app is initially launched
* Add ShakeMap/DYFI thumbnails to summary pane
* Bug fix: remove 'leftover' canvas els from mapPane when loading new event
* Add historical plots in addition to aftershocks
* Remove decimal points from default values for magnitude thresholds
* Add eqid to data tables on summary pane
* Allow eqid's that have fewer characters for older events
* Add separate 'foreshocks' layer in addition to historical seismicity
* use gl3d bundle of plotly.js which is smaller
* Use 2x retina images for fm, mt canvas images
* Optimize css file structure / organization
* Patch: position mouseovers to left on right side of map; use built-in leaflet styles
* Minor refactor: mv map-related methods from Features.js to MapPane.js
* Bug fix: sort layers correctly in layer controller
* Add focal mechanism and moment tensor to summary pane and map
* Bug fix: set scroll position to '0' instead of just removing value
* Bug fix: tweak shakemap check so app doesn't bomb when event has no shakemap
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
  - use new pane management feature to control order of layers on map
  - bug fix: layers now stay in correct order when toggling on/off
  - bug fix: map always zooms to correct extent on initial load (hopefully)

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
