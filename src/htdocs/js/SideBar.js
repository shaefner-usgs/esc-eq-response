'use strict';


/**
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     showOption: {Function}
 *   }
 */
var SideBar = function (options) {
  var _this,
      _initialize,

      _el;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('section');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Highlight and show the selected option in a 'radio-bar'; un-highlight and
   * hide all other options.
   */
  _this.showOption = function () {
    var option,
        sibling;

    option = _el.querySelector('.option.' + this.id);
    sibling = this.parentNode.firstElementChild;

    // Highlight the selected button and show its options (if applicable)
    this.classList.add('selected');

    if (option) {
      option.classList.remove('hide');
    }

    // Un-highlight all other buttons and hide their options
    while (sibling) {
      if (sibling !== this) {
        option = _el.querySelector('.option.' + sibling.id);

        sibling.classList.remove('selected');

        if (option) {
          option.classList.add('hide');
        }
      }

      sibling = sibling.nextElementSibling;
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SideBar;
