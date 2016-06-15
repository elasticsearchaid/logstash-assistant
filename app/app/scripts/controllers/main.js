'use strict';

/**
 * @ngdoc function
 * @name logstashAssistantApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the logstashAssistantApp
 */
angular.module('logstashAssistantApp')
  .controller('MainCtrl', function ($scope, obJsonLoaderService, obWebCrawlerService, $timeout) {
    var _self = this;
    var $textArea, $suggestions, $preText;

    //$timeout(function () {

    //  $suggestions = angular.element(document).find('.suggestions');
    //  $preText = angular.element(document).find('.suggestions .preText');
    //
    //  $suggestions.on('click', function () {
    //    $textArea[0].focus();
    //  });
    //});

    var model = {
      text: "",
      matches: {},
      list: {},
      suggestions: []
    };

    var regex = {
      plugin: /([\w\d]+)\s\{\n((.|\s)+)\n}\n/gi, //get all plugins & their props
      plugin_settings: /([\w\d]+)\s\{\s(([\w\d]+)\s?=>\s?(.+))?}/i,
      settings_split: /(([\w\d]+)\s?=>\s?)/gi,
      settings: /(([\w\d]+)\s?=>\s?(.+))/i
    };

    var regex_consts = {
      key: '([\\w\\d]+)',
      equals: '\\s*\\=\\>\\s*',
      value: '([^\\n]+\\n)',
      open_bracket: '(\\s*\\{\\s*(',
      close_bracket: ')*(\\s*\\}\\s*)?)?',
      array: '(\\[[^\\]]\\])',
      open_group: '(',
      close_group: ')',
      none_or_once: '?',
      none_or_many: '*',
      once_or_many: '+',
      any_string: '.*',
      EOS: '$'
    };

    var Regex = {
      pipeline: function (plugins) {
        return regex_consts.key + regex_consts.open_bracket + plugins + regex_consts.close_bracket;
      },
      plugin: function (settings) {
        return regex_consts.key + regex_consts.open_bracket + settings + regex_consts.close_bracket;
      },
      setting: function () {
        return regex_consts.key + regex_consts.open_group + regex_consts.equals + regex_consts.value + regex_consts.close_group + regex_consts.none_or_once;
      },
      hash: function () {
        return regex_consts.open_bracket + Regex.setting() + regex_consts.close_bracket;
      },
      array: function () {
        return regex_consts.array;
      },
      value: function () {

      },
      none_or_many: function (regex) {
        return regex_consts.open_group + regex + regex_consts.close_group + regex_consts.none_or_many;
      },
      once_or_many: function (regex) {
        return regex_consts.open_group + regex + regex_consts.close_group + regex_consts.once_or_many;
      },
      none_or_once: function (regex) {
        return regex_consts.open_group + regex + regex_consts.close_group + regex_consts.none_or_once;
      }
    };

    var input_regex = Regex.none_or_many(Regex.pipeline(Regex.none_or_many(Regex.plugin(Regex.none_or_many(Regex.setting())))));
    //obJsonLoaderService.loadJsonData('json/config_struct.json').then(function (json) {
    //
    //  model.list = json;
    //});

    var methods = {
      intelliSense: function () {
        model.suggestions = [];
        var ret = [];
        var caret_match;
        var full_match;

        if (!$textArea) {
          $textArea = angular.element(angular.element(document).find('textarea')[0])[0];
        }

        //var pipeline_regex2 = /(([\w\d]+)(\s*\{\s*(([\w\d]+)(\s*\{\s*(([\d\w]+)(\s*(=>\s*)?([^\n]+)?)?)*\s*\}?\s*)?\s*\}?\s*)*)?\s*\}?\s*)*$/;
        //var pipeline_regex = new RegExp(regex_consts.open_group + regex_consts.key + regex_consts.open_bracket + regex_consts.key + regex_consts.open_bracket
        //  + regex_consts.key + regex_consts.equals + regex_consts.value + regex_consts.close_bracket + regex_consts.close_bracket + regex_consts.close_group
        //  + regex_consts.many_or_none + regex_consts.EOS);

        var pipeline_regex = new RegExp(input_regex);

        var caret_pos = $textArea.selectionStart;
        //var temp_text = padTextWithBrackets(model.text.substring(0, curser));
        caret_match = pipeline_regex.exec(model.text.substring(0, caret_pos));
        full_match = pipeline_regex.exec(model.text);

        if (caret_match && caret_match[2]) { //pipeline
          for (var pipeline in model.list) {
            if (pipeline === caret_match[2]) {
              //if (!full_match[3]) {
              //  model.text += " {\n\n}";
              //  console.log(caret_pos);
              //  $textArea.setSelectionRange(caret_pos, caret_pos);
              //  //$textArea.selectionEnd = caret_pos;
              //} else if (full_match[3] && !full_match[14]) {
              //  model.text += "\n}";
              //}

              for (var plugin in model.list[pipeline]) {
                if (caret_match[6]) {//plugin
                  if (plugin === caret_match[6]) {
                    var setting_found = false;

                    for (var setting in model.list[pipeline][plugin]) {
                      if (caret_match[10]) { //setting
                        if (setting === caret_match[10]) {
                          var conf = model.list[pipeline][plugin][setting];
                          setting_found = true;
                          model.suggestions = [];
                          model.suggestions.push('required: ' + conf.required);
                          model.suggestions.push('input type: ' + conf.input_type);
                          model.suggestions.push('default value: ' + conf.default_value);
                        } else if (!setting_found && setting.indexOf(caret_match[10]) !== -1) {
                          model.suggestions.push(setting);
                        }
                      }
                    }
                  } else if (plugin.indexOf(caret_match[6]) !== -1) {
                    model.suggestions.push(plugin);
                  }
                }
              }
            } else if (pipeline.indexOf(caret_match[2]) !== -1) {
              //console.log(pipeline);
              model.suggestions.push(pipeline);
            }
          }
        }
        console.log(caret_match, pipeline_regex);
      },
      validateInput: function () {
        var matches = {};
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

              if (settings_match && settings_match[2] !== null) {
                var settings_arr = splitByPluginSettings(settings_match[2]);
                for (var k = 0; k < settings_arr.length; k++) {
                  single_setting_match = regex.settings.exec(settings_arr[k]);

                  if (single_setting_match) {
                    if (single_setting_match[2] !== null && single_setting_match[3] !== null) {
                      values[single_setting_match[2]] = single_setting_match[3];
                    } else if (single_setting_match[2]) {
                      values = single_setting_match[2];
                    }
                    console.log(values);
                    if (settings_match && settings_match[1] !== null) {
                      plugin_settings[settings_match[1]] = values;
                    }
                  }
                }
              } else {
                if (settings_match && settings_match[1] !== null)
                  plugin_settings[settings_match[1]] = {};
              }
            }

            if (matches[plugin_type_match[1]] === undefined) {
              matches[plugin_type_match[1]] = plugin_settings;
            } else {
              angular.extend(matches[plugin_type_match[1]], plugin_settings);
            }
          }
        }

        model.matches = matches;
        console.log(model.matches.size);
      },
      isEmpty: function (obj) {
        return Object.keys(obj).length === 0;
      }
    };

    function countStringRepeatInText(text, char) {
      return text.split(char).length - 1;
    }

    function countOpenBrackets(text) {
      return countStringRepeatInText(text, '{');
    }

    function countCloseBrackets(text) {
      return countStringRepeatInText(text, '}');
    }

    function padTextWithBrackets(text) {
      var openCount = countOpenBrackets(text);
      var closeCount = countCloseBrackets(text);
      var ret = text;

      if (openCount - closeCount < 2)
        ret += '{}';

      for (var i = 0; i < openCount - closeCount; i++) {
        ret += '}';
      }

      return ret;
    }

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

    obWebCrawlerService.fetchLogstashPlugins().then(function (json) {
      model.list = json;
    });

    this.methods = methods;
    this.model = model;
  });
