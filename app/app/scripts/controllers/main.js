'use strict';

/**
 * @ngdoc function
 * @name logstashAssistantApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the logstashAssistantApp
 */
angular.module('logstashAssistantApp')
  .controller('MainCtrl', function (obJsonLoaderService) {
    var model = {
      text: ""
    };

    obJsonLoaderService.loadJsonData('json/config_struct.json').then(function (json) {

      model.list = json.plugins;
    });

    this.model = model;
  });
