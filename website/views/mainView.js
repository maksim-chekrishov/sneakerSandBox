/**
 * Created by m.chekryshov on 25.05.15.
 */

var MainView = Backbone.View.extend({

  initialize: function(){
    this.template = _.template($("#mainTemplate").html());
  },

  render: function() {
    this.$el.empty()
        .append(this.template(this.model.toJSON()))

    return this;
  }

});
