/**
 * Created by bennun on 13/06/2016.
 */
(function () {
  var obWebCrawler = angular.module('obWebCrawler');

  obWebCrawler
    .service('obWebCrawlerService', ['$http', '$q', 'localStorageService', function ($http, $q, localStorageService) {
      var urlBase = 'https://www.elastic.co/guide/en/logstash/current';

      var methods = {
        fetchLinkPromisesFromTable: function (url, link_selector) { //looks for the table element in the page and extracts the links from it
          var ret = [];
          var links;
          var deferred = $q.defer();

          $http.get(url).then(function (res) {
            links = angular.element(res.data).find(link_selector);

            for (var i = 0; i < links.length; i++) {
              ret.push($http.get(urlBase + links[i].pathname));
            }

            deferred.resolve(ret);
          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
        }, buildJsonFromPromises: function (promises) {
          var ret = {};
          var deferred = $q.defer();

          $q.all(promises).then(function (res_array) {
            for (var i = 0; i < res_array.length; i++) {
              var t_page = angular.element(res_array[i].data);
              var settings = t_page.find('div.informaltable tbody tr');
              var plugin_name = t_page.find('div.breadcrumbs span.breadcrumb-node')[0].textContent;
              ret[plugin_name] = {};

              for (var j = 0; j < settings.length; j++) {
                var setting = angular.element(settings[j]);
                var setting_name = setting.find('td:first-of-type')[0].textContent;
                var input_type = angular.element(setting.find('td:nth-of-type(2)')[0]).text();
                var required = angular.element(setting.find('td:nth-of-type(3)')[0]).text() === "Yes";
                var default_value = angular.element(setting.find('td:nth-of-type(4)')[0]).text();

                ret[plugin_name][setting_name] = {
                  input_type: input_type,
                  required: required,
                  default_value: default_value
                };
              }
            }
            deferred.resolve(ret);
          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
        },
        fetchLogstashPlugins: function () {
          var ret = localStorageService.get('plugins');
          var deferred = $q.defer();
          if (ret) {
            deferred.resolve(JSON.parse(ret));
            return deferred.promise;
          }

          ret = {};
          var promises = [], jsonPromises = [];
          var link_selector = 'div.informaltable tbody tr > td:first-of-type a';
          var input_plugin_url = '/input-plugins.html';
          var output_plugin_url = '/output-plugins.html';
          var filter_plugin_url = '/filter-plugins.html';
          var codec_plugin_url = '/codec-plugins.html';

          promises.push(methods.fetchLinkPromisesFromTable(urlBase + input_plugin_url, link_selector));
          promises.push(methods.fetchLinkPromisesFromTable(urlBase + output_plugin_url, link_selector));
          promises.push(methods.fetchLinkPromisesFromTable(urlBase + filter_plugin_url, link_selector));
          promises.push(methods.fetchLinkPromisesFromTable(urlBase + codec_plugin_url, link_selector));

          $q.all(promises).then(function (res) {
            jsonPromises.push(methods.buildJsonFromPromises(res[0]));
            jsonPromises.push(methods.buildJsonFromPromises(res[1]));
            jsonPromises.push(methods.buildJsonFromPromises(res[2]));
            jsonPromises.push(methods.buildJsonFromPromises(res[3]));

            $q.all(jsonPromises).then(function (res2) {
              ret['input'] = res2[0];
              ret['output'] = res2[1];
              ret['filter'] = res2[2];
              ret['codec'] = res2[3];


              localStorageService.set('plugins', JSON.stringify(ret));
              deferred.resolve(ret);
            }, function (err2) {
              deferred.reject(err2);
            });
          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
        }
      };

      return methods;
    }]);
})();
