/**
 * Created by bennun on 23/03/2016.
 */

(function () {
  'use strict';

  var obToggle = angular.module('obToggleModule', []);

  obToggle
    .directive('obToggle', ['$timeout', '$parse', function ($timeout, $parse) {
      return {
        restrict: 'A',
        //priority: 0,
        compile: function (tElem, tAttrs) {
          var timeMs;
          var displayTimeout;
          var destroyOnTimeout = false;
          var wasChanged = false;


          return {
            pre: function (scope, iElem, iAttrs) {
              function init() {
                if (tAttrs.obToggle) {
                  timeMs = $parse(tAttrs.obToggle)(scope);
                  timeMs = parseInt(timeMs);
                  if (isNaN(timeMs)) {
                    timeMs = 1000;
                  }
                } else if (tAttrs.noTimeout) {
                  timeMs = null;
                } else {
                  timeMs = 1000;
                }

                if (tAttrs.destroyOnTimeout) {
                  destroyOnTimeout = true;
                }
              }

              init();
            },
            post: function (scope, iElem, iAttrs) {
              var toggleId;

              var $mainSection;
              var $closeButtons;
              var $toggleButtons;
              var $hiddenSection;
              var $toggleElements;

              var model = {
                isOpened: false
              };

              var methods = {
                toggleSection: function (toggle) {
                  if (toggle === undefined) {
                    toggle = !model.isOpened;
                  }

                  model.isOpened = toggle;

                  if (displayTimeout) $timeout.cancel(displayTimeout);
                  displayTimeout = null;
                  scope.$digest();
                },
                sectionTimeout: function () {
                  if (displayTimeout) $timeout.cancel(displayTimeout);
                  displayTimeout = null;

                  if (model.isOpened) {
                    displayTimeout = $timeout(function () {
                      displayTimeout = null;
                      model.isOpened = false;
                      scope.$digest();
                    }, timeMs, false);
                  }
                },
                keepSectionOpened: function () {
                  if (model.isOpened) {
                    if (displayTimeout) $timeout.cancel(displayTimeout);
                    displayTimeout = null;
                  }
                }
              };

              function toggleHiddenSection(val) {
                if (val === undefined) {
                  val = !model.isOpened;
                }

                if (wasChanged) {
                  $hiddenSection.attr('data-ob-hidden-section', val + '');
                  toggleElements();
                  wasChanged = false;
                }

              }

              function toggleElements() {
                for (var i = 0; i < $toggleElements.length; i++) {
                  var $element = angular.element($toggleElements[i]);
                  var toggleWhen = JSON.parse($element.attr('data-ob-toggle-element'));
                  if (toggleWhen == model.isOpened) {
                    $element.removeClass('ng-hide');
                  } else {
                    $element.addClass('ng-hide');
                  }
                }
              }

              function bootstrapElements(parent) {
                $mainSection = angular.element(parent);

                if (toggleId) {
                  //console.log(toggleId);
                  $hiddenSection = parent.querySelector('[data-ob-hidden-section][data-toggle-id=' + toggleId + ']');
                  $toggleElements = parent.querySelectorAll('[data-ob-toggle-element][data-toggle-id=' + toggleId + ']');
                  $toggleButtons = '[data-ob-toggle-button][data-toggle-id=' + toggleId + ']';
                  $closeButtons = '[data-ob-close-button][data-toggle-id=' + toggleId + ']';
                } else {
                  $hiddenSection = parent.querySelector('[data-ob-hidden-section]:not([data-toggle-id])');
                  $toggleElements = parent.querySelectorAll('[data-ob-toggle-element]:not([data-toggle-id])');
                  $toggleButtons = '[data-ob-toggle-button]:not([data-toggle-id])';
                  $closeButtons = '[data-ob-close-button]:not([data-toggle-id])';
                }

                //elements lookup
                if ($hiddenSection) {
                  $hiddenSection = angular.element($hiddenSection);
                } else {
                  $hiddenSection = $mainSection;
                }

                if (!parent.querySelector($toggleButtons)) {
                  if (!!parent.attributes['data-ob-toggle-button']) {
                    //$toggleButtons = $mainSection;
                    bindEvent('click', methods.toggleSection);
                  }
                  $toggleButtons = undefined;
                } else {
                  bindEvent('click', methods.toggleSection, $toggleButtons);
                }

                if (timeMs !== null) {
                  bindEvent('mouseleave', methods.sectionTimeout);
                  bindEvent('mouseover', methods.keepSectionOpened);
                }

                if (iAttrs.toggleOnHover) {
                  bindEvent('mouseenter', methods.toggleSection, $toggleButtons, true);
                }


                bindEvent('click', methods.toggleSection, $closeButtons, false);
              }

              if (iAttrs.toggleId && iAttrs.ngRepeat) {
                $timeout(function () {
                  toggleId = iAttrs.toggleId;
                  postInit();
                }, 0, false);
              } else if (iAttrs.toggleId) {
                toggleId = iAttrs.toggleId;
                postInit();
              } else if (iAttrs.ngRepeat) {
                $timeout(function () {
                  postInit();
                }, 0, false);
              } else {
                postInit();
              }

              function bindEvent(event, method, $elem, args) {
                if ($elem !== undefined) {
                  $mainSection.on(event, $elem, function (ev) {
                    ev.stopPropagation();
                    if (method !== undefined)
                      method(args);
                  });
                } else {
                  $mainSection.on(event, function (ev) {
                    ev.stopPropagation();
                    if (method !== undefined)
                      method(args);
                  });
                }
              }

              function postInit() {
                bootstrapElements(iElem[0]);

                //check if there is a condition for toggle
                if (iAttrs.toggleIf !== undefined) {
                  scope.$watch(function () {
                    return iAttrs.toggleIf;
                  }, function (isOpened) {
                    model.isOpened = isOpened;
                  });
                }
                //track model change
                scope.$watch(function () {
                  return model.isOpened;
                }, function (isOpened) {
                  wasChanged = true;
                  isOpened = JSON.parse(isOpened);
                  toggleHiddenSection(isOpened);

                  if (!model.isOpened && destroyOnTimeout) {
                    $timeout(function () {
                      scope.$destroy();
                    }, 0, false);
                  }
                });


                if (destroyOnTimeout) {
                  scope.$on('$destroy', function () {
                    $timeout(function () {
                      iElem[0].remove();
                    }, 200, false);
                  });
                }

                if (iAttrs.startVisible !== undefined) {
                  $timeout(function () {
                    model.isOpened = true;
                    scope.$digest();
                  }, 0, false);
                }
              }
            }
          }
        }
      };
    }]);

})();


