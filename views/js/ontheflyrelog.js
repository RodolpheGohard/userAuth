(function(){
	'use strict';

	/**
	 * onthefly module intercepts 401 response on $http calls (which is the underlying mechanisms of $resouce),
	 * and put them on hold.
	 * 
	 * onthefly will broadcast "event:loginRequired" on $rootScope when a 401 is encountered.
	 * 
	 * Once you took care of authenticating your user. You can notify onthefly with 'event:loginSuccess' and
	 * all calls on hold will be replayed automatically.
	 */
	var relogModule = angular.module('ontheflylogin',[]);

	/**
	 * You can configure ontheflylogin with the following properties
	 * <code>
	 * {
	 *		MAX_CALLS_QUEUED: 10, //once this limit for calls on hold is reached, further calls will be ignored
	 *		LOGIN_SUCCESS_EVENT: 'event:loginSuccess', //the name of the event to listen for playing back calls
	 *		LOGIN_REQUIRED_EVENT: 'event:loginRequired' //the name of the event ontheflylogin will broadcast when 401 is encountered
	 * }
	 * </code>
	 */
	relogModule.constant( 'ontheflyloginConfig', {
		MAX_CALLS_QUEUED: 10,
		LOGIN_SUCCESS_EVENT: 'event:loginSuccess',
		LOGIN_REQUIRED_EVENT: 'event:loginRequired'
	} );
	
	relogModule.constant( 'pipePromiseToDeferred', function(promise,deferred) {
		promise.then( function(result) {
			return deferred.resolve(result);
		});
		promise.catch( function(result) {
			return deferred.reject(result);
		});
	} );
	
	relogModule.factory( 'serviceCallsWaitingForLogin', function( $log, ontheflyloginConfig ) {
		var callsList = [];
		callsList.push = function( item ) {
			if ( callsList.length >= ontheflyloginConfig.MAX_CALLS_QUEUED ) {
				$log.console.warn('Max ServiceCalls waiting list reached(10). Ignoring further calls' + item.rejection.config.url);
			}
			return Array.prototype.push.apply( this, arguments );
		};
		return callsList;
	});

	relogModule.factory('error401Interceptor', function(
		$rootScope,
		$q,
		$log,
		$injector,
		serviceCallsWaitingForLogin,
		pipePromiseToDeferred,
		ontheflyloginConfig
	) {
		//for 401s
		$rootScope.$on( ontheflyloginConfig.LOGIN_SUCCESS_EVENT, function( ev, payload ) {
			$injector.invoke( function($http) {
				_.forEach( serviceCallsWaitingForLogin, function( serviceCallWaitingForLogin, i ) {
					var config = angular.extend( {replayed: true}, serviceCallWaitingForLogin.rejection.config );
					var newCallPromise = $http( config );
					pipePromiseToDeferred( newCallPromise, serviceCallWaitingForLogin.deffered );
				});
				serviceCallsWaitingForLogin.length = 0;
			} );
		});

		return {
			'responseError': function(rejection) {
				if (rejection.status === 401) {
					$log.log('401 responded, needing login');
					$rootScope.$broadcast( ontheflyloginConfig.LOGIN_REQUIRED_EVENT );
					var deferred = $q.defer();
					var serviceCallWaitingForLogin = {
						deffered: deferred,
						rejection: rejection
					};
					serviceCallsWaitingForLogin.push( serviceCallWaitingForLogin );
					return deferred.promise;
				}
				return $q.reject(rejection);
			}
		};
	});

	relogModule.config( function( $httpProvider ) {
		$httpProvider.interceptors.push('error401Interceptor');
	});

})();
