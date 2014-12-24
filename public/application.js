var app = angular.module('mybanjirinfo', ['ngRoute', 'ngDisqus', 'ui.bootstrap', 'firebase'])
    .controller('FeedsController', function($scope, $filter){
        $scope.state = 'Create';
        $scope.form = {body: '', title: '', image: ''};
        $scope.editSlug = '';
        $scope.filteredFeeds = [];
        $scope.currentPage = 1;
        $scope.numPerPage = 5;
        $scope.maxSize = 5;

        $scope.numPages = function () {
            return Math.ceil($scope.feedsLength / $scope.numPerPage);
        };

        $scope.setFilteredFeeds = function() {
            var begin = (($scope.currentPage - 1) * $scope.numPerPage)
            , end = begin + $scope.numPerPage;
            $scope.filteredFeeds = $scope.feeds.slice(begin, end);
        };

        $scope.$watch('currentPage + numPerPage + feeds.length', $scope.setFilteredFeeds);

        $scope.pageChanged = $scope.setFilteredFeeds;

        $scope.delete = function(feed) {
            $scope.reset();
            if(confirm('Are you sure you want to delete ' + feed.title + '?')) {
                $scope.feedsRef.$remove(feed.$id);
            }
        }
        $scope.edit = function(feed) {
            $scope.state = 'Edit';
            $scope.editSlug = feed.slug;
            $scope.form.title = feed.title;
            $scope.form.body = feed.body;
            $scope.form.image = feed.image;
        }
        $scope.reset = function(feed) {
            $scope.state = 'Create';
            $scope.form.title = '';
            $scope.form.body = '';
            $scope.form.image = '';
            $scope.editSlug = '';
        }
        $scope.save = function() {
            var template = {
                title: $scope.form.title,
                body: $scope.form.body,
                image: $scope.form.image,
                timestamp: Date.now()
            }
            if($scope.state === 'Create') {
                var slug = $scope.slugify($scope.form.title);
                $scope.feedsRef.$push($.extend(template, {
                    slug: slug
                }));
            } else {
                var feed = $scope.feeds.filter(function(feed){
                    return feed.slug === $scope.editSlug;
                }).pop();
                if(feed) {
                    var updateData = {};
                    updateData[feed.$id] = angular.copy($.extend(feed, template));
                    updateData[feed.$id].$priority = 1;
                    delete updateData[feed.$id].$id;
                    delete updateData[feed.$id].$priority;
                    $scope.feedsRef.$update(updateData);
                }
            }
            $scope.reset();
        }
    })
    .controller('FeedController', function($scope, $routeParams){
        if($routeParams.slug) {
            $scope.feed = $scope.feeds.filter(function(feed){
                return feed.slug === $routeParams.slug;
            }).pop();
        }
    })
    .config(['$routeProvider', '$locationProvider', '$disqusProvider',
        function($routeProvider, $locationProvider, $disqusProvider) {
            $disqusProvider.setShortname('mybanjirinfo');
            $routeProvider.
            when('/feeds', {
                templateUrl: 'templates/feeds.html',
                controller: 'FeedsController'
            }).
            when('/feed/:slug', {
                templateUrl: 'templates/feed.html',
                controller: 'FeedController'
            }).
            otherwise({
                redirectTo: '/feeds'
            });
            $locationProvider.hashPrefix('!');
        }
    ])
    .run(function($rootScope, $firebase){
        var ref = new Firebase("https://glowing-heat-8584.firebaseio.com/data");
        var feedsRef = ref.child("feeds");
        $rootScope.feedsRef = $firebase(feedsRef);
        $rootScope.feeds = $rootScope.feedsRef.$asArray();
        $rootScope.feedsLength = $.map(function(v){return v}).length;
        $rootScope.user = ref.getAuth();
        $rootScope.moment = moment;
        $rootScope.toggleUser = function() {
            if(ref.getAuth()) {
                ref.unauth();
                $rootScope.user = null;
            } else {
                var email = prompt('Email');
                var password = prompt('Password');
                if(email && password) {
                    ref.authWithPassword({
                        email    : email,
                        password : password
                    }, function(error, authData) {
                        if (error) {
                            console.log("Login Failed!", error);
                        } else {
                            $rootScope.user = ref.getAuth();
                            $rootScope.$apply();                }
                    });
                }
            }
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
    });