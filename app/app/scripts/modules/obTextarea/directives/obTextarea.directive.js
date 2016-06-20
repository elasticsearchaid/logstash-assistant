/**
 * Created by bennun on 20/06/2016.
 */
(function () {
  'use strict';

  var obTextarea = angular.module('obTextareaModule');

  obTextarea
    .directive('obTextarea', ['$timeout', '$parse', function ($timeout, $parse) {
      return {
        restrict: 'AE',
        scope: {
          obSuggestions: '@',
          obSelectedIndex: '=',
          obCaretPosition: '=',
          ngModel: '='
        },
        compile: function (tElem, tAttrs) {
          var textarea;
          var regex_line = /.*?\n?(.*)$/;
          var temp_elem = $('<pre>');

          function getNumValue(pixel_value) {
            return parseFloat(pixel_value.replace('px', ''));
          }

          function getTextAreaStyle($textarea) {
            var ret = {};

            ret.fontFamily = $textarea.css('font-family');
            ret.fontSize = getNumValue($textarea.css('font-size'));
            ret.lineHieght = getNumValue($textarea.css('line-height'));
            ret.width = $textarea.width();
            ret.height = $textarea.height();
            ret.paddingLeft = getNumValue($textarea.css('padding-left'));
            ret.paddingRight = getNumValue($textarea.css('padding-right'));
            ret.paddingTop = getNumValue($textarea.css('padding-top'));
            ret.paddingBottom = getNumValue($textarea.css('padding-bottom'));
            ret.borderLeft = getNumValue($textarea.css('border-left'));
            ret.borderRight = getNumValue($textarea.css('border-right'));
            ret.borderTop = getNumValue($textarea.css('border-top'));
            ret.borderBottom = getNumValue($textarea.css('border-bottom'));

            return ret;
          }

          function calculateCaretX($textarea) {
            var text_to_caret = $textarea.val().substring(0, $textarea[0].selectionStart);
            var text_in_line = regex_line.exec(text_to_caret)[1];

            temp_elem.text(text_in_line);

            document.body.appendChild(temp_elem[0]);
            var caret_x = temp_elem[0].clientWidth;
            document.body.removeChild(temp_elem[0]);

            return caret_x;
          }

          function calculateCaretY($textarea) {
            var text_to_caret = $textarea.val().substring(0, $textarea[0].selectionStart);
            var line_num = text_to_caret.split('\n').length;
            var caret_y = line_num * textarea.lineHieght;

            return caret_y;
          }

          function calculateCaretPosition($textarea) {
            //add container styles

            var caret_pos = {
              x: calculateCaretX($textarea) + textarea.paddingLeft + textarea.borderLeft - $textarea[0].scrollLeft,
              y: calculateCaretY($textarea) + textarea.paddingTop + textarea.borderTop - $textarea[0].scrollTop
            };

            console.log(caret_pos);

            return caret_pos;
          }

          function emitChanges(scope, $textarea) {
            $timeout(function () {
              scope.$emit('obTextarea:caretChange', {caret: calculateCaretPosition($textarea)});
            });
          }

          return {
            pre: function (scope, iElem, iAttrs) {
              function init() {
                textarea = getTextAreaStyle(iElem);

                temp_elem.addClass('hidden-span');
                temp_elem.css('font-size', textarea.fontSize + 'px');
                temp_elem.css('font-family', textarea.fontFamily);

                //emitChanges(scope, iElem);
              }

              init();
            },
            post: function (scope, iElem, iAttrs) {
              scope.$watch('ngModel', function () {
                emitChanges(scope, iElem);
              });

              iElem.on('keypress keyup keydown click focus', function () {
                emitChanges(scope, iElem);
              });

              $timeout(function () {
                iElem.focus();
                iElem.click();
              });
            }
          }
        }
      };
    }]);
})();


