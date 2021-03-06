'use strict';

/**
 * @ngdoc function
 * @name logstashAssistantApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the logstashAssistantApp
 */
angular.module('logstashAssistantApp')
  .controller('MainCtrl', ['obLogstashEditor', '$timeout', '$scope', function (obLogstashEditor, $timeout, $scope) {
    var self = this;
    var $textArea, $smartSuggestions;

    var model = {
      input: '',
      plugins_list: {},
      matches: {},
      suggestions: [],
      quick_suggestion_index: -1,
      quick_suggestion_type: '',
      last_num_of_tabs: 0,
      current_pipeline: '',
      current_plugin: '',
      scope_level: 0
    };

    var regex = {
      last_word: /([\w\d]+)[ \t]*$/
    };

    function padWithTabs(numOfTabs) {
      var ret = "";

      for (var i = 0; i < numOfTabs; i++) {
        ret += "\t";
      }

      return ret;
    }

    function createScopeWithTabs(numOfTabs) {
      var ret = " {\n";

      ret += padWithTabs(numOfTabs);
      ret += "\n";
      ret += padWithTabs(numOfTabs - 1);

      ret += "}";

      return ret;
    }

    var methods = {
      markOnHover: function ($index) {
        if (model.quick_suggestion_type !== 'props') {
          model.quick_suggestion_index = $index;
        }
      },
      deselectOnLeave: function () {
        model.quick_suggestion_index = -1;
      },
      selectSuggestion: function () {
        var caret_pos = $textArea[0].selectionStart;
        var text_up_to_caret = model.input.substring(0, caret_pos);
        var text_after_caret = model.input.substring(caret_pos);
        var appended_text = "";

        if (model.quick_suggestion_type.indexOf('brackets') !== -1) {
          switch (model.quick_suggestion_type) {
            case 'pipeline_brackets':
            case 'plugin_brackets':
              appended_text += createScopeWithTabs(model.scope_level + 1);
              caret_pos += 3 + model.scope_level;
              break;

            default:
              break;
          }

          model.input = text_up_to_caret + appended_text + text_after_caret;

          $timeout(function () {
            $textArea[0].setSelectionRange(caret_pos, caret_pos);
            methods.intelliSense();
            $textArea[0].focus();
          });
        } else if (model.suggestions[model.quick_suggestion_index]) {
          var last_word = regex.last_word.exec(text_up_to_caret);
          var last_word_start;

          if (last_word) {
            last_word_start = last_word.index;
          } else {
            last_word_start = caret_pos;
          }

          var new_caret_pos = last_word_start + model.suggestions[model.quick_suggestion_index].length;

          if (text_up_to_caret.charAt(last_word_start - 1) === '}') {
            appended_text += "\n";

            for (var i = 0; i < model.scope_level; i++) {
              appended_text += "\t";
            }
            new_caret_pos += model.scope_level + 1;
          }

          appended_text += model.suggestions[model.quick_suggestion_index];

          switch (model.quick_suggestion_type) {
            case 'pipeline':
            case 'plugin':
              appended_text += createScopeWithTabs(model.scope_level + 1);
              new_caret_pos += 4 + model.scope_level;
              break;

            //case 'plugin':
            //  appended_text += " {\n\t\t\n\t}";
            //  new_caret_pos += 5;
            //  break;

            case 'setting':
              appended_text += " => ";
              new_caret_pos += 4;
              break;
          }

          var new_text = model.input.substring(0, last_word_start) + appended_text + text_after_caret;
          model.input = new_text;
          model.suggestions = [];
          model.quick_suggestion_index = -1;

          $timeout(function () {
            $textArea[0].setSelectionRange(new_caret_pos, new_caret_pos);
            methods.intelliSense();
          });
        }
      },
      keyPressDown: function ($event) {
        initTextarea();

        if ($event.keyCode === 27) { //esc
          model.quick_suggestion_index = -1;
          model.suggestions = [];
        } else if ($event.keyCode === 9) { //tab
          $event.preventDefault();

          if (model.quick_suggestion_type !== 'props') {
            if ($event.shiftKey) {
              model.quick_suggestion_index--;
            } else {
              model.quick_suggestion_index++;
            }

            if (model.quick_suggestion_index >= model.suggestions.length) {
              model.quick_suggestion_index = -1;
            } else if (model.quick_suggestion_index < 0) {
              model.quick_suggestion_index = model.suggestions.length - 1;
            }
          }
        } else if ($event.keyCode === 13) { //enter
          $event.preventDefault();

          var caret_pos = $textArea[0].selectionStart;
          var text_up_to_caret = model.input.substring(0, caret_pos);
          var text_after_caret = model.input.substring(caret_pos);

          if (model.suggestions[model.quick_suggestion_index] || model.quick_suggestion_type.indexOf('brackets') !== -1) {
            methods.selectSuggestion();
          } else {
            var num_of_tabs = model.scope_level;

            if (text_after_caret.replace(/\t/, '').charAt(0) === '}') {
              num_of_tabs--;
              //text_up_to_caret += padWithTabs(num_of_tabs);
              //caret_pos += num_of_tabs;
            }

            text_up_to_caret += "\n";
            text_up_to_caret += padWithTabs(num_of_tabs);

            caret_pos += num_of_tabs + 1;

            model.input = text_up_to_caret + text_after_caret;

            $timeout(function () {
              $textArea[0].setSelectionRange(caret_pos, caret_pos);

              methods.intelliSense();
            });
          }
        }
      },
      keyPressUp: function ($event) {
        //if arrows
        if ($event.keyCode === 37 || $event.keyCode === 38 || $event.keyCode === 39 || $event.keyCode === 40) {
          methods.intelliSense();
        }
      },
      intelliSense: function () {
        initTextarea();

        obLogstashEditor.intelliSense(model.input, $textArea[0].selectionStart);
      },
      validateInput: function () {
        obLogstashEditor.validateInput();
      },
      isSettingRequired: function (setting) {
        return obLogstashEditor.isSettingRequired(setting);
      },
      logstashEditor: function () {
        return obLogstashEditor;
      },
      isEmpty: function (obj) {
        if (!obj)
          return true;

        return Object.keys(obj).length === 0;
      }
    };

    function initTextarea() {
      if (!$textArea) {
        $textArea = angular.element(angular.element(document).find('#editor')[0]);
      }

      if (!$smartSuggestions) {
        $smartSuggestions = angular.element(angular.element(document).find('.smart-suggestions')[0]);
      }
    }

    function init() {
      obLogstashEditor.init().then(function () {
        model = obLogstashEditor.getLogstashModel();
        self.model = model;

        //get caret updates from obTextarea directive
        $scope.$on('obTextarea:caretChange', function (event, data) {
          methods.intelliSense();
          $smartSuggestions.css('top', data.caret.y + 'px');
          $smartSuggestions.css('left', data.caret.x + 'px');
        });
        //console.log(model);
      }, function (err) {

      });

      self.methods = methods;
    }

    init();
  }]);
