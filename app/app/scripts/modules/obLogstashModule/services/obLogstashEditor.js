/**
 * Created by bennun on 16/06/2016.
 */

(function () {
  var obLogstashModule = angular.module('obLogstashModule');

  obLogstashModule
    .service('obLogstashEditor', ['obWebCrawlerService', '$q', function (obWebCrawlerService, $q) {
      var model = {
        input: '',
        plugins_list: {},
        matches: {},
        suggestions: [],
        quick_suggestion_index: -1,
        quick_suggestion_type: '',
        last_num_of_tabs: 0,
        current_pipeline: '',
        current_plugin: ''
      };

      var regex_consts = {
        key: '\\s*([\\w\\d]+)',
        equals: '[ \\t]*(\\=\\>)[ \\t]*',
        value: '([^\\n]+)\\n',
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

      var regex = {
        plugin: /([\w\d]+)\s\{\n((.|\s)+)\n}\n/gi, //get all plugins & their props
        plugin_settings: /([\w\d]+)\s\{\s(([\w\d]+)\s?=>\s?(.+))?}/i,
        settings_split: /(([\w\d]+)\s?=>\s?)/gi,
        settings: /(([\w\d]+)\s?=>\s?(.+))/i,
        last_word: /([\w\d]+)\s*$/
      };

      var Regex = {
        pipeline: function (plugins) {
          return regex_consts.key + regex_consts.open_bracket + plugins + regex_consts.close_bracket;
        },
        plugin: function (settings) {
          return regex_consts.key + regex_consts.open_bracket + settings + regex_consts.close_bracket;
        },
        setting: function () {
          return regex_consts.key + regex_consts.open_group + regex_consts.equals + regex_consts.close_group + regex_consts.none_or_once + regex_consts.open_group + regex_consts.value + regex_consts.close_group + regex_consts.none_or_once;
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
      var pipeline_regex = new RegExp(input_regex);

      var methods = {
        intelliSense: function (input, caret_pos) {
          var caret_match;
          var full_match;

          model.suggestions = [];
          model.quick_suggestion_index = -1;
          model.input = input;

          caret_match = pipeline_regex.exec(model.input.substring(0, caret_pos));
          //full_match = pipeline_regex.exec(model.input);

          var pipeline_match = caret_match[2];
          var pipeline_open_bracket = caret_match[3];
          var pipeline_close_bracket = caret_match[16];

          var plugin_match = caret_match[6];
          var plugin_open_bracket = caret_match[7];
          var plugin_close_bracket = caret_match[15];

          var setting_match = caret_match[9];

          //console.log(pipeline_match, plugin_match, setting_match);
          //console.log(caret_match);
          model.current_pipeline = pipeline_match;
          model.current_plugin = plugin_match;

          if (caret_match) { //pipeline
            model.last_num_of_tabs = 0;
            for (var pipeline in model.plugins_list) {
              if (pipeline === pipeline_match && !pipeline_close_bracket) {
                model.last_num_of_tabs = 1;
                if (pipeline_open_bracket) {
                  for (var plugin in model.plugins_list[pipeline]) {
                    if (plugin_match) {//plugin
                      if (plugin === plugin_match && !plugin_close_bracket) {
                        model.last_num_of_tabs = 2;
                        if (plugin_open_bracket) {
                          for (var setting in model.plugins_list[pipeline][plugin]) {
                            if (caret_match[10] && !caret_match[14]) { //setting
                              if (setting === caret_match[10] && caret_match[12] && !caret_match[14]) {
                                var conf = model.plugins_list[pipeline][plugin][setting];
                                model.suggestions = [];
                                model.suggestions.push('required: ' + conf.required);
                                model.suggestions.push('input type: ' + conf.input_type);
                                model.suggestions.push('default value: ' + conf.default_value);
                                model.quick_suggestion_type = 'props';
                                break;
                              } else if ((setting.indexOf(caret_match[10]) !== -1 && !caret_match[12]) || caret_match[14]) {
                                //} else if (!setting_found && setting.indexOf(caret_match[10]) !== -1) {
                                model.suggestions.push(setting);
                                model.quick_suggestion_type = 'setting';
                              }
                            } else if (!caret_match[10] || caret_match[14]) {
                              model.suggestions.push(setting);
                              model.quick_suggestion_type = 'setting';
                            }
                          }
                        } else if (!plugin_open_bracket) {
                          model.suggestions.push('{ }');
                          model.quick_suggestion_type = 'plugin_brackets';
                          break;
                        }

                      } else if (plugin.indexOf(plugin_match) !== -1 || plugin_close_bracket) {
                        model.suggestions.push(plugin);
                        model.quick_suggestion_type = 'plugin';
                      }
                    } else if (!plugin_match) {
                      model.suggestions.push(plugin);
                      model.quick_suggestion_type = 'plugin';
                    }
                  }
                } else if (!pipeline_open_bracket) {
                  model.suggestions.push('{ }');
                  model.quick_suggestion_type = 'pipeline_brackets';
                }

              } else if (pipeline.indexOf(pipeline_match) !== -1 && !pipeline_close_bracket) {
                //console.log(pipeline);
                model.suggestions.push(pipeline);
                model.quick_suggestion_type = 'pipeline';
              } else if (!pipeline_match || pipeline_close_bracket) {
                model.suggestions.push(pipeline);
                model.quick_suggestion_type = 'pipeline';
              }
            }
          }
        },
        validateInput: function () {
          var matches = {};
          var plugin_type_match;
          var plugin_groups;
          var text = model.input;
          text = text.replace(/\s+/g, " ");
          plugin_groups = splitByOuterBrackets(text);
          //console.log(plugin_groups);

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
                      //console.log(values);
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
        },
        isSettingRequired: function (setting) {
          return (model.plugins_list[model.current_pipeline] && model.plugins_list[model.current_pipeline][model.current_plugin] &&
          model.plugins_list[model.current_pipeline][model.current_plugin][setting] && model.plugins_list[model.current_pipeline][model.current_plugin][setting].required);
        },
        isEmpty: function (obj) {
          return Object.keys(obj).length === 0;
        },
        getLogstashModel: function () {
          return model;
        },
        init: function () {
          var deferred = $q.defer();

          obWebCrawlerService.fetchLogstashPlugins().then(function (json) {
            model.plugins_list = json;
            deferred.resolve();
          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
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


      return methods;
    }]);
})();
