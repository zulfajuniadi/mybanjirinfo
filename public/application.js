var app = angular.module('mybanjir', ['ngRoute', 'ngDisqus', 'ui.bootstrap', 'jmdobry.angular-cache'])

    .controller('FeedsController', function($scope, $filter, $routeParams){

        $scope.param = $routeParams.param ? $routeParams.param.split('::') : false;

        $scope.updateFeeds();

        $scope.state = 'Create';
        $scope.form = {body: '', title: '', image: ''};
        $scope.editSlug = '';
        $scope.filteredFeedsLength = $scope.feeds.length;
        $scope.filteredFeeds = [];
        $scope.currentPage = 1;
        $scope.numPerPage = 5;
        $scope.maxSize = 5;

        $scope.numPages = function () {
            return Math.ceil($scope.feeds.length / $scope.numPerPage);
        };

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

        // $scope.delete = function(feed) {
        //     $scope.reset();
        //     if(confirm('Are you sure you want to delete ' + feed.title + '?')) {
        //         $scope.feedsRef.$remove(feed.$id);
        //     }
        // }
        // $scope.edit = function(feed) {
        //     $scope.state = 'Edit';
        //     $scope.editSlug = feed.slug;
        //     $scope.form.title = feed.title;
        //     $scope.form.body = feed.body;
        //     $scope.form.image = feed.image;
        // }
        // $scope.reset = function(feed) {
        //     $scope.state = 'Create';
        //     $scope.form.title = '';
        //     $scope.form.body = '';
        //     $scope.form.image = '';
        //     $scope.editSlug = '';
        // }
        // $scope.save = function() {
        //     var template = {
        //         title: $scope.form.title,
        //         body: $scope.form.body,
        //         image: $scope.form.image,
        //         timestamp: Date.now()
        //     }
        //     if($scope.state === 'Create') {
        //         var slug = $scope.slugify($scope.form.title);
        //         $scope.feedsRef.$push($.extend(template, {
        //             slug: slug
        //         }));
        //     } else {
        //         var feed = $scope.feeds.filter(function(feed){
        //             return feed.slug === $scope.editSlug;
        //         }).pop();
        //         if(feed) {
        //             var updateData = {};
        //             updateData[feed.$id] = angular.copy($.extend(feed, template));
        //             updateData[feed.$id].$priority = 1;
        //             delete updateData[feed.$id].$id;
        //             delete updateData[feed.$id].$priority;
        //             $scope.feedsRef.$update(updateData);
        //         }
        //     }
        //     $scope.reset();
        // }
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
    .controller('RiverLevelsController', function($scope, $routeParams){

    })
    .controller('RiverLevelController', function($scope, $routeParams, $http, $angularCacheFactory){
        $scope.state = $scope.riverLevels.filter(function(state){
            return state.code === $routeParams.state_code;
        }).pop();
        if(!$scope.state.rivers.length) {
            $http.get('http://www.mybanjir.com/api/riverlevel/' + $routeParams.state_code, {
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
    // .controller('LoginController', function($scope, $routeParams){})

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
        return function(river) {
            if(river.RiverLevel <= river.AlertLevel)
                return  'label-success';
            if(river.RiverLevel <= river.WarningLevel)
                return 'label-info';
            if(river.RiverLevel <= river.DangerLevel)
                return 'label-warning';
            return 'label-danger';
        };
    })
    .filter('riverStatus', function(){
        return function(river) {
            if(river.RiverLevel <= river.AlertLevel)
                return  'Normal';
            if(river.RiverLevel <= river.WarningLevel)
                return 'Alert';
            if(river.RiverLevel <= river.DangerLevel)
                return 'Warning';
            return 'Danger';
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
            when('/riverlevels', {
                templateUrl: 'templates/riverlevels.html',
                controller: 'RiverLevelsController'
            }).
            when('/riverlevel/:state_code', {
                templateUrl: 'templates/riverlevel.html',
                controller: 'RiverLevelController'
            }).
            // when('/login', {
            //     templateUrl: 'templates/login.html',
            //     controller: 'LoginController'
            // }).
            when('/login', {
                templateUrl: 'templates/login.html',
                controller: 'LoginController'
            }).
            otherwise({
                redirectTo: '/feeds'
            });
            $locationProvider.hashPrefix('!');
        }
    ])
    .run(function($rootScope, $location, $http, $angularCacheFactory){
        $rootScope.feeds = [];
        $rootScope.riverLevels = [{name: 'Perlis', code: 'PEL', rivers: []},
            {name: 'Kedah', code: 'KDH', rivers: []},
            {name: 'Pulau Pinang', code: 'PNG', rivers: []},
            {name: 'Perak', code: 'PRK', rivers: []},
            {name: 'Selangor', code: 'SEL', rivers: []},
            {name: 'KL', code: 'WLH', rivers: []},
            {name: 'Negeri Sembilan', code: 'NSN', rivers: []},
            {name: 'Melaka', code: 'MLK', rivers: []},
            {name: 'Johor', code: 'JHR', rivers: []},
            {name: 'Pahang', code: 'PHG', rivers: []},
            {name: 'Terengganu', code: 'TRG', rivers: []},
            {name: 'Kelantan', code: 'KEL', rivers: []},
            {name: 'Sarawak', code: 'SRK', rivers: []},
            {name: 'Sabah', code: 'SAB', rivers: []},
            ];
        $rootScope.moment = moment;
        $rootScope.credentials = {email: '', password: ''};

        $angularCacheFactory('riverDataCache', {
            maxAge: 900000, // Items added to this cache expire after 15 minutes.
            cacheFlushInterval: 3600000, // This cache will clear itself every hour.
            deleteOnExpire: 'aggressive' // Items will be deleted from this cache right when they expire.
        });



        // $rootScope.login = function() {
        //     var email = $rootScope.credentials.email;
        //     var password = $rootScope.credentials.password;
        //     if(email && password) {
        //         $rootScope.ref.authWithPassword({
        //             email    : email,
        //             password : password
        //         }, function(error, authData) {
        //             if (error) {
        //                 alert('Login error');
        //             } else {
        //                 $rootScope.user = $rootScope.ref.getAuth();
        //                 $location.path('/feeds');
        //                 $rootScope.$apply();
        //             }
        //         });
        //     }
        // };
        // $rootScope.logout = function() {
        //     $rootScope.ref.unauth(function(){
        //         $rootScope.user = null;  
        //         $location.path('/feeds');
        //         $rootScope.$apply();  
        //     });
        // }
        $rootScope.updateFeeds = function() {
            $http.get('http://www.mybanjir.com/api/items')
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
        $rootScope.nl2br = function(str, is_xhtml) {
            var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>'; // Adjust comment to avoid issue on phpjs.org display
            return (str + '')
                .replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
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

        $rootScope.updateFeeds();
    });