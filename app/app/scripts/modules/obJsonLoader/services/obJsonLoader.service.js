/**
 * Created by bennun on 05/06/2016.
 */
(function () {
  'use strict';

  var obJsonLoaderModule = angular.module('obJsonLoader');

  obJsonLoaderModule
    .service('obJsonLoaderService', ['$http', '$q', function ($http, $q) {
      var methods = {
        loadJsonData: function (fileName) {
          var deferred = $q.defer();

          loadJSON(fileName).then(function (res) {
            deferred.resolve(res.data);
          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
        }
      };

      //private
      function loadJSON(fileName) {
        return $http.get(fileName)
          .then(function (data) {
            return data;
          }, function (err) {
            return err;
          });
      }

      return methods;
    }]);

})();
