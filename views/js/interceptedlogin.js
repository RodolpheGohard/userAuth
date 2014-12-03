var interceptedLogin = angular.module('interceptedLogin',['ngRoute','ngResource','ui.bootstrap','ontheflylogin']);

interceptedLogin.config( function($routeProvider) {
	$routeProvider
	.when('/', {
		templateUrl: 'partials/home.html'
	})
	.when('/signin', {
		templateUrl: 'partials/signin.html'
	})
	.when('/boringform', {
		templateUrl: 'partials/boringform.html'
	})
	.otherwise({redirectTo:'/'});
} );

interceptedLogin.factory('sessionWebService', function($resource){
	return $resource("/session");
});
//	interceptedLogin.factory('logoutWebService', function($resource){
//		return $resource("/logout");	
//	});

interceptedLogin.factory('refreshSession', function($rootScope,sessionWebService){

	return function refreshSession() {
		sessionWebService.get( function(user) {
			if (user.username) $rootScope.user = user;
		});
	};

} );

interceptedLogin.factory('randomWebService', function($resource) {
	return $resource('/randomstuff');
});

interceptedLogin.run( function($rootScope,refreshSession,randomWebService) {
	refreshSession();
	$rootScope.refreshSession = refreshSession;
	$rootScope.callRandom = function() {
		randomWebService.get();
	};
});

interceptedLogin.controller('BoringFormController', function( $scope, $window, $modal, randomWebService ) {
	$scope.submitForm = function() {
		var formPromise = randomWebService.get().$promise;

		formPromise.then( function() {
			$window.alert('tout roule!');
		});

	};
});

interceptedLogin.controller('ModalLoginController', function( $scope, $http, ontheflyloginConfig, $modalInstance ) {
	$scope.submit = function() {
		$http.post('login', $scope.credentials ).success( function(response) {
			console.log(response);
			$scope.$emit(ontheflyloginConfig.LOGIN_SUCCESS_EVENT, 'ok');
			$modalInstance.close( 'ok dude' );
		} ).error( function(error) {
			console.error(error);
		} );
	}
});

///**
// * Intercepte les appels qui renvoient 401, et appel au login
// */
//interceptedLogin.factory('error401Interceptor', function($log,$rootScope,$q) {
//	return {
//		'responseError': function(rejection) {
//			if (rejection.status === 401) {
//				$log.log('401 responded, needing login');
//				var deferred = $q.defer();
//				$rootScope.$broadcast( 'LOGIN_REQUIRED', deferred );
//				//return deferred.promise;
//			}
//			return $q.reject(rejection); //default behaviour for errors
//		}
//	};
//});
//interceptedLogin.config( function( $httpProvider ) {
//	$httpProvider.interceptors.push('error401Interceptor');
//});

/**
 * Ouvre la popin de login quand un reloggin est requis
 */
interceptedLogin.run( function($rootScope,$modal,ontheflyloginConfig) {
	//This boolean will make sure only one form pops at once
	var modalLoginOpened = false;
	$rootScope.$on(ontheflyloginConfig.LOGIN_REQUIRED_EVENT, function(){
		if ( !modalLoginOpened ) {
			var moudale = $modal.open({
				backdrop: 'static',
				keyboard: false,
				templateUrl: 'partials/loginBox.html',
				size: 'sm',
				//windowClass: 'jambon',
				controller: 'ModalLoginController',
				scope: $rootScope //this makes the dialog a child scope of this controller scope, and not rootScope
			});
			modalLoginOpened = true;
			moudale.result.finally( function() {
				modalLoginOpened = false;
			});
		}
	});
});
