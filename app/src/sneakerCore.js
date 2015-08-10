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