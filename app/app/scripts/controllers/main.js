'use strict';

/**
 * @ngdoc function
 * @name logstashAssistantApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the logstashAssistantApp
 */
angular.module('logstashAssistantApp')
  .controller('MainCtrl', ['obLogstashEditor', '$timeout', function (obLogstashEditor, $timeout) {
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
      current_plugin: ''
    };

    var smartSuggestions = {
      left: 0,
      top: 0
    };

    var regex = {
      last_word: /([\w\d]+)[ \t]*$/
    };

    var methods = {
      keyPressDown: function ($event) {
        initTextarea();

        //console.log($event);
        if ($event.keyCode === 27) { //esc
          model.quick_suggestion_index = -1;
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

          var caret_pos = $textArea.selectionStart;
          var text_up_to_caret = model.input.substring(0, caret_pos);
          var text_after_caret = model.input.substring(caret_pos);
          var appended_text = "";

          if (model.quick_suggestion_type.indexOf('brackets') !== -1) {
            switch (model.quick_suggestion_type) {
              case 'pipeline_brackets':
                appended_text += " {\n\t\n}";
                caret_pos += 4;
                break;

              case 'plugin_brackets':
                appended_text += " {\n\t\t\n\t}";
                caret_pos += 5;
                //model.last_num_of_tabs = 2;
                break;

              default:
                //model.last_num_of_tabs = 0;
                break;
            }

            model.input = text_up_to_caret + appended_text + text_after_caret;

            $timeout(function () {
              $textArea.setSelectionRange(caret_pos, caret_pos);
              methods.intelliSense();
            });
          } else if (model.suggestions[model.quick_suggestion_index]) {
            //$event.preventDefault();
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
              new_caret_pos++;

              (function () {
                for (var i = 0; i < model.last_num_of_tabs; i++) {
                  appended_text += "\t";
                  new_caret_pos++;
                }
              })();
            }

            //if (model.quick_suggestion_type !== 'pipeline_brackets') {
            appended_text += model.suggestions[model.quick_suggestion_index];
            //}

            switch (model.quick_suggestion_type) {
              case 'pipeline':
                appended_text += " {\n\t\n}";
                //model.last_num_of_tabs = 1;
                new_caret_pos += 4;
                break;

              //case 'pipeline_brackets':
              //  appended_text += " => ";
              //  new_caret_pos += 4;
              //  //model.last_num_of_tabs = 2;
              //  break;

              case 'plugin':
                appended_text += " {\n\t\t\n\t}";
                new_caret_pos += 5;
                //model.last_num_of_tabs = 2;
                break;

              case 'setting':
                appended_text += " => ";
                new_caret_pos += 4;
                //model.last_num_of_tabs = 2;
                break;

              default:
                //model.last_num_of_tabs = 0;
                break;
            }

            var new_text = model.input.substring(0, last_word_start) + appended_text + text_after_caret;
            model.input = new_text;
            model.suggestions = [];
            model.quick_suggestion_index = -1;

            $timeout(function () {
              $textArea.setSelectionRange(new_caret_pos, new_caret_pos);
              methods.intelliSense();
            });
          } else {
            text_up_to_caret += "\n";
            //text_after_caret = model.input.substring(caret_pos);

            for (var i = 0; i < model.last_num_of_tabs; i++) {
              text_up_to_caret += "\t";
              caret_pos++;
            }
            caret_pos++;

            model.input = text_up_to_caret + text_after_caret;

            $timeout(function () {
              $textArea.setSelectionRange(caret_pos, caret_pos);
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

        obLogstashEditor.intelliSense(model.input, $textArea.selectionStart);

        //$smartSuggestions.
        $timeout(function () {
          smartSuggestions = getCaretCoordinates($textArea, $textArea.selectionEnd);
          $smartSuggestions.css('top', smartSuggestions.top + 20 + 'px');
          $smartSuggestions.css('left', smartSuggestions.left + 'px');
        });

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
        $textArea = angular.element(angular.element(document).find('textarea')[0])[0];
      }

      if (!$smartSuggestions) {
        $smartSuggestions = angular.element(angular.element(document).find('.smart-suggestions')[0]);
      }
    }

    function init() {
      obLogstashEditor.init().then(function () {
        model = obLogstashEditor.getLogstashModel();
        self.model = model;
        self.smartSuggestions = smartSuggestions;
        //console.log(model);
      }, function (err) {

      });

      self.methods = methods;
    }

    init();
  }]);
