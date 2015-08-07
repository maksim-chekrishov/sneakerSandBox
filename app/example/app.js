'use strict';
/**
 * Created by m.chekryshov on 30.07.15.
 */

(function() {

    $('.js-handled-error-button').click(function() {
        handledError();
    });
    $('.js-unhandled-error-button').click(function() {
        unhandledError();
    });
    $('.js-wrapped-method-error-button').click(function() {
        wrapedMethodError();
    });

    $('.js-error-button').click(function() {
        Sneaker.error('Custom error');
    });
    $('.js-warning-button').click(function() {
        Sneaker.warn('Some warning info');
    });
    $('.js-info-button').click(function() {
        Sneaker.info('Some inforamtion');
    });

    function funcToWrap() {
        throw new Error('Error from wrapped method');
    }

    function unhandledError() {
        throw new Error('Unhandled Error');
    }

    function handledError() {
        try {
            throw new Error('Some handled Error');
        } catch (e) {
            Sneaker.handleException(e);
        }
    }

    function wrapedMethodError() {
        Sneaker.callThrough(funcToWrap)
    }

})();