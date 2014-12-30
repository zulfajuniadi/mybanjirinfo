var app = angular.module('mybanjir', ['ngRoute', 'ngDisqus', 'ui.bootstrap', 'jmdobry.angular-cache', 'tc.chartjs'])

    .controller('FeedsController', function($scope, $filter, $routeParams){
        $scope.param = $routeParams.param ? $routeParams.param.split('::') : false;
        $scope.updateFeeds();
        $scope.filteredFeedsLength = $scope.feeds.length;
        $scope.filteredFeeds = [];
        $scope.currentPage = 1;
        $scope.numPerPage = 4;
        $scope.maxSize = 7;
        $scope.setFilteredFeeds = function() {
            var begin = (($scope.currentPage - 1) * $scope.numPerPage)
            , end = begin + $scope.numPerPage;
            $scope.filteredFeeds = $scope.feeds.sort(function(a,b){
                return (new Date(a.Timestamp)).getTime() < (new Date(b.Timestamp)).getTime() ? 1: -1
            }).filter(function(feed){
                if($scope.param) {
                    return (feed[$scope.param[0]] || 'others') === $scope.param[1].replace(/_/g, ' ');
                }
                return true;
            }).slice(begin, end);
            $scope.filteredFeedsLength = $scope.feeds.filter(function(feed){
                if($scope.param) {
                    return (feed[$scope.param[0]] || 'others') === $scope.param[1].replace(/_/g, ' ');
                }
                return true;
            }).length;
        };
        $scope.$watch('currentPage + numPerPage + feeds.length', $scope.setFilteredFeeds);
        $scope.pageChanged = $scope.setFilteredFeeds;
    })
    .controller('FeedController', function($scope, $routeParams){
        if($routeParams.ID) {
            $scope.$watch('feeds.length', function(){
                $scope.feed = $scope.feeds.filter(function(feed){
                    return feed.ID === parseInt($routeParams.ID, 10);
                }).pop();
            });
        }   
    })
    .controller('RiverLevelsController', function($scope, $routeParams){})
    .controller('RiverAlertsController', function($scope, $routeParams, $http){
        $http.get('http://riverlevels.zulfajuniadi.com/rivers/alerts')
            .success(function(alerts){
                $scope.alerts = alerts;
                if(alerts.length === 0)
                    $scope.error = 'No data found'
            })
            .error(function(){
                $scope.error = 'Feed unavailable at the moment'
            });
    })
    .controller('RiverLevelController', function($scope, $routeParams, $http, $angularCacheFactory){
        $scope.state = $scope.riverLevels.filter(function(state){
            return state.code === $routeParams.state_code;
        }).pop();
        if(!$scope.state.rivers.length) {
            $http.get('http://riverlevels.zulfajuniadi.com/rivers/state/' + $routeParams.state_code, {
                cache: $angularCacheFactory.get('riverDataCache')
            })
            .success(function(rivers){
                $scope.state.rivers = rivers;
            })
            .error(function(){
                $scope.error = 'Feed unavailable at the moment'
            });
        }
        $scope.$watch('state.rivers.length', function(){
            $scope.state = $scope.riverLevels.filter(function(state){
                return state.code === $routeParams.state_code;
            }).pop();
        });
    })
    .controller('WeatherForecastController', function($scope, $routeParams, $http, $angularCacheFactory, $timeout){
        $scope.filteredForecasts = [];
        $scope.dates = [];
        $scope.state = $scope.weatherForecasts.filter(function(state){
            return state.code === $routeParams.state_code;
        }).pop();
        if(!Object.keys($scope.state.forecasts).length) {
            $http.get('http://www.mybanjir.com/met/met.php?states=' + $routeParams.state_code, {
                cache: 3600000
            })
            .success(function(forecasts){
                $scope.state.forecasts = forecasts;
                $timeout(function(){
                    $.each(forecasts, function(k, v){
                        new Meteogram(v, k);
                    })
                }, 500);
            })
            .error(function(){
                $scope.error = 'Feed unavailable at the moment'
            });
        } else {
            $timeout(function(){
                $.each($scope.state.forecasts, function(k, v){
                    new Meteogram(v, k);
                })
            }, 500);
        }
        $scope.setFilteredFeeds = function() {
            if(Object.keys($scope.state.forecasts).length) {
                $scope.filteredForecasts = $.map($scope.state.forecasts, function(v, k){
                    if(!$scope.dates.length)
                        $scope.dates = v.results.map(function(result){
                            return moment(result.date);
                        });
                    v.location = k;
                    if(!$routeParams.selected_date)
                        return $.extend({}, v, v.results[0]);
                    return $.extend({}, v, v.results.filter(function(res){
                        return res.date === $routeParams.selected_date;
                    }).pop());
                });
                var dateTxt = $routeParams.selected_date ? moment($routeParams.selected_date) : $scope.dates[0];
                $scope.dateTxt = dateTxt.format('dddd LL');
            }
        }
        $scope.classActive = function(date) {
            if(!$routeParams.selected_date)
                return date === $scope.dates[0] ? 'btn btn-primary' : 'btn btn-default';
            return date.format('YYYY-MM-DD') === $routeParams.selected_date ? 'btn btn-primary' : 'btn btn-default';
        }
        $scope.$watch('state.forecasts', $scope.setFilteredFeeds);
        $scope.dateUrl = function(state, date) {
            return '#!/weatherforecast/' + state.code + '/' + date.format('YYYY-MM-DD');
        }
    })
    .controller('FloodedRoadController', function($scope, $routeParams, $http, $angularCacheFactory){
        $scope.state = $scope.floodedRoads.filter(function(state){
            return state.code === $routeParams.state_code;
        }).pop();
        if(!$scope.state.roads.length) {
            $http.get('http://node.globalresearch.my/mybanjir/ws.BencanaJKR.php?function=getBencanaJKR&output=json&state_code=' + $routeParams.state_code, {
                cache: $angularCacheFactory.get('floodedRoadsCache')
            })
            .success(function(roads){
                $scope.state.roads = roads;
                if(roads.length === 0)
                    $scope.error = 'No data found'
            })
            .error(function(){
                $scope.error = 'Feed unavailable at the moment'
            });
        }
        $scope.$watch('state.roads.length', function(){
            $scope.state = $scope.floodedRoads.filter(function(state){
                return state.code === $routeParams.state_code;
            }).pop();
        });
    })
    .controller('DropoffPointsController',function($scope, $http){
        if(!$scope.dropoffPoints.length) {
            $http.get('http://node.globalresearch.my/mybanjir/ws.DropOffPoints.php?function=getDropOffPoints')
                .success(function(data){
                    $scope.dropoffPoints = data;
                })
                .error(function(){
                    $scope.error('Feed unavailable at the moment');
                });
        }
    })
    .controller('WeatherForecastsController', function($scope, $routeParams){})
    .controller('FrequencyController', function($scope, $routeParams){})
    .controller('FloodedRoadsController', function($scope, $routeParams){})
    // .controller('RainLevelController', function($scope, $routeParams, $http, $angularCacheFactory){
    //   $scope.state = $scope.rainLevels.filter(function(state){
    //     return state.code === $routeParams.state_code;
    //   }).pop();
    //   if(!$scope.state.rains.length) {
    //     $http.get('http://www.mybanjir.com/met/met.php?states=' + $routeParams.state_code, {
    //       cache: $angularCacheFactory.get('rainDataCache')
    //     })
    //     raindata = [];
    //     .success(function(rains){
    //       $.each(rains,function(idx,dx) {
    //         raindata[idx]['name']('<canvas tc-chartjs-line chart-options="options" chart-data="data" auto-legend name="'+idx+'"></canvas>');
    //       });
    //       $scope.state.rains = rains;
    //     })
    //     .error(function(){
    //       $scope.error = 'Feed unavailable at the moment'
    //     });
    //   }
    //   $scope.$watch('state.rains.length', function(){
    //     $scope.state = $scope.rainLevels.filter(function(state){
    //       return state.code === $routeParams.state_code;
    //     }).pop();
    //   });
    //   // Chart.js Options
    //   $scope.options =  {
    //     responsive: true,
    //     scaleShowGridLines : true,
    //     scaleGridLineColor : "rgba(0,0,0,.05)",
    //     scaleGridLineWidth : 1,
    //     bezierCurve : true,
    //     bezierCurveTension : 0.4,
    //     pointDot : true,
    //     pointDotRadius : 4,
    //     pointDotStrokeWidth : 1,
    //     pointHitDetectionRadius : 20,
    //     datasetStroke : true,
    //     datasetStrokeWidth : 2,
    //     datasetFill : true,
    //     legendTemplate : '<ul class="tc-chart-js-legend"><% for (var i=0; i<datasets.length; i++){%><li><span style="background-color:<%=datasets[i].strokeColor%>"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
    //   };
    // })
    .filter('fromNow', function($sce){
        return function(val) {
            return moment(val).fromNow();
        };
    })
    .filter('rawHtml', ['$sce', function($sce){
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    }])
    .filter('titleCase', function(){
        return function(val) {
            return val.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        };
    })
    .filter('encodeUrl', function(){
        return function(val) {
            return val.replace(/\s+/g, '_');
        };
    })
    .filter('riverStatusClass', function(){
        return function(status) {
            if(status === 'normal')
                return  'label-success';
            else if(status === 'alert')
                return 'label-info';
            else if(status === 'warning')
                return 'label-warning';
            return 'label-danger';
        };
    })
    .config(['$routeProvider', '$locationProvider', '$disqusProvider',
        function($routeProvider, $locationProvider, $disqusProvider) {
            $disqusProvider.setShortname('mybanjirinfo');
            $routeProvider.
            when('/feeds/:param?', {
                templateUrl: 'templates/feeds.html',
                controller: 'FeedsController'
            }).
            when('/feed/:ID', {
                templateUrl: 'templates/feed.html',
                controller: 'FeedController'
            }).
            when('/riverlevels/alerts', {
                templateUrl: 'templates/riveralerts.html',
                controller: 'RiverAlertsController' 
            }).
            when('/riverlevels', {
                templateUrl: 'templates/riverlevels.html',
                controller: 'RiverLevelsController'
            }).
            when('/riverlevel/:state_code', {
                templateUrl: 'templates/riverlevel.html',
                controller: 'RiverLevelController'
            }).
            when('/dropoffpoints', {
                templateUrl: 'templates/dropoffpoints.html',
                controller: 'DropoffPointsController'
            }).
            when('/weatherforecasts', {
                templateUrl: 'templates/weatherforecasts.html',
                controller: 'WeatherForecastsController'
            }).
            when('/weatherforecast/:state_code/:selected_date?', {
                templateUrl: 'templates/weatherforecast.html',
                controller: 'WeatherForecastController'
            }).
            when('/floodedroads', {
                templateUrl: 'templates/floodedroads.html',
                controller: 'FloodedRoadsController'
            }).
            when('/floodedroad/:state_code', {
                templateUrl: 'templates/floodedroad.html',
                controller: 'FloodedRoadController'
            }).
            when('/frequencies', {
                templateUrl: 'templates/frequencies.html',
                controller: 'FrequencyController'
            }).
            when('/insta', {
                templateUrl: 'templates/insta.html',
                controller: 'InstagramController'
            }).
            otherwise({
                redirectTo: '/feeds'
            });
            $locationProvider.hashPrefix('!');
        }
    ])
    .run(function($rootScope, $location, $http, $angularCacheFactory){
        $rootScope.feeds = [];
        $rootScope.riverLevels = [{name: 'Perlis', code: 'Perlis', rivers: []},
            {name: 'Kedah', code: 'Kedah', rivers: []},
            {name: 'Pulau Pinang', code: 'Pulau Pinang', rivers: []},
            {name: 'Perak', code: 'Perak', rivers: []},
            {name: 'Selangor', code: 'Selangor', rivers: []},
            {name: 'WP Kuala Lumpur', code: 'Kuala Lumpur', rivers: []},
            {name: 'Negeri Sembilan', code: 'Negeri Sembilan', rivers: []},
            {name: 'Melaka', code: 'Melaka', rivers: []},
            {name: 'Johor', code: 'Johor', rivers: []},
            {name: 'Pahang', code: 'Pahang', rivers: []},
            {name: 'Terengganu', code: 'Terengganu', rivers: []},
            {name: 'Kelantan', code: 'Kelantan', rivers: []},
            {name: 'Sarawak', code: 'Sarawak', rivers: []},
            {name: 'Sabah', code: 'Sabah', rivers: []},
        ];
        $rootScope.weatherForecasts = [{name: 'Perlis', code: 'perlis', forecasts: {}},
            {name: 'Kedah', code: 'kedah', forecasts: {}},
            {name: 'Pulau Pinang', code: 'pulau pinang', forecasts: {}},
            {name: 'Perak', code: 'perak', forecasts: {}},
            {name: 'Selangor', code: 'selangor', forecasts: {}},
            {name: 'WP Kuala Lumpur', code: 'kuala lumpur', forecasts: {}},
            {name: 'Negeri Sembilan', code: 'negeri sembilan', forecasts: {}},
            {name: 'Melaka', code: 'melaka', forecasts: {}},
            {name: 'Johor', code: 'johor', forecasts: {}},
            {name: 'Pahang', code: 'pahang', forecasts: {}},
            {name: 'Terengganu', code: 'terengganu', forecasts: {}},
            {name: 'Kelantan', code: 'kelantan', forecasts: {}},
            {name: 'Sarawak', code: 'sarawak', forecasts: {}},
            {name: 'Sabah', code: 'sabah', forecasts: {}},
        ];
        $rootScope.floodedRoads = [{name: 'Perlis', code: '09', roads: []},
            {name: 'Kedah', code: '02', roads: []},
            {name: 'Pulau Pinang', code: '07', roads: []},
            {name: 'Perak', code: '08', roads: []},
            {name: 'Selangor', code: '10', roads: []},
            {name: 'WP Kuala Lumpur', code: '14', roads: []},
            {name: 'Negeri Sembilan', code: '05', roads: []},
            {name: 'Melaka', code: '04', roads: []},
            {name: 'Johor', code: '01', roads: []},
            {name: 'Pahang', code: '06', roads: []},
            {name: 'Terengganu', code: '11', roads: []},
            {name: 'Kelantan', code: '03', roads: []},
            {name: 'Sarawak', code: '13', roads: []},
            {name: 'Sabah', code: '12', roads: []},
            {name: 'WP Putrajaya', code: '16', roads: []},
            {name: 'WP Labuan', code: '15', roads: []},
        ];
        $rootScope.dropoffPoints = [];
        $rootScope.moment = moment;
        $rootScope.credentials = {email: '', password: ''};

        $angularCacheFactory('riverDataCache', {
            maxAge: 900000,
            cacheFlushInterval: 3600000,
            deleteOnExpire: 'aggressive'
        });

        $angularCacheFactory('floodedRoadsCache', {
            maxAge: 900000,
            cacheFlushInterval: 3600000,
            deleteOnExpire: 'aggressive'
        });

        $angularCacheFactory('weatherForecastsCache', {
            maxAge: 900000,
            cacheFlushInterval: 3600000,
            deleteOnExpire: 'aggressive'
        });
        $rootScope.updateFeeds = function() {
            $http.get('http://www.mybanjir.com/news.aspx')
                .success(function(datas){
                    $rootScope.feeds = datas;
                    $rootScope.locations = datas.map(function(data){
                        if(!data.Location)
                            return 'others'
                        return data.Location;
                    });
                })
                .error(function(){
                    // console.log()
                })
        }
        $rootScope.nl2br = function(str) {
            return str.trim().split(/\r\n|\r\n|\n|\r/g).filter(function(text){return text.trim()}).join('<br\><br\>');
        }
        $rootScope.slugify = function(str) {
            str = str.replace(/^\s+|\s+$/g, '').toLowerCase();
            var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
            var to   = "aaaaaeeeeeiiiiooooouuuunc------";
            for (var i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
            var rand = '', chars = '0123456789abcdefghijklmnopqrstuvwxyz';
            for (var i = 4; i > 0; --i) rand += chars[Math.round(Math.random() * (chars.length - 1))];
            return str + '-' + rand;
        };

        $rootScope.$on('$routeChangeSuccess', function(){
            ga('send', 'pageview', {
               'page': location.pathname + location.search  + location.hash
            });
        });
        $rootScope.updateFeeds();
    });

;(function () {
    var devtools = {open: false};
    var threshold = 160;
    var emitEvent = function (state) {
        window.dispatchEvent(new CustomEvent('devtoolschange', {
            detail: {
                open: state
            }
        }));
    };
    setInterval(function () {
        if ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtools.open) {
                emitEvent(true);
            }
            devtools.open = true;
        } else {
            if (devtools.open) {
                emitEvent(false);
            }
            devtools.open = false;
        }
    }, 500);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = devtools;
    } else {
        window.devtools = devtools;
    }
})();

window.addEventListener('devtoolschange', function (e) {
    console.log('Care to help? Fork us on github: https://github.com/zulfajuniadi/mybanjirinfo');
});
