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
    SignificantEqs = require('SignificantEqs'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane'),
    TitleBar = require('TitleBar');


/**
 * Earthquake Response Application - set up and configure app's "primary"
 * Classes.
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
 *     SignificantEqs: {Object}
 *     StatusBar: {Object}
 *     SummaryPane: {Object}
 *     TitleBar: {Object}
 *     headerHeight: {Number}
 *     reset: {Function}
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
      _getSliderValue,
      _initClasses,
      _resetScrollPositions,
      _saveScrollPosition;


  _this = {};

  _initialize = function (options) {
    _els = options || {};
    _initialLoad = true;
    _sidebar = document.getElementById('sideBar');
    _style = document.createElement('style');

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

    // Save scroll position of panes
    window.addEventListener('scroll', () =>
      _saveScrollPosition('pane')
    );

    // Save scroll position of sidebars
    _sidebar.addEventListener('scroll', () =>
      _saveScrollPosition('sidebar')
    );

    // Show the SelectBar when the 'Select an earthquake' link is clicked
    select.addEventListener('click', () => {
      sessionStorage.setItem('selectBar', 0);

      _this.NavBar.switchSideBars('selectBar');
      _this.setScrollPosition('selectBar');
    });
  };

  /**
   * Get the CSS value for the colored section of an <input> range slider.
   *
   * @param input {Element}
   *
   * @return value {String}
   */
  _getSliderValue = function (input) {
    var min,
        percentage,
        value;

    min = input.min || 0;
    percentage = input.value;
    if (input.max) {
      percentage = Math.floor(100 * (input.value - min) / (input.max - min));
    }
    value = percentage + '% 100%';

    return value;
  };

  /**
   * Instantiate app's "primary" Classes and store/share them via the 'app'
   * property so their public methods/props are accessible to other Classes.
   */
  _initClasses = function () {
    var appClasses,
        postInits;

    appClasses = {
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
      SignificantEqs: SignificantEqs,
      StatusBar: StatusBar,
      SummaryPane: SummaryPane,
      TitleBar: TitleBar
    };
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
   * Reset saved scroll positions.
   */
  _resetScrollPositions = function () {
    var id,
        sections;

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
      id = _this.NavBar.getPaneId();
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
      _resetScrollPositions();

      AppUtil.resetQueryString();
    }

    _initialLoad = false;
  };

  /**
   * Set the scroll position of the pane or sidebar to the previous value.
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
   * Set dynamic, inline styles for colored section of input range sliders.
   *
   * @param input {Element}
   */
  _this.setSliderStyles = function (input) {
    var newRules,
        oldRules,
        value,
        vendorAttrs;

    newRules = '';
    oldRules = new RegExp('#' + input.id + '[^#]+', 'g');
    value = _getSliderValue(input);
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
