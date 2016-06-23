/**
 * Created by bennun on 20/06/2016.
 * obTextarea is a directive that emits the caret's pixel position
 * on every model-change/click/keypress with the event
 * 'obTextarea:caretChange'
 */

(function () {
  'use strict';

  var obTextarea = angular.module('obTextareaModule');

  obTextarea
    .directive('obTextarea', ['$timeout', function ($timeout) {
      return {
        restrict: 'A',
        scope: {
          ngModel: '=',
          obTextarea: '='
        },
        compile: function (tElem, tAttrs) {
          var textarea_styles;
          var last_caret_position = {};
          var regex_current_line = /.*?\n?(.*)$/;
          var temp_elem = $('<pre>'); //dummy element

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

          function getTextUpToCaret($textarea) {
            return $textarea.val().substring(0, $textarea[0].selectionStart);
          }

          function calculateCaretX($textarea) {
            var text_to_caret = getTextUpToCaret($textarea);
            var text_in_line = regex_current_line.exec(text_to_caret)[1]; //get last line

            temp_elem.text(text_in_line); //inject text in last line to dummy-element

            //add & remove dummy-element to body in-order to calculate it's position
            document.body.appendChild(temp_elem[0]);
            var caret_x = temp_elem[0].clientWidth;
            document.body.removeChild(temp_elem[0]);

            return caret_x;
          }

          function calculateCaretY($textarea) {
            var text_to_caret = getTextUpToCaret($textarea);
            var line_num = text_to_caret.split('\n').length; //count number of lines
            var caret_y = line_num * textarea_styles.lineHieght;

            return caret_y;
          }

          function calculateCaretPosition($textarea, direction) {
            var caret_pos = {
              x: calculateCaretX($textarea),
              y: calculateCaretY($textarea) + textarea_styles.paddingTop + textarea_styles.borderTop - $textarea[0].scrollTop
            };

            switch (direction) {
              case 'rtl':
                caret_pos.x += (textarea_styles.paddingRight + textarea_styles.borderRight - $textarea[0].scrollLeft);
                break;

              case 'ltr':
              default:
                caret_pos.x += (textarea_styles.paddingLeft + textarea_styles.borderLeft - $textarea[0].scrollLeft);
                break;
            }

            return caret_pos;
          }

          function emitChanges(scope, $textarea) {
            $timeout(function () {
              var current_caret_position = calculateCaretPosition($textarea, scope.obTextarea);
              if (last_caret_position.x !== current_caret_position.x || last_caret_position.y !== current_caret_position.y) {
                last_caret_position = current_caret_position;
                scope.$emit('obTextarea:caretChange', {caret: current_caret_position});
              }
            });
          }

          return {
            pre: function (scope, iElem, iAttrs) {
              function init() {
                textarea_styles = getTextAreaStyle(iElem);
                console.log(iElem);
                temp_elem.css('font-size', textarea_styles.fontSize + 'px');
                temp_elem.css('font-family', textarea_styles.fontFamily);
                temp_elem.css('position', 'absolute');
                temp_elem.css('display', 'inline-block');
                temp_elem.css('padding', '0');
                temp_elem.css('margin', '0');
                temp_elem.css('visibility', 'hidden');
              }

              init();
            },
            post: function (scope, iElem, iAttrs) {
              scope.$watch('ngModel', function () {
                emitChanges(scope, iElem);
              });

              iElem.on('keyup click focus', function (event) {
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


