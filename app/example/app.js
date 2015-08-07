'use strict';
/**
 * Created by m.chekryshov on 30.07.15.
 */

var $ = require('jquery');

Sneaker.installJqueryAjaxErrorHandler($);


$(document).ready(function() {
    $('pre code').each(function(i, block) {
        hljs.highlightBlock(block);
    });
});

require('./modules/mainModule');
