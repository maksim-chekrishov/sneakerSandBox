'use strict';
/**
 * Created by m.chekryshov on 01.08.15.
 */
/**
 * Sneaker
 * @type {{}}
 */
var Sneaker = (function() {

    // singleton
    if (Sneaker) {
        return Sneaker;
    }

    var defaultConfig = {

        reportExtraData: {},

        handleUncaught: true,

        handleAjax: true,

        ignoreLevels: [],

        ignoreUrls: [],

        reportUrl: null

    };

    var eventListeners = {};
    var sessionStartTime = +new Date();
    var globalConfig;

    // region private methods

    /**
     * This methods trigger events. Execution can be stopped from customer side
     */
    var baseEvents = {

        log: function(report, extraData) {
            console.log(report, extraData);
        },

        send: function(report, extraData) {

            if (!globalConfig.url) {
                return Sneaker;
            }

            util.merge(report.extra, extraData);

            var img = newImage(),
                src = globalConfig.url + '&data=' + encodeURIComponent(JSON.stringify(report));

            img.crossOrigin = 'anonymous';

            img.onload = function () {
                triggerEvent(sneakerEvents.SEND_SUCCESS, report);
            };
            img.onerror = img.onabort = function () {
                triggerEvent(sneakerEvents.SEND_ERROR, report);
            };
            img.src = src;
        }

    }

    function tryExecuteBaseEvent(eventName, args) {
        if (!triggerEvent(eventName)) {
            return Sneaker;
        }

        return baseEvents[eventName].apply(Sneaker, args);
    }

    function createReportInstance() {
        var report = new SneakerReport();

        report.sessionDuration = sessionStartTime - new Date();
        report.extra = globalConfig.reportExtraData;
        report.userAgent = navigator.userAgent;
        report.url = document.location.href;
    }

    function handleErrorTrace(errorTrace, extraData) {

        var report = createReportInstance();
        var baseEventsArgs;

        report.stack = errorTrace.stack
        report.message = errorTrace.name + ' : '
        errorTrace.message;
        report.lineNumber = errorTrace.lineno;

        baseEventsArgs = [report, extraData];

        tryExecuteBaseEvent(sneakerEvents.LOG, baseEventsArgs);
        tryExecuteBaseEvent(sneakerEvents.SEND, baseEventsArgs);
    }

    /**
     * Trigger event and call all even listeners
     * @param {string} eventName
     * @param {object} eventArgs
     * @return {boolean} if any listener returns false base method won't called
     */
    function triggerEvent(eventName, eventArgs) {
        var currentEventListeners = eventListeners[eventName];
        var preventBaseMethod = false;

        if (!currentEventListeners) {
            return Sneaker;
        }

        for (var currentListener in currentEventListeners) {
            if (currentListener.apply(Sneaker, eventArgs) === false) {
                preventBaseMethod = true;
            }
        }

        return !preventBaseMethod;
    }

    function installWindowOnErrorHandler() {
        TraceKit.subscribe(handleErrorTrace);
    }

    function handleAjaxRequestError(xmlHttpRequest) {

    }

    function installAjaxOnErrorHander() {

        var _onreadystatechange = XMLHttpRequest.prototype.onreadystatechange;

        XMLHttpRequest.prototype.onreadystatechange = function() {
            if (this.readyState == 4 /* complete */) {
                if (this.status != 200 && this.status != 304) {
                    handleAjaxRequestError(this);
                }
            }
            return _onreadystatechange.apply(arguments);
        }
    }

    // endregion

    return {

        init: function(config) {
            globalConfig = util.merge({}, defaultConfig);
            util.merge(globalConfig, config);

            globalConfig.handleUncaught && installWindowOnErrorHandler();
            globalConfig.handleAjax && installAjaxOnErrorHander();
        },

        /**
         * Handle exception and generate report for it
         * @param {Error} ex
         * @param {object} extraData
         */
        handleException: function(ex, extraData) {
            var errorTrace = computeStackTrace(ex);

            handleErrorTrace(errorTrace, extraData);

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

            if (!utils.isFunction(listener)) {
                eventListeners[eventName].push(listener);
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
            var listenerIndexes = [];

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
                    listenerIndexes.push(i);
                }
            }

            // remove all similar listeners
            for (var index in listenerIndexes) {
                currentEventListeners.splice(index, 1);
            }

            return Sneaker;
        },

        /**
         * Wrap some function to make error report clearly
         * @param {function} func - function to wrap
         * @param {object} extraData
         * @returns {function}
         */
        wrap: function(func, extraData) {
            return function() {
                try {
                    return func.apply(this, args);
                } catch (e) {
                    Sneaker.handleException(e, extraData);
                    throw e;
                }
            }
        },

        /**
         * Wrap an imediatly call function
         * @param {function} func - function to wrap
         * @param {*} args - function arguments
         * @param {object} extraData
         */
        wrappAndCall: function(func, args, extraData) {
            return Sneaker.wrap(func, extraData)(args);
        }

    };

})
();