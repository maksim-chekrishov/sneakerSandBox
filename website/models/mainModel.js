var MainModel = Backbone.Model.extend({
        defaults: function() {
            return {
                startDate: new Date(1,1,1,1,1),
                currentDate: new Date()
            }
        }
    });
