'use strict';

var View = require('mvc/View');


var view;

view = View({
  el: document.querySelector('#application')
});

view.render = function () {
  view.el.innerHTML = view.model.get('content');
};

new Promise(function (resolve/*, reject*/) {
  view.model.set({
    content: 'waiting 2 seconds'
  });
  setTimeout(resolve, 2000);
}).then(function () {
  view.model.set({
    content: 'js content'
  });
});
