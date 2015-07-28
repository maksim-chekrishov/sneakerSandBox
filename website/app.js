var AppRouter = Backbone.Router.extend({
    calendarViews: null,
    routes: {
        "": "main"
    },

    parseDate: function(str) {
        return new Date(str);
    },

    main: function() {
        var mainModel = new MainModel({startDate: this.parseDate(appConfig.startDate)});
        var mainView = new MainView({model: mainModel});

        $('#mainContainer')
            .append(mainView.render()
                .$el
                .click(onMainViewClick));

        function onMainViewClick() {
            try {
                /*
                 * your application code here
                 *
                 */
                throw new Error('oops');
            } catch (e) {
                TraceKit.report(e); //error with stack trace gets normalized and sent to subscriber
            }
        }
    },

    logError: function(errorReport){
        console.log(errorReport);
    }

});

var app = new AppRouter();

Backbone.history.start();

TraceKit.report.subscribe(app.logError);