(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
/**
 * Created by m.chekryshov on 02.08.15.
 */

/**
 * Enum for report levels
 * @readonly
 * @enum {string}
 */
module.exports = {
    ERROR:'error',
    WARN:'warn',
    INFO: 'info'
}
},{}],2:[function(require,module,exports){
'use strict';
/**
 * Created by m.chekryshov on 02.08.15.
 */

/**
 * Enum for sneakerEvents
 * @readonly
 * @enum {string}
 */
module.exports = {
    LOG: 'log',
    SEND: 'send',
    SEND_ERROR: 'sendError',
    SEND_SUCCESS: 'sendSuccess'
}
},{}],3:[function(require,module,exports){
'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

var utils = require('../sneakerUtils');

module.exports = SneakerReport;

function SneakerReport (options) {
    utils.overwriteProperties(this, options);
}

/**
 * Duration of javascript session
 * @type {number}
 */
SneakerReport.prototype.sessionDuration = 0;

/**
 * URL of the document that loaded the current document.
 * @type {string}
 */
SneakerReport.prototype.referer = '';

/**
 * URL of the document
 * @type {string}
 */
SneakerReport.prototype.pageUrl = '';

/**
 * URL of source script
 * @type {string}
 */
SneakerReport.prototype.sourceUrl = '';

/**
 * Report extra data
 * @type {object}
 */
SneakerReport.prototype.extra = null;

/**
 * User agent
 * @type {string}
 */
SneakerReport.prototype.userAgent = null;

/**
 * Error stack
 * @type {string}
 */
SneakerReport.prototype.stack = null;

/**
 * Error message
 * @type {string}
 */
SneakerReport.prototype.message = '';

/**
 * Report level
 * @type {string}
 */
SneakerReport.prototype.level = '';

/**
 * Line number
 * @type {string}
 */
SneakerReport.prototype.lineNumber = '';





},{"../sneakerUtils":5}],4:[function(require,module,exports){
'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

require('tracekit');

var utils = require('./sneakerUtils');
var reportLevel = require('./dataObjects/reportLevel');
var sneakerEvents = require('./dataObjects/sneakerEvents');
var SneakerReport = require('./dataObjects/sneakerReport');

(function(window, $) {

    if (!window) {
        return;
    }

    /**
     * Sneaker
     * @type {{}}
     */
    var Sneaker = (function() {
        var eventListeners = {};
        var sessionStartTime = +new Date();
        var globalConfig;
        var baseEvents;
        var lastHandledErrorInfo;
        var defaultConfig;
        var sneakerSourceUrl;

        // singleton
        if (window.Sneaker) {
            return window.Sneaker;
        }

        defaultConfig = {
            /**
             * Some static part of report data
             * @example
             * {
             *  username: {% user.username %},
             *  sessionId: {% user.sessionId %}
             * }
             */
            reportExtraData: {},
            /**
             * Flag to enable global window.onerror handler
             */
            handleUncaught: true,
            /**
             * Flag to enable global ajax requests error handler
             */
            handleJqueryAjax: true,

            сatchUncaught: false,

            ignoreLevels: [],

            ignoreSourceUrlsSuffixes: [],

            ignorePagesUrlsSuffixes: [],

            reportUrl: null,

            debug: false
        };

        // region private methods

        /**
         * This methods trigger events. This methods can be extended or overridden by customer
         */
        baseEvents = {
            /**
             * Default method for report logging
             * This methods can be extended or overridden by customer
             * @param {SneakerReport} report
             * @param {Object=} extraData
             */
            log: function(report, extraData) {
                var text = utils.format('Sneaker[Logger]: {0} {1}:{2}', report.message, report.sourceUrl, report.lineNumber);

                console[report.level](text);

                if (extraData) {
                    console.dir(extraData);
                }
                if (globalConfig.debug) {
                    console.dir(report);
                }
            },

            /**
             * Default method for report sending
             * Send report to the server if reportUrl was provided on initialization
             * This methods can be extended or overridden by customer
             * @param {SneakerReport} report
             * @param {Object=} extraData
             */
            send: function(report, extraData) {

                tryLogDebugMessage('send method was called');

                // check reports server url
                if (!globalConfig.reportUrl) {
                    tryLogDebugMessage('send method was aborted, reason: "reportUrl" was not provided');

                    return Sneaker;
                }

                if (isIgnoredReport(report)) {
                    tryLogDebugMessage('send method was aborted, reason: report was ignored');

                    return Sneaker;
                }

                utils.merge(report.extra, extraData);

                if (Object.keys(report.extra || {}).length == 0) {
                    report.extra = null;
                }

                var img = new Image(),
                    src = globalConfig.url + '&data=' + encodeURIComponent(JSON.stringify(report));

                img.crossOrigin = 'anonymous';

                img.onload = function() {
                    tryLogDebugMessage('send method: request success');
                    triggerEvent(sneakerEvents.SEND_SUCCESS, report);
                };
                img.onerror = img.onabort = function() {
                    tryLogDebugMessage('send method: request error');

                    triggerEvent(sneakerEvents.SEND_ERROR, report);
                };
                img.src = src;
            }
        }

        function isIgnoredReport(report) {
            return globalConfig.ignoreLevels.indexOf(report.level) !== -1 || // check report level
                hasAnySuffix(report.pageUrl, globalConfig.ignorePagesUrlsSuffixes) || // check page urls
                hasAnySuffix(report.sourceUrl, globalConfig.ignoreSourceUrlsSuffixes); // check source urls

        }

        function hasAnySuffix(string, suffixesList) {
            var result = false;

            if (!suffixesList) {
                return false;
            }

            for (var suffix in suffixesList) {
                if (utils.endWith(string, suffix)) {
                    result = true;
                    break;
                }
            }

            return result;
        }

        function tryExecuteBaseEvent(eventName, args) {
            if (!triggerEvent(eventName, args)) {
                return Sneaker;
            }

            return baseEvents[eventName].apply(Sneaker, args);
        }

        function createReportInstance() {
            var report = new SneakerReport();

            report.sessionDuration = new Date() - sessionStartTime;
            report.extra = globalConfig.reportExtraData;
            report.userAgent = navigator.userAgent;
            report.pageUrl = document.location.href;
            report.referer = document.referrer;

            return report;
        }

        /**
         * Trigger event and call all even listeners
         * @param {string} eventName
         * @param {Object} eventArgs
         * @return {boolean} if any listener returns false base method won't called
         */
        function triggerEvent(eventName, eventArgs) {
            var currentEventListeners = eventListeners[eventName];
            var preventBaseMethod = false;

            if (!currentEventListeners) {
                return Sneaker;
            }

            for (var i = 0; i < currentEventListeners.length; i++) {
                var currentListener = currentEventListeners[i];

                if (currentListener.apply(Sneaker, eventArgs) === false) {
                    preventBaseMethod = true;
                }
            }

            return !preventBaseMethod;
        }

        /**
         * Log information and send report based on xmlHttpRequest object
         * @param {XMLHttpRequest} xmlHttpRequest
         */
        function handleAjaxRequestError(xmlHttpRequest) {
            var message = utils.format('Ajax error: {0} {1}', xmlHttpRequest.status, xmlHttpRequest.statusText);

            handleMessage(message, reportLevel.ERROR, {xmlHttpRequest: xmlHttpRequest});
        }

        /**
         * Core method, describes report lifecycle:
         * Log information and send report based on exception information from TraceKit.
         * Log and send method can be extended or overridden by customer
         * @param {Object} errorTrace - exeption information from TraceKit
         * @param {string} reportLevel - report level
         * @param {Object=} extraData - some additional information
         */
        function handleErrorTrace(errorTrace, reportLevel, extraData, isUncaughtError) {
            var report = createReportInstance();
            var baseEventsArgs;

            // to prevent double reporting uncaught errors
            if (isUncaughtError &&
                lastHandledErrorInfo && !lastHandledErrorInfo.isUncaughtError &&
                compareStacks(lastHandledErrorInfo.stack, errorTrace.stack)) {
                tryLogDebugMessage('Report processing aborted, reason: exception was already handled');
                return;
            }

            report.level = reportLevel;
            report.stack = errorTrace.stack
            report.message = utils.format('{0}: {1}', errorTrace.name, errorTrace.message);

            if (errorTrace.stack && errorTrace.stack.length) {
                var source = errorTrace.stack[0];

                report.lineNumber = source.line;
                report.sourceUrl = source.url;
            }

            baseEventsArgs = [report, extraData];

            lastHandledErrorInfo = {isUncaughtError: isUncaughtError, stack: errorTrace.stack};

            tryExecuteBaseEvent(sneakerEvents.LOG, baseEventsArgs);
            tryExecuteBaseEvent(sneakerEvents.SEND, baseEventsArgs);
        }

        function tryLogDebugMessage(message) {
            globalConfig.debug && console.log('Sneaker[Debug]:', message);
        }

        function installWindowOnErrorHandler(catchUncaught) {
            TraceKit.report.subscribe(function(errorTrace) {
                handleErrorTrace(errorTrace, reportLevel.ERROR, null, true);
            });
        }

        /**
         * Compare two stack arrays
         * @param {Array} stackItem1
         * @param {Array} stackItem2
         * @returns {boolean} - true if stacks items are identical
         */
        function compareStacks(stack1, stack2) {
            var result = true;

            if (stack1 === stack2) {
                return false;
            }

            if (!stack1 || !stack2 || stack1.length !== stack2.length) {
                return false;
            }

            for (var i = 0; i < stack1.length; i++) {
                if (!compareStackItems(stack1[i], stack2[i])) {
                    result = false;
                    break;
                }
            }
            return result;
        }

        /**
         * Compare two stack items
         * @param {Object} stackItem1
         * @param {Object} stackItem2
         * @returns {boolean} - true if stacks items are identical
         */
        function compareStackItems(stackItem1, stackItem2) {
            var propertiesToCompare = ['line', 'func', 'url', 'column'];
            var result = true;

            if (stackItem1 === stackItem2) {
                return true;
            }

            if (!stackItem1 || !stackItem2) {
                return false;
            }

            for (var i = 0; i < propertiesToCompare.length; i++) {
                var property = propertiesToCompare[i];
                if (stackItem1[property] !== stackItem2[property]) {
                    result = false;
                    break;
                }
            }

            return result;
        }

        function excludeSneakerMethodsFromStackHead(stack) {
            if (stack && stack.length) {
                for (var i = 0; i < stack.length; i++) {
                    if (utils.endWith(stack[i].url, sneakerSourceUrl)) {
                        stack.splice(i, 1);
                        i--;
                    } else {
                        break;
                    }
                }
            }
        }

        function handleMessage(message, reportLevel, extraData) {
            var error = new Error(message);
            error.name = reportLevel.toUpperCase();

            var errorTrace = TraceKit.computeStackTrace(error);

            if (errorTrace.stack && errorTrace.stack.length) {
                // remove sneaker calls from stack
                excludeSneakerMethodsFromStackHead(errorTrace.stack);
            }

            handleErrorTrace(errorTrace, reportLevel, extraData);

            return Sneaker;
        }

        // endregion

        return {
            // TODO: write comment
            init: function(config) {
                sneakerSourceUrl = TraceKit.computeStackTrace(new Error()).stack[0].url;

                globalConfig = utils.merge({}, defaultConfig);
                utils.merge(globalConfig, config);

                globalConfig.handleUncaught && installWindowOnErrorHandler();
            },

            /**
             * Handle exception and generate report for it
             * @param {Error} ex
             * @param {Object} extraData
             */
            handleException: function(ex, extraData) {
                var errorTrace = TraceKit.computeStackTrace(ex);
                handleErrorTrace(errorTrace, reportLevel.ERROR, extraData);

                return Sneaker;
            },

            /**
             * Add event listener
             * @param {string=} eventName
             * @param {function} listener
             */
            on: function(eventName, listener) {
                if (!eventListeners[eventName]) {
                    eventListeners[eventName] = [];
                }

                if (utils.isFunction(listener)) {
                    eventListeners[eventName].push(listener);
                    tryLogDebugMessage(eventName + ' listener was added');
                }

                return Sneaker;
            },

            /**
             * Remove specific listener or all event handlers when listener wasn't provided
             * @param {string} eventName
             * @param {function=} handler
             */
            off: function(eventName, listener) {
                var currentEventListeners = eventListeners[eventName];

                if (!currentEventListeners || !currentEventListeners.length) {
                    return;
                }

                if (!listener || !utils.isFunction(listener)) {
                    currentEventListeners[eventName] = [];
                    return;
                }

                for (var i = 0; i < currentEventListeners.length; i++) {
                    var currentListener = currentEventListeners[i];

                    if (currentListener == listener) {
                        currentEventListeners.splice(i, 1);
                        i--;
                        tryLogDebugMessage(eventName + ' listener was removed');
                    }
                }

                return Sneaker;
            },

            /**
             * Process new report with error level
             * @param {string} message
             * @param {Object} extraData
             */
            error: function(message, extraData) {
                handleMessage(message, reportLevel.ERROR, extraData);
            },

            /**
             * Process new report with warning level
             * @param {string} message
             * @param {Object} extraData
             */
            warn: function(message, extraData) {
                handleMessage(message, reportLevel.WARN, extraData);
            },

            /**
             * Process new report with info level
             * @param {string} message
             * @param {Object} extraData
             */
            info: function(message, extraData) {
                handleMessage(message, reportLevel.INFO, extraData);
            },

            /**
             * Wrap some function to generate report before before re-throwing
             * @param {function} func - function to wrap
             * @param {Object} extraData
             * @returns {function}
             */
            wrap: function(func, extraData) {
                var wrappedFunc;

                if (func._wrapped) {
                    return func;
                }

                wrappedFunc = function() {
                    try {
                        return func.apply(this, arguments);
                    } catch (e) {
                        Sneaker.handleException(e, extraData);
                        throw e;
                    }
                }

                wrappedFunc._wrapped = true;

                return wrappedFunc;
            },

            /**
             * Wrap and immediately call wrapped function
             * @param {function} func - function to wrap
             * @param {*} args - function arguments
             * @param {Object} extraData
             */
            callThrough: function(func, args, extraData) {
                return Sneaker.wrap(func, extraData)(args);
            },

            installJqueryAjaxErrorHandler: function($) {
                if (!$) {
                    return;
                }

                $(window.document).ajaxError(function(event, jqxhr, settings) {
                    var url = settings ? settings.url : '';
                    var status = jqxhr ? jqxhr.status : '';
                    var statusText = jqxhr ? jqxhr.statusText : '';

                    var message = utils.format('request error {0} {1} {2}', url, status, statusText)
                    Sneaker.error(message, {jqxhr: jqxhr});
                });

            }

        }
    })();

    window.Sneaker = Sneaker;

})(window)
},{"./dataObjects/reportLevel":1,"./dataObjects/sneakerEvents":2,"./dataObjects/sneakerReport":3,"./sneakerUtils":5,"tracekit":6}],5:[function(require,module,exports){
'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */

module.exports = {
    /**
     * Merge objects properties to object1
     * @param {Object} obj1
     * @param {Object} obj2
     * @returns {Object}
     */
    merge: function(obj1, obj2) {
        if (!obj2) {
            return obj1;
        }

        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                obj1[key] = obj2[key];
            }
        }

        return obj1;
    },

    /**
     * Overwrite all properties of obj1 to similar properties of obj1
     * @param {Object} obj1
     * @param {Object} obj2
     * @returns {Object}
     */
    overwriteProperties: function(obj1, obj2) {
        if (!obj2) {
            return obj1;
        }
        each(obj2, function(key, value) {
            if (obj1.hasOwnProperty(key)) {
                obj1[key] = value;
            }
        });

        return obj1;
    },

    /**
     * Check that smth is function
     * @param {*} smth
     * @returns {boolean}
     */
    isFunction: function(smth) {
        return typeof smth === 'function';
    },

    /**
     * Simple formatting function
     * Example of usage:
     *  this.format('His name was {0} {1}.','Maksim','Kindzadza') // => 'His name was Maksim Kindzadza.'
     * @param {string}
     * @return {string}
     */
    format: function(str) {
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 1);

        if (!args || !args.length) {
            return str;
        }

        return str.replace(/\{\{|\}\}|\{(\d+)\}/g, function(m, n) {
            if (m == '{{') {
                return '{';
            }

            if (m == '}}') {
                return '}';
            }

            return args[n];
        });
    },

    /**
     * Check if string has supplied suffix
     * @param {string} string
     * @param {string} suffix
     * @returns {boolean}
     */
    endWith: function(string, suffix) {
        return string.length >= suffix.length && string.substr(string.length - suffix.length) == suffix;
    },

    getFunctionName: function(func) {
        return func.toString().substr(9).split('(')[0].replace(/\s*/g, '');

    }

};
},{}],6:[function(require,module,exports){
(function (global){
/*
 TraceKit - Cross brower stack traces - github.com/csnover/TraceKit
 MIT license
*/

(function(window, undefined) {
if (!window) {
    return;
}

var TraceKit = {};
var _oldTraceKit = window.TraceKit;

// global reference to slice
var _slice = [].slice;
var UNKNOWN_FUNCTION = '?';


/**
 * _has, a better form of hasOwnProperty
 * Example: _has(MainHostObject, property) === true/false
 *
 * @param {Object} object to check property
 * @param {string} key to check
 */
function _has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function _isUndefined(what) {
    return typeof what === 'undefined';
}

/**
 * TraceKit.noConflict: Export TraceKit out to another variable
 * Example: var TK = TraceKit.noConflict()
 */
TraceKit.noConflict = function noConflict() {
    window.TraceKit = _oldTraceKit;
    return TraceKit;
};

/**
 * TraceKit.wrap: Wrap any function in a TraceKit reporter
 * Example: func = TraceKit.wrap(func);
 *
 * @param {Function} func Function to be wrapped
 * @return {Function} The wrapped func
 */
TraceKit.wrap = function traceKitWrapper(func) {
    function wrapped() {
        try {
            return func.apply(this, arguments);
        } catch (e) {
            TraceKit.report(e);
            throw e;
        }
    }
    return wrapped;
};

/**
 * TraceKit.report: cross-browser processing of unhandled exceptions
 *
 * Syntax:
 *   TraceKit.report.subscribe(function(stackInfo) { ... })
 *   TraceKit.report.unsubscribe(function(stackInfo) { ... })
 *   TraceKit.report(exception)
 *   try { ...code... } catch(ex) { TraceKit.report(ex); }
 *
 * Supports:
 *   - Firefox: full stack trace with line numbers, plus column number
 *              on top frame; column number is not guaranteed
 *   - Opera:   full stack trace with line and column numbers
 *   - Chrome:  full stack trace with line and column numbers
 *   - Safari:  line and column number for the top frame only; some frames
 *              may be missing, and column number is not guaranteed
 *   - IE:      line and column number for the top frame only; some frames
 *              may be missing, and column number is not guaranteed
 *
 * In theory, TraceKit should work on all of the following versions:
 *   - IE5.5+ (only 8.0 tested)
 *   - Firefox 0.9+ (only 3.5+ tested)
 *   - Opera 7+ (only 10.50 tested; versions 9 and earlier may require
 *     Exceptions Have Stacktrace to be enabled in opera:config)
 *   - Safari 3+ (only 4+ tested)
 *   - Chrome 1+ (only 5+ tested)
 *   - Konqueror 3.5+ (untested)
 *
 * Requires TraceKit.computeStackTrace.
 *
 * Tries to catch all unhandled exceptions and report them to the
 * subscribed handlers. Please note that TraceKit.report will rethrow the
 * exception. This is REQUIRED in order to get a useful stack trace in IE.
 * If the exception does not reach the top of the browser, you will only
 * get a stack trace from the point where TraceKit.report was called.
 *
 * Handlers receive a stackInfo object as described in the
 * TraceKit.computeStackTrace docs.
 */
TraceKit.report = (function reportModuleWrapper() {
    var handlers = [],
        lastException = null,
        lastExceptionStack = null;

    /**
     * Add a crash handler.
     * @param {Function} handler
     */
    function subscribe(handler) {
        installGlobalHandler();
        handlers.push(handler);
    }

    /**
     * Remove a crash handler.
     * @param {Function} handler
     */
    function unsubscribe(handler) {
        for (var i = handlers.length - 1; i >= 0; --i) {
            if (handlers[i] === handler) {
                handlers.splice(i, 1);
            }
        }
    }

    /**
     * Dispatch stack information to all handlers.
     * @param {Object.<string, *>} stack
     */
    function notifyHandlers(stack, isWindowError) {
        var exception = null;
        if (isWindowError && !TraceKit.collectWindowErrors) {
          return;
        }
        for (var i in handlers) {
            if (_has(handlers, i)) {
                try {
                    handlers[i].apply(null, [stack].concat(_slice.call(arguments, 2)));
                } catch (inner) {
                    exception = inner;
                }
            }
        }

        if (exception) {
            throw exception;
        }
    }

    var _oldOnerrorHandler, _onErrorHandlerInstalled;

    /**
     * Ensures all global unhandled exceptions are recorded.
     * Supported by Gecko and IE.
     * @param {string} message Error message.
     * @param {string} url URL of script that generated the exception.
     * @param {(number|string)} lineNo The line number at which the error
     * occurred.
     * @param {?(number|string)} columnNo The column number at which the error
     * occurred.
     * @param {?Error} errorObj The actual Error object.
     */
    function traceKitWindowOnError(message, url, lineNo, columnNo, errorObj) {
        var stack = null;

        if (errorObj) {
          stack = TraceKit.computeStackTrace(errorObj);
        }
        else
        {
            if (lastExceptionStack) {
                TraceKit.computeStackTrace.augmentStackTraceWithInitialElement(lastExceptionStack, url, lineNo, message);
                stack = lastExceptionStack;
                lastExceptionStack = null;
                lastException = null;
            } else {
                var location = {
                    'url': url,
                    'line': lineNo,
                    'column': columnNo
                };
                location.func = TraceKit.computeStackTrace.guessFunctionName(location.url, location.line);
                location.context = TraceKit.computeStackTrace.gatherContext(location.url, location.line);
                stack = {
                    'mode': 'onerror',
                    'message': message,
                    'url': document.location.href,
                    'stack': [location],
                    'useragent': navigator.userAgent
                };
            }
        }

        notifyHandlers(stack, 'from window.onerror');

        if (_oldOnerrorHandler) {
            return _oldOnerrorHandler.apply(this, arguments);
        }

        return false;
    }

    function installGlobalHandler ()
    {
        if (_onErrorHandlerInstalled === true) {
            return;
        }
        _oldOnerrorHandler = window.onerror;
        window.onerror = traceKitWindowOnError;
        _onErrorHandlerInstalled = true;
    }

    /**
     * Reports an unhandled Error to TraceKit.
     * @param {Error} ex
     */
    function report(ex) {
        var args = _slice.call(arguments, 1);
        if (lastExceptionStack) {
            if (lastException === ex) {
                return; // already caught by an inner catch block, ignore
            } else {
                var s = lastExceptionStack;
                lastExceptionStack = null;
                lastException = null;
                notifyHandlers.apply(null, [s, null].concat(args));
            }
        }

        var stack = TraceKit.computeStackTrace(ex);
        lastExceptionStack = stack;
        lastException = ex;

        // If the stack trace is incomplete, wait for 2 seconds for
        // slow slow IE to see if onerror occurs or not before reporting
        // this exception; otherwise, we will end up with an incomplete
        // stack trace
        window.setTimeout(function () {
            if (lastException === ex) {
                lastExceptionStack = null;
                lastException = null;
                notifyHandlers.apply(null, [stack, null].concat(args));
            }
        }, (stack.incomplete ? 2000 : 0));

        throw ex; // re-throw to propagate to the top level (and cause window.onerror)
    }

    report.subscribe = subscribe;
    report.unsubscribe = unsubscribe;
    return report;
}());

/**
 * TraceKit.computeStackTrace: cross-browser stack traces in JavaScript
 *
 * Syntax:
 *   s = TraceKit.computeStackTrace.ofCaller([depth])
 *   s = TraceKit.computeStackTrace(exception) // consider using TraceKit.report instead (see below)
 * Returns:
 *   s.name              - exception name
 *   s.message           - exception message
 *   s.stack[i].url      - JavaScript or HTML file URL
 *   s.stack[i].func     - function name, or empty for anonymous functions (if guessing did not work)
 *   s.stack[i].args     - arguments passed to the function, if known
 *   s.stack[i].line     - line number, if known
 *   s.stack[i].column   - column number, if known
 *   s.stack[i].context  - an array of source code lines; the middle element corresponds to the correct line#
 *   s.mode              - 'stack', 'stacktrace', 'multiline', 'callers', 'onerror', or 'failed' -- method used to collect the stack trace
 *
 * Supports:
 *   - Firefox:  full stack trace with line numbers and unreliable column
 *               number on top frame
 *   - Opera 10: full stack trace with line and column numbers
 *   - Opera 9-: full stack trace with line numbers
 *   - Chrome:   full stack trace with line and column numbers
 *   - Safari:   line and column number for the topmost stacktrace element
 *               only
 *   - IE:       no line numbers whatsoever
 *
 * Tries to guess names of anonymous functions by looking for assignments
 * in the source code. In IE and Safari, we have to guess source file names
 * by searching for function bodies inside all page scripts. This will not
 * work for scripts that are loaded cross-domain.
 * Here be dragons: some function names may be guessed incorrectly, and
 * duplicate functions may be mismatched.
 *
 * TraceKit.computeStackTrace should only be used for tracing purposes.
 * Logging of unhandled exceptions should be done with TraceKit.report,
 * which builds on top of TraceKit.computeStackTrace and provides better
 * IE support by utilizing the window.onerror event to retrieve information
 * about the top of the stack.
 *
 * Note: In IE and Safari, no stack trace is recorded on the Error object,
 * so computeStackTrace instead walks its *own* chain of callers.
 * This means that:
 *  * in Safari, some methods may be missing from the stack trace;
 *  * in IE, the topmost function in the stack trace will always be the
 *    caller of computeStackTrace.
 *
 * This is okay for tracing (because you are likely to be calling
 * computeStackTrace from the function you want to be the topmost element
 * of the stack trace anyway), but not okay for logging unhandled
 * exceptions (because your catch block will likely be far away from the
 * inner function that actually caused the exception).
 *
 * Tracing example:
 *     function trace(message) {
 *         var stackInfo = TraceKit.computeStackTrace.ofCaller();
 *         var data = message + "\n";
 *         for(var i in stackInfo.stack) {
 *             var item = stackInfo.stack[i];
 *             data += (item.func || '[anonymous]') + "() in " + item.url + ":" + (item.line || '0') + "\n";
 *         }
 *         if (window.console)
 *             console.info(data);
 *         else
 *             alert(data);
 *     }
 */
TraceKit.computeStackTrace = (function computeStackTraceWrapper() {
    var debug = false,
        sourceCache = {};

    /**
     * Attempts to retrieve source code via XMLHttpRequest, which is used
     * to look up anonymous function names.
     * @param {string} url URL of source code.
     * @return {string} Source contents.
     */
    function loadSource(url) {
        if (!TraceKit.remoteFetching) { //Only attempt request if remoteFetching is on.
            return '';
        }
        try {
            var getXHR = function() {
                try {
                    return new window.XMLHttpRequest();
                } catch (e) {
                    // explicitly bubble up the exception if not found
                    return new window.ActiveXObject('Microsoft.XMLHTTP');
                }
            };

            var request = getXHR();
            request.open('GET', url, false);
            request.send('');
            return request.responseText;
        } catch (e) {
            return '';
        }
    }

    /**
     * Retrieves source code from the source code cache.
     * @param {string} url URL of source code.
     * @return {Array.<string>} Source contents.
     */
    function getSource(url) {
        if (typeof url !== 'string') {
            return [];
        }

        if (!_has(sourceCache, url)) {
            // URL needs to be able to fetched within the acceptable domain.  Otherwise,
            // cross-domain errors will be triggered.
            var source = '';

            url = url || '';
            if (url.indexOf && url.indexOf(document.domain) !== -1) {
                source = loadSource(url);
            }
            sourceCache[url] = source ? source.split('\n') : [];
        }

        return sourceCache[url];
    }

    /**
     * Tries to use an externally loaded copy of source code to determine
     * the name of a function by looking at the name of the variable it was
     * assigned to, if any.
     * @param {string} url URL of source code.
     * @param {(string|number)} lineNo Line number in source code.
     * @return {string} The function name, if discoverable.
     */
    function guessFunctionName(url, lineNo) {
        var reFunctionArgNames = /function ([^(]*)\(([^)]*)\)/,
            reGuessFunction = /['"]?([0-9A-Za-z$_]+)['"]?\s*[:=]\s*(function|eval|new Function)/,
            line = '',
            maxLines = 10,
            source = getSource(url),
            m;

        if (!source.length) {
            return UNKNOWN_FUNCTION;
        }

        // Walk backwards from the first line in the function until we find the line which
        // matches the pattern above, which is the function definition
        for (var i = 0; i < maxLines; ++i) {
            line = source[lineNo - i] + line;

            if (!_isUndefined(line)) {
                if ((m = reGuessFunction.exec(line))) {
                    return m[1];
                } else if ((m = reFunctionArgNames.exec(line))) {
                    return m[1];
                }
            }
        }

        return UNKNOWN_FUNCTION;
    }

    /**
     * Retrieves the surrounding lines from where an exception occurred.
     * @param {string} url URL of source code.
     * @param {(string|number)} line Line number in source code to centre
     * around for context.
     * @return {?Array.<string>} Lines of source code.
     */
    function gatherContext(url, line) {
        var source = getSource(url);

        if (!source.length) {
            return null;
        }

        var context = [],
            // linesBefore & linesAfter are inclusive with the offending line.
            // if linesOfContext is even, there will be one extra line
            //   *before* the offending line.
            linesBefore = Math.floor(TraceKit.linesOfContext / 2),
            // Add one extra line if linesOfContext is odd
            linesAfter = linesBefore + (TraceKit.linesOfContext % 2),
            start = Math.max(0, line - linesBefore - 1),
            end = Math.min(source.length, line + linesAfter - 1);

        line -= 1; // convert to 0-based index

        for (var i = start; i < end; ++i) {
            if (!_isUndefined(source[i])) {
                context.push(source[i]);
            }
        }

        return context.length > 0 ? context : null;
    }

    /**
     * Escapes special characters, except for whitespace, in a string to be
     * used inside a regular expression as a string literal.
     * @param {string} text The string.
     * @return {string} The escaped string literal.
     */
    function escapeRegExp(text) {
        return text.replace(/[\-\[\]{}()*+?.,\\\^$|#]/g, '\\$&');
    }

    /**
     * Escapes special characters in a string to be used inside a regular
     * expression as a string literal. Also ensures that HTML entities will
     * be matched the same as their literal friends.
     * @param {string} body The string.
     * @return {string} The escaped string.
     */
    function escapeCodeAsRegExpForMatchingInsideHTML(body) {
        return escapeRegExp(body).replace('<', '(?:<|&lt;)').replace('>', '(?:>|&gt;)').replace('&', '(?:&|&amp;)').replace('"', '(?:"|&quot;)').replace(/\s+/g, '\\s+');
    }

    /**
     * Determines where a code fragment occurs in the source code.
     * @param {RegExp} re The function definition.
     * @param {Array.<string>} urls A list of URLs to search.
     * @return {?Object.<string, (string|number)>} An object containing
     * the url, line, and column number of the defined function.
     */
    function findSourceInUrls(re, urls) {
        var source, m;
        for (var i = 0, j = urls.length; i < j; ++i) {
            // console.log('searching', urls[i]);
            if ((source = getSource(urls[i])).length) {
                source = source.join('\n');
                if ((m = re.exec(source))) {
                    // console.log('Found function in ' + urls[i]);

                    return {
                        'url': urls[i],
                        'line': source.substring(0, m.index).split('\n').length,
                        'column': m.index - source.lastIndexOf('\n', m.index) - 1
                    };
                }
            }
        }

        // console.log('no match');

        return null;
    }

    /**
     * Determines at which column a code fragment occurs on a line of the
     * source code.
     * @param {string} fragment The code fragment.
     * @param {string} url The URL to search.
     * @param {(string|number)} line The line number to examine.
     * @return {?number} The column number.
     */
    function findSourceInLine(fragment, url, line) {
        var source = getSource(url),
            re = new RegExp('\\b' + escapeRegExp(fragment) + '\\b'),
            m;

        line -= 1;

        if (source && source.length > line && (m = re.exec(source[line]))) {
            return m.index;
        }

        return null;
    }

    /**
     * Determines where a function was defined within the source code.
     * @param {(Function|string)} func A function reference or serialized
     * function definition.
     * @return {?Object.<string, (string|number)>} An object containing
     * the url, line, and column number of the defined function.
     */
    function findSourceByFunctionBody(func) {
        var urls = [window.location.href],
            scripts = document.getElementsByTagName('script'),
            body,
            code = '' + func,
            codeRE = /^function(?:\s+([\w$]+))?\s*\(([\w\s,]*)\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/,
            eventRE = /^function on([\w$]+)\s*\(event\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/,
            re,
            parts,
            result;

        for (var i = 0; i < scripts.length; ++i) {
            var script = scripts[i];
            if (script.src) {
                urls.push(script.src);
            }
        }

        if (!(parts = codeRE.exec(code))) {
            re = new RegExp(escapeRegExp(code).replace(/\s+/g, '\\s+'));
        }

        // not sure if this is really necessary, but I don’t have a test
        // corpus large enough to confirm that and it was in the original.
        else {
            var name = parts[1] ? '\\s+' + parts[1] : '',
                args = parts[2].split(',').join('\\s*,\\s*');

            body = escapeRegExp(parts[3]).replace(/;$/, ';?'); // semicolon is inserted if the function ends with a comment.replace(/\s+/g, '\\s+');
            re = new RegExp('function' + name + '\\s*\\(\\s*' + args + '\\s*\\)\\s*{\\s*' + body + '\\s*}');
        }

        // look for a normal function definition
        if ((result = findSourceInUrls(re, urls))) {
            return result;
        }

        // look for an old-school event handler function
        if ((parts = eventRE.exec(code))) {
            var event = parts[1];
            body = escapeCodeAsRegExpForMatchingInsideHTML(parts[2]);

            // look for a function defined in HTML as an onXXX handler
            re = new RegExp('on' + event + '=[\\\'"]\\s*' + body + '\\s*[\\\'"]', 'i');

            if ((result = findSourceInUrls(re, urls[0]))) {
                return result;
            }

            // look for ???
            re = new RegExp(body);

            if ((result = findSourceInUrls(re, urls))) {
                return result;
            }
        }

        return null;
    }

    // Contents of Exception in various browsers.
    //
    // SAFARI:
    // ex.message = Can't find variable: qq
    // ex.line = 59
    // ex.sourceId = 580238192
    // ex.sourceURL = http://...
    // ex.expressionBeginOffset = 96
    // ex.expressionCaretOffset = 98
    // ex.expressionEndOffset = 98
    // ex.name = ReferenceError
    //
    // FIREFOX:
    // ex.message = qq is not defined
    // ex.fileName = http://...
    // ex.lineNumber = 59
    // ex.columnNumber = 69
    // ex.stack = ...stack trace... (see the example below)
    // ex.name = ReferenceError
    //
    // CHROME:
    // ex.message = qq is not defined
    // ex.name = ReferenceError
    // ex.type = not_defined
    // ex.arguments = ['aa']
    // ex.stack = ...stack trace...
    //
    // INTERNET EXPLORER:
    // ex.message = ...
    // ex.name = ReferenceError
    //
    // OPERA:
    // ex.message = ...message... (see the example below)
    // ex.name = ReferenceError
    // ex.opera#sourceloc = 11  (pretty much useless, duplicates the info in ex.message)
    // ex.stacktrace = n/a; see 'opera:config#UserPrefs|Exceptions Have Stacktrace'

    /**
     * Computes stack trace information from the stack property.
     * Chrome and Gecko use this property.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceFromStackProp(ex) {
        if (!ex.stack) {
            return null;
        }

        var chrome = /^\s*at (.*?) ?\(?((?:file|https?|chrome-extension):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
            gecko = /^\s*(.*?)(?:\((.*?)\))?@?((?:file|https?|chrome):.*?):(\d+)(?::(\d+))?\s*$/i,
            winjs = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:ms-appx|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
            lines = ex.stack.split('\n'),
            stack = [],
            parts,
            element,
            reference = /^(.*) is undefined$/.exec(ex.message);

        for (var i = 0, j = lines.length; i < j; ++i) {
            if ((parts = gecko.exec(lines[i]))) {
                element = {
                    'url': parts[3],
                    'func': parts[1] || UNKNOWN_FUNCTION,
                    'args': parts[2] ? parts[2].split(',') : '',
                    'line': +parts[4],
                    'column': parts[5] ? +parts[5] : null
                };
            } else if ((parts = chrome.exec(lines[i]))) {
                element = {
                    'url': parts[2],
                    'func': parts[1] || UNKNOWN_FUNCTION,
                    'line': +parts[3],
                    'column': parts[4] ? +parts[4] : null
                };
            } else if ((parts = winjs.exec(lines[i]))) {
              element = {
                'url': parts[2],
                'func': parts[1] || UNKNOWN_FUNCTION,
                'line': +parts[3],
                'column': parts[4] ? +parts[4] : null
              };
            } else {
                continue;
            }

            if (!element.func && element.line) {
                element.func = guessFunctionName(element.url, element.line);
            }

            if (element.line) {
                element.context = gatherContext(element.url, element.line);
            }

            stack.push(element);
        }

        if (!stack.length) {
            return null;
        }

        if (stack[0] && stack[0].line && !stack[0].column && reference) {
            stack[0].column = findSourceInLine(reference[1], stack[0].url, stack[0].line);
        } else if (!stack[0].column && !_isUndefined(ex.columnNumber)) {
            // FireFox uses this awesome columnNumber property for its top frame
            // Also note, Firefox's column number is 0-based and everything else expects 1-based,
            // so adding 1
            stack[0].column = ex.columnNumber + 1;
        }

        return {
            'mode': 'stack',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * Computes stack trace information from the stacktrace property.
     * Opera 10 uses this property.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceFromStacktraceProp(ex) {
        // Access and store the stacktrace property before doing ANYTHING
        // else to it because Opera is not very good at providing it
        // reliably in other circumstances.
        var stacktrace = ex.stacktrace;

        var testRE = / line (\d+), column (\d+) in (?:<anonymous function: ([^>]+)>|([^\)]+))\((.*)\) in (.*):\s*$/i,
            lines = stacktrace.split('\n'),
            stack = [],
            parts;

        for (var i = 0, j = lines.length; i < j; i += 2) {
            if ((parts = testRE.exec(lines[i]))) {
                var element = {
                    'line': +parts[1],
                    'column': +parts[2],
                    'func': parts[3] || parts[4],
                    'args': parts[5] ? parts[5].split(',') : [],
                    'url': parts[6]
                };

                if (!element.func && element.line) {
                    element.func = guessFunctionName(element.url, element.line);
                }
                if (element.line) {
                    try {
                        element.context = gatherContext(element.url, element.line);
                    } catch (exc) {}
                }

                if (!element.context) {
                    element.context = [lines[i + 1]];
                }

                stack.push(element);
            }
        }

        if (!stack.length) {
            return null;
        }

        return {
            'mode': 'stacktrace',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * NOT TESTED.
     * Computes stack trace information from an error message that includes
     * the stack trace.
     * Opera 9 and earlier use this method if the option to show stack
     * traces is turned on in opera:config.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack information.
     */
    function computeStackTraceFromOperaMultiLineMessage(ex) {
        // Opera includes a stack trace into the exception message. An example is:
        //
        // Statement on line 3: Undefined variable: undefinedFunc
        // Backtrace:
        //   Line 3 of linked script file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.js: In function zzz
        //         undefinedFunc(a);
        //   Line 7 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function yyy
        //           zzz(x, y, z);
        //   Line 3 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function xxx
        //           yyy(a, a, a);
        //   Line 1 of function script
        //     try { xxx('hi'); return false; } catch(ex) { TraceKit.report(ex); }
        //   ...

        var lines = ex.message.split('\n');
        if (lines.length < 4) {
            return null;
        }

        var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|https?)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|https?)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE3 = /^\s*Line (\d+) of function script\s*$/i,
            stack = [],
            scripts = document.getElementsByTagName('script'),
            inlineScriptBlocks = [],
            parts,
            i,
            len,
            source;

        for (i in scripts) {
            if (_has(scripts, i) && !scripts[i].src) {
                inlineScriptBlocks.push(scripts[i]);
            }
        }

        for (i = 2, len = lines.length; i < len; i += 2) {
            var item = null;
            if ((parts = lineRE1.exec(lines[i]))) {
                item = {
                    'url': parts[2],
                    'func': parts[3],
                    'line': +parts[1]
                };
            } else if ((parts = lineRE2.exec(lines[i]))) {
                item = {
                    'url': parts[3],
                    'func': parts[4]
                };
                var relativeLine = (+parts[1]); // relative to the start of the <SCRIPT> block
                var script = inlineScriptBlocks[parts[2] - 1];
                if (script) {
                    source = getSource(item.url);
                    if (source) {
                        source = source.join('\n');
                        var pos = source.indexOf(script.innerText);
                        if (pos >= 0) {
                            item.line = relativeLine + source.substring(0, pos).split('\n').length;
                        }
                    }
                }
            } else if ((parts = lineRE3.exec(lines[i]))) {
                var url = window.location.href.replace(/#.*$/, ''),
                    line = parts[1];
                var re = new RegExp(escapeCodeAsRegExpForMatchingInsideHTML(lines[i + 1]));
                source = findSourceInUrls(re, [url]);
                item = {
                    'url': url,
                    'line': source ? source.line : line,
                    'func': ''
                };
            }

            if (item) {
                if (!item.func) {
                    item.func = guessFunctionName(item.url, item.line);
                }
                var context = gatherContext(item.url, item.line);
                var midline = (context ? context[Math.floor(context.length / 2)] : null);
                if (context && midline.replace(/^\s*/, '') === lines[i + 1].replace(/^\s*/, '')) {
                    item.context = context;
                } else {
                    // if (context) alert("Context mismatch. Correct midline:\n" + lines[i+1] + "\n\nMidline:\n" + midline + "\n\nContext:\n" + context.join("\n") + "\n\nURL:\n" + item.url);
                    item.context = [lines[i + 1]];
                }
                stack.push(item);
            }
        }
        if (!stack.length) {
            return null; // could not parse multiline exception message as Opera stack trace
        }

        return {
            'mode': 'multiline',
            'name': ex.name,
            'message': lines[0],
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * Adds information about the first frame to incomplete stack traces.
     * Safari and IE require this to get complete data on the first frame.
     * @param {Object.<string, *>} stackInfo Stack trace information from
     * one of the compute* methods.
     * @param {string} url The URL of the script that caused an error.
     * @param {(number|string)} lineNo The line number of the script that
     * caused an error.
     * @param {string=} message The error generated by the browser, which
     * hopefully contains the name of the object that caused the error.
     * @return {boolean} Whether or not the stack information was
     * augmented.
     */
    function augmentStackTraceWithInitialElement(stackInfo, url, lineNo, message) {
        var initial = {
            'url': url,
            'line': lineNo
        };

        if (initial.url && initial.line) {
            stackInfo.incomplete = false;

            if (!initial.func) {
                initial.func = guessFunctionName(initial.url, initial.line);
            }

            if (!initial.context) {
                initial.context = gatherContext(initial.url, initial.line);
            }

            var reference = / '([^']+)' /.exec(message);
            if (reference) {
                initial.column = findSourceInLine(reference[1], initial.url, initial.line);
            }

            if (stackInfo.stack.length > 0) {
                if (stackInfo.stack[0].url === initial.url) {
                    if (stackInfo.stack[0].line === initial.line) {
                        return false; // already in stack trace
                    } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func === initial.func) {
                        stackInfo.stack[0].line = initial.line;
                        stackInfo.stack[0].context = initial.context;
                        return false;
                    }
                }
            }

            stackInfo.stack.unshift(initial);
            stackInfo.partial = true;
            return true;
        } else {
            stackInfo.incomplete = true;
        }

        return false;
    }

    /**
     * Computes stack trace information by walking the arguments.caller
     * chain at the time the exception occurred. This will cause earlier
     * frames to be missed but is the only way to get any stack trace in
     * Safari and IE. The top frame is restored by
     * {@link augmentStackTraceWithInitialElement}.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceByWalkingCallerChain(ex, depth) {
        var functionName = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i,
            stack = [],
            funcs = {},
            recursion = false,
            parts,
            item,
            source;

        for (var curr = computeStackTraceByWalkingCallerChain.caller; curr && !recursion; curr = curr.caller) {
            if (curr === computeStackTrace || curr === TraceKit.report) {
                // console.log('skipping internal function');
                continue;
            }

            item = {
                'url': null,
                'func': UNKNOWN_FUNCTION,
                'line': null,
                'column': null
            };

            if (curr.name) {
                item.func = curr.name;
            } else if ((parts = functionName.exec(curr.toString()))) {
                item.func = parts[1];
            }

            if (typeof item.func === 'undefined') {
              try {
                item.func = parts.input.substring(0, parts.input.indexOf('{'));
              } catch (e) { }
            }

            if ((source = findSourceByFunctionBody(curr))) {
                item.url = source.url;
                item.line = source.line;

                if (item.func === UNKNOWN_FUNCTION) {
                    item.func = guessFunctionName(item.url, item.line);
                }

                var reference = / '([^']+)' /.exec(ex.message || ex.description);
                if (reference) {
                    item.column = findSourceInLine(reference[1], source.url, source.line);
                }
            }

            if (funcs['' + curr]) {
                recursion = true;
            }else{
                funcs['' + curr] = true;
            }

            stack.push(item);
        }

        if (depth) {
            // console.log('depth is ' + depth);
            // console.log('stack is ' + stack.length);
            stack.splice(0, depth);
        }

        var result = {
            'mode': 'callers',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
        augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber, ex.message || ex.description);
        return result;
    }

    /**
     * Computes a stack trace for an exception.
     * @param {Error} ex
     * @param {(string|number)=} depth
     */
    function computeStackTrace(ex, depth) {
        var stack = null;
        depth = (depth == null ? 0 : +depth);

        try {
            // This must be tried first because Opera 10 *destroys*
            // its stacktrace property if you try to access the stack
            // property first!!
            stack = computeStackTraceFromStacktraceProp(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceFromStackProp(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceFromOperaMultiLineMessage(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        return {
            'mode': 'failed'
        };
    }

    /**
     * Logs a stacktrace starting from the previous call and working down.
     * @param {(number|string)=} depth How many frames deep to trace.
     * @return {Object.<string, *>} Stack trace information.
     */
    function computeStackTraceOfCaller(depth) {
        depth = (depth == null ? 0 : +depth) + 1; // "+ 1" because "ofCaller" should drop one frame
        try {
            throw new Error();
        } catch (ex) {
            return computeStackTrace(ex, depth + 1);
        }
    }

    computeStackTrace.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
    computeStackTrace.guessFunctionName = guessFunctionName;
    computeStackTrace.gatherContext = gatherContext;
    computeStackTrace.ofCaller = computeStackTraceOfCaller;
    computeStackTrace.getSource = getSource;

    return computeStackTrace;
}());

/**
 * Extends support for global error handling for asynchronous browser
 * functions. Adopted from Closure Library's errorhandler.js
 */
TraceKit.extendToAsynchronousCallbacks = function () {
    var _helper = function _helper(fnName) {
        var originalFn = window[fnName];
        window[fnName] = function traceKitAsyncExtension() {
            // Make a copy of the arguments
            var args = _slice.call(arguments);
            var originalCallback = args[0];
            if (typeof (originalCallback) === 'function') {
                args[0] = TraceKit.wrap(originalCallback);
            }
            // IE < 9 doesn't support .call/.apply on setInterval/setTimeout, but it
            // also only supports 2 argument and doesn't care what "this" is, so we
            // can just call the original function directly.
            if (originalFn.apply) {
                return originalFn.apply(this, args);
            } else {
                return originalFn(args[0], args[1]);
            }
        };
    };

    _helper('setTimeout');
    _helper('setInterval');
};

//Default options:
if (!TraceKit.remoteFetching) {
  TraceKit.remoteFetching = true;
}
if (!TraceKit.collectWindowErrors) {
  TraceKit.collectWindowErrors = true;
}
if (!TraceKit.linesOfContext || TraceKit.linesOfContext < 1) {
  // 5 lines before, the offending line, 5 lines after
  TraceKit.linesOfContext = 11;
}



// Export to global object
window.TraceKit = TraceKit;

}(typeof window !== 'undefined' ? window : global));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[4]);
