
var firebaseUrl = 'https://glowing-heat-8584.firebaseio.com/data';

var app = angular.module('mybanjir', ['ngRoute', 'ngDisqus', 'ui.bootstrap'])

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
                return (new Date(a.Timestamp)).getTime() < (new Date(b.Timestamp)).getTime() ? true: false
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
    .controller('LoginController', function($scope, $routeParams){})

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
    .run(function($rootScope, $location, $http){
        $rootScope.feeds = [];
        $rootScope.moment = moment;
        $rootScope.credentials = {email: '', password: ''};
        $rootScope.login = function() {
            var email = $rootScope.credentials.email;
            var password = $rootScope.credentials.password;
            if(email && password) {
                $rootScope.ref.authWithPassword({
                    email    : email,
                    password : password
                }, function(error, authData) {
                    if (error) {
                        alert('Login error');
                    } else {
                        $rootScope.user = $rootScope.ref.getAuth();
                        $location.path('/feeds');
                        $rootScope.$apply();
                    }
                });
            }
        };
        $rootScope.logout = function() {
            $rootScope.ref.unauth(function(){
                $rootScope.user = null;  
                $location.path('/feeds');
                $rootScope.$apply();  
            });
        }
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