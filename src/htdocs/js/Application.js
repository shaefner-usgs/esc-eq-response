'use strict';


var AppUtil = require('util/AppUtil'),
    Features = require('Features'),
    Feeds = require('Feeds'),
    JsonFeed = require('JsonFeed'),
    LegendBar = require('LegendBar'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    SearchBar = require('SearchBar'),
    SelectBar = require('SelectBar'),
    SettingsBar = require('SettingsBar'),
    SideBar = require('SideBar'),
    SignificantEqs = require('SignificantEqs'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane'),
    TitleBar = require('TitleBar');


/**
 * Earthquake Response Application.
 *
 * Instantiate the app's "primary" Classes and handle app resets. Also track/set
 * saved scroll positions for Panes and SideBars and set input range slider
 * styles.
 *
 * @param options {Object}
 *   {
 *     LegendBar: {Element}
 *     MapPane: {Element}
 *     NavBar: {Element}
 *     PlotsPane: {Element}
 *     SearchBar: {Element}
 *     SelectBar: {Element}
 *     SettingsBar: {Element}
 *     SideBar: {Element}
 *     SignificantEqs: {Element}
 *     StatusBar: {Element}
 *     SummaryPane: {Element}
 *     TitleBar: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     Features: {Object}
 *     Feeds: {Object}
 *     JsonFeed: {Object}
 *     LegendBar: {Object}
 *     MapPane: {Object}
 *     NavBar: {Object}
 *     PlotsPane: {Object}
 *     SearchBar: {Object}
 *     SelectBar: {Object}
 *     SettingsBar: {Object}
 *     SideBar: {Object}
 *     SignificantEqs: {Object}
 *     StatusBar: {Object}
 *     SummaryPane: {Object}
 *     TitleBar: {Object}
 *     defaultPaneId: {String}
 *     getPaneId: {Function}
 *     headerHeight: {Number}
 *     reset: {Function}
 *     setOption: {Function}
 *     setScrollPosition: {Function}
 *     setSliderStyles: {Function}
 *     sideBarWidth: {Number}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _els,
      _initialLoad,
      _sidebar,
      _style,
      _throttle,

      _addListeners,
      _initClasses,
      _resetQueryString,
      _resetScrollPositions,
      _saveScrollPosition;


  _this = {};

  _initialize = function (options) {
    _els = options || {};
    _initialLoad = true;
    _sidebar = document.getElementById('sideBar');
    _style = document.createElement('style');

    _this.defaultPaneId = 'mapPane';
    _this.headerHeight = document.querySelector('header').offsetHeight;
    _this.sideBarWidth = document.getElementById('sideBar').offsetWidth;

    _resetScrollPositions();
    _initClasses();

    // Add <style> tag for dynamic range input (slider) styles
    document.body.appendChild(_style);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var select = document.querySelector('.select');

    // Save scroll position of Panes
    window.addEventListener('scroll', () =>
      _saveScrollPosition('pane')
    );

    // Save scroll position of SideBars
    _sidebar.addEventListener('scroll', () =>
      _saveScrollPosition('sidebar')
    );

    // Show the SelectBar
    select.addEventListener('click', () => {
      sessionStorage.setItem('selectBar', 0);

      _this.NavBar.switchSideBars('selectBar');
      _this.setScrollPosition('selectBar');
    });
  };

  /**
   * Instantiate app's "primary" Classes and store/share them via the 'app'
   * property so their public methods/props are accessible to other Classes.
   */
  _initClasses = function () {
    var appClasses = {
          Features: Features, // must be first
          Feeds: Feeds,
          JsonFeed: JsonFeed,
          LegendBar: LegendBar,
          MapPane: MapPane,
          NavBar: NavBar,
          PlotsPane: PlotsPane,
          SearchBar: SearchBar,
          SelectBar: SelectBar,
          SettingsBar: SettingsBar,
          SideBar: SideBar,
          SignificantEqs: SignificantEqs,
          StatusBar: StatusBar,
          SummaryPane: SummaryPane,
          TitleBar: TitleBar
        },
        postInits = [];

    Object.keys(appClasses).forEach(name => {
      _this[name] = appClasses[name]({
        app: _this,
        el: _els[name] || null
      });

      if (typeof _this[name].postInit === 'function') {
        postInits.push(_this[name]);
      }
    });

    _addListeners();

    // Run post-initialization code now that all Classes are ready
    postInits.forEach(name =>
      name.postInit()
    );
  };

  /**
   * Reset the queryString, keeping only the non-Mainshock specific parameters.
   */
  _resetQueryString = function () {
    var queryString,
        inputs = document.querySelectorAll('#selectBar input, #settingsBar input'),
        msParams = [],
        pairs = [],
        params = new URLSearchParams(location.search);

    inputs.forEach(input =>
      msParams.push(input.id)
    );

    params.forEach((value, name) => {
      if (!msParams.includes(name)) { // skip Mainshock params
        pairs.push(`${name}=${value}`);
      }
    });

    queryString = '?' + pairs.join('&');

    history.replaceState({}, '', queryString + location.hash);
  };

  /**
   * Reset saved scroll positions.
   */
  _resetScrollPositions = function () {
    var id,
        sections = document.querySelectorAll('section.bar, section.pane');

    sections.forEach(section => {
      id = section.getAttribute('id');

      sessionStorage.setItem(id, 0);
    });
  };

  /**
   * Save the current scroll position in sessionStorage.
   *
   * @param type {String}
   *     'pane' or 'sidebar'
   */
  _saveScrollPosition = function (type) {
    var id,
        position;

    if (type === 'sidebar') {
      id = AppUtil.getParam('sidebar');
      position = _sidebar.scrollTop;
    } else { // 'pane'
      id = _this.getPaneId();
      position = window.pageYOffset;
    }

    clearTimeout(_throttle);

    // Throttle scroll event
    _throttle = setTimeout(() =>
      sessionStorage.setItem(id, position), 50
    );
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the id value of the selected Pane from the URL.
   *
   * @return id {String}
   */
  _this.getPaneId = function () {
    var hash = location.hash,
        id = _this.defaultPaneId,
        paneExists = document.querySelector('section' + hash);

    if (hash && paneExists) {
      id = hash.substr(1);
    }

    return id;
  };

  /**
   * Reset app to default state (i.e. no Mainshock selected).
   */
  _this.reset = function () {
    _this.Features.reset(); // must be first
    _this.Feeds.reset();
    _this.MapPane.reset();
    _this.PlotsPane.reset();
    _this.SelectBar.reset();
    _this.SettingsBar.reset();
    _this.SignificantEqs.reset();
    _this.StatusBar.reset();
    _this.SummaryPane.reset();
    _this.TitleBar.reset();

    if (!_initialLoad) {
      _resetQueryString();
      _resetScrollPositions();
    }

    _initialLoad = false;
  };

  /**
   * Highlight and show the selected option on a 'radio-bar'; un-highlight and
   * hide all other options.
   */
  _this.setOption = function () {
    var option = document.querySelector('.option.' + this.id),
        sibling = this.parentNode.firstElementChild;

    // Highlight the selected button and show its options (if applicable)
    this.classList.add('selected');

    if (option) {
      option.classList.remove('hide');
    }

    // Un-highlight all other buttons and hide their options
    while (sibling) {
      if (sibling !== this) {
        option = document.querySelector('.option.' + sibling.id);

        sibling.classList.remove('selected');

        if (option) {
          option.classList.add('hide');
        }
      }

      sibling = sibling.nextElementSibling;
    }
  };

  /**
   * Set the scroll position of the Pane or SideBar to the previous value.
   *
   * @param id {String}
   */
  _this.setScrollPosition = function (id) {
    var position = Number(sessionStorage.getItem(id));

    if (position !== null) {
      if (/Pane$/.test(id)) { // pane
        window.scroll(0, position);
      } else { // sidebar
        _sidebar.scrollTop = position;
      }
    }
  };

  /**
   * Set the dynamic, inline styles for the colored section of an input range
   * slider.
   *
   * @param input {Element}
   */
  _this.setSliderStyles = function (input) {
    var newRules = '',
        oldRules = new RegExp('#' + input.id + '[^#]+', 'g'),
        value = AppUtil.getSliderValue(input),
        vendorAttrs = ['webkit-slider-runnable', 'moz-range'];

    vendorAttrs.forEach(attr =>
      newRules += `#${input.id}::-${attr}-track {background-size:${value} !important}`
    );

    // Remove 'old' css rules first, then add new ones
    _style.textContent = _style.textContent.replace(oldRules, '');
    _style.appendChild(document.createTextNode(newRules));
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
