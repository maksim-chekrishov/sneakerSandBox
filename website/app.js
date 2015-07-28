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

        $('#mainContainer').html(mainView.render().$el.html());
    }

});

var app = new AppRouter();

Backbone.history.start();