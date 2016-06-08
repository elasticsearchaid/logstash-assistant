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
      text: "",
      matches: {}
    };

    var regex = {
      plugin: /([\w\d]+)\s\{\n((.|\s)+)\n}\n/gi, //get all plugins & their props
      plugin_settings: /([\w\d]+)\s\{\s(([\w\d]+)\s?=>\s?(.+))?}/i,
      settings_split: /(([\w\d]+)\s?=>\s?)/gi,
      settings: /(([\w\d]+)\s?=>\s?(.+))/i
    };

    obJsonLoaderService.loadJsonData('json/config_struct.json').then(function (json) {

      model.list = json;
    });

    var methods = {
      parseInput: function () {
        var plugin_type_match;
        var plugin_groups;
        var text = model.text;
        text = text.replace(/\s+/g, " ");
        plugin_groups = splitByOuterBrackets(text);

        for (var i = 0; i < plugin_groups.length; i++) {
          plugin_groups[i] = plugin_groups[i].replace(/\{\s?/g, "\{\n");
          plugin_groups[i] = plugin_groups[i].replace(/}\s?/g, "\n}\n");

          while (plugin_type_match = regex.plugin.exec(plugin_groups[i])) {
            var plugins_in_group = plugin_type_match[2].replace(/\s+/g, " ");
            var plugin_settings_group = splitByOuterBrackets(plugins_in_group);
            var settings_match;
            var plugin_settings = {};

            for (var j = 0; j < plugin_settings_group.length; j++) {
              var values = {};
              var single_setting_match;

              settings_match = regex.plugin_settings.exec(plugin_settings_group[j]);

              if (settings_match[2]) {
                var settings_arr = splitByPluginSettings(settings_match[2]);
                for (var k = 0; k < settings_arr.length; k++) {
                  single_setting_match = regex.settings.exec(settings_arr[k]);

                  if (single_setting_match) {
                    if (single_setting_match[2] && single_setting_match[3]) {
                      values[single_setting_match[2]] = single_setting_match[3];
                    } else if (single_setting_match[2]) {
                      values = single_setting_match[2];
                    }
                    plugin_settings[settings_match[1]] = values;
                  }
                }
              } else {
                plugin_settings[settings_match[1]] = {};
              }
            }
            model.matches[plugin_type_match[1]] = plugin_settings;
          }
        }

        console.log(model.matches);
      }
    };

    function splitByPluginSettings(plugin_settings) {
      if (!plugin_settings) {
        return [];
      }

      var ret = [];
      var start = 0;
      var count = 0;
      var plugin_setting_match;

      while (plugin_setting_match = regex.settings_split.exec(plugin_settings)) {
        if (count > 0) {
          ret.push(getSubString(plugin_settings, start, plugin_setting_match.index - 1));
          start = plugin_setting_match.index;
        }

        count++;
      }

      ret.push(getSubString(plugin_settings, start));
      return ret;
    }

    function splitByOuterBrackets(text) {
      var ret = [];
      var start = 0;
      var count = 0;
      var outerBracketFound = false;

      //split when brackets are balanced
      for (var i = 0; i < text.length; i++) {
        if (outerBracketFound) {
          count += isBracket(text.charAt(i));

          //balanced
          if (count === 0) {
            i++;
            ret.push(getSubString(text, start, i).trim());
            start = i;
            outerBracketFound = false;
          }
        } else if (isBracket(text.charAt(i)) === 1) {

          outerBracketFound = true;
          count++;
        }
      }

      return ret;
    }

    function isBracket(char) {
      var ret = 0;

      if (char === '{') {
        ret = 1;
      } else if (char === '}') {
        ret = -1;
      }

      return ret;
    }

    function getSubString(text, start, end) {
      if (end === undefined) {
        end = text.length;
      }

      var ret = text.substring(start, end).trim();
      return ret;
    }

    function escapeRegExp(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    this.methods = methods;
    this.model = model;
  });
