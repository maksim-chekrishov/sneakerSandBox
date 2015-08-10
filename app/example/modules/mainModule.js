'use strict';
/**
 * Created by m.chekryshov on 07.08.15.
 */
var $ = require('jquery');
var _ = require('underscore');

module.exports = (function() {

    $('.js-handled-error-button').click(handledError);
    $('.js-unhandled-error-button').click(unhandledError);
    $('.js-wrapped-method-error-button').click(wrappedMethodError);
    $('.js-call-througth-error-button').click(callThroughtError);

    $('.js-error-button').click(sneakerError);
    $('.js-warning-button').click(sneakerWarning);
    $('.js-info-button').click(sneakerInfo);

    $('.js-ajax-error-button').click(sneakerAjaxError);
    $('.js-custom-logger-button').click(customLogger);
    $('.js-custom-reporter-button').click(customReporter);

    function unhandledError() {
        function sendRequest() {
            throw new Error('Unknown error');
        }

        sendRequest();
    }

    function handledError() {
        function sendRequest() {
            throw new Error('Incorrect response');
        }

        try {
            sendRequest();
        } catch (e) {
            Sneaker.handleException(e);
        }
    }

    function wrappedMethodError() {
        var pendingRequestsQueue = [];
        var currentRequest = {};

        function sendRequest() {
            throw new Error('Incorrect response');
        }

        var reportableRequest = Sneaker.wrap(sendRequest);

        try {
            // Send report
            reportableRequest();
        } catch (e) {
            pendingRequestsQueue.push(currentRequest);
        }
    }

    function callThroughtError() {
        var pendingRequestsQueue = [];
        var currentRequest = {};

        function sendRequest() {
            throw new Error('Incorrect response');
        }

        try {
            // Send report
            Sneaker.callThrough(sendRequest);
        } catch (e) {
            pendingRequestsQueue.push(currentRequest);
        }
    }

    function sneakerError() {
        Sneaker.error('Custom error');
    }

    function sneakerWarning() {
        Sneaker.warn('Some warning info');
    }

    function sneakerInfo() {
        Sneaker.info('Some information');
    }

    function sneakerAjaxError() {
        $.post('failed-request.com', {data: 'data'});
    }

    function customLogger() {

        function customLogMethod(sneakerReport, extraData) {
            // log some additional information
            console.log('App[CustomLogger]: Session duration ' + sneakerReport.sessionDuration);
        }

        Sneaker.on('log', customLogMethod);

        Sneaker.handleException(new Error ('Log some exception report'));

        Sneaker.off('log', customLogMethod);

    }

    function customReporter() {

        function customSendMethod(sneakerReport, extraData) {
            console.log('I use my custom method to send request to my server instead of default');

            return false; // prevent calling default send method
        }

        Sneaker.on('send', customSendMethod);

        Sneaker.handleException(new Error ('Send some exception report'));

        Sneaker.off('send', customSendMethod);

    }


})();