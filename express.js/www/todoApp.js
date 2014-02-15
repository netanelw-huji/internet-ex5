var app = angular.module("todoApp",['ngRoute']);


var STATUS_ACTIVE = 0;
var STATUS_COMPLETED = 1;

app.config(function ($routeProvider) {
	$routeProvider.when('/', {
		templateUrl: "login.html",
		controller: "loginCtrl"
	}).when('/list', {	
		templateUrl: "list-template.html",
		controller: "todoCtrl"
	}).when('/list/:status', {
		templateUrl: "list-template.html",
		controller: "todoCtrl"
	}).otherwise({
		redirectTo: '/'
	});
});


app.filter('todoFilter', function () {
	return function(todoList, filterBy) {
		console.log(todoList);
		var filtered = {};

		if (filterBy == "completed") {
			for(todoId in todoList) {
				if (todoList[todoId].status == Boolean(STATUS_COMPLETED))
					filtered[todoId] = todoList[todoId];
			}
		} else if (filterBy == "active") {
			for(todoId in todoList) {
				if (todoList[todoId].status == Boolean(STATUS_ACTIVE))
					filtered[todoId] = todoList[todoId];
			}
		} else {
			filtered = todoList;
		}
		return filtered;
	};
});


app.controller("loginCtrl", function($scope, $routeParams, $http, $location) {
	$scope.login = function (loginUsername, loginPassword) {
		if (!loginUsername || !loginPassword) {
			$('#loginMsg').css('display','block').html("* All fields are required.");
			return;
		}

		$http({
			url: '/login',	/* body is ignored with GET. (@moodle) */
			method: 'POST',
			data: {username: loginUsername, password: loginPassword},
			headers: {'Content-Type': 'application/json'}
		}).success( function(data, status, headers, config) {
			$location.path('/list');
		}).error( function(data, status, headers, config) {
			$('#loginMsg').css('display','block').html("* " + data.msg);
		});
	};

	$scope.register = function (registerUsername, registerPassword, registerFullname) {
		if (!registerUsername || !registerPassword || !registerFullname) {
			$('#registerMsg').css('display','block').html("* All fields are required.");
			return;
		}

		$http({
			url: '/register',
			method: 'POST',
			data: {username: registerUsername, password: registerPassword, fullname: registerFullname},
			headers: {'Content-Type': 'application/json'}
		}).success( function(data, status, headers, config) {
			$('#registerMsg').css('display','block').html("Registered successfuly! Login and discover the wonders of the ToDo app!");
		}).error( function(data, status, headers, config) {
			$('#registerMsg').css('display','block').html("* " + data.msg);
		});
	};
});



app.controller("todoCtrl", function($scope, $routeParams, $http, $location) {
	var todos; // updated in getList();
	var nextId; // ID of next todo.

	$scope.editedTodo = null;
	$scope.newTodoValue = '';
	$scope.listSize = 0; //updated in getList().

	getList();

	$scope.$watch('todos', function (newVal, oldVal) {
		calcRemainingAndCompleted();
	}, true /*compare by value*/);

	$scope.$on('$routeChangeSuccess', function () {
		if ($location.path().indexOf('/list') !== -1 && document.cookie.indexOf('sessionId') == -1) {
			redirectToLogin();
		} else {
			var status = $scope.status = $routeParams.status || '';
			if (status === 'active')
				$scope.statusFilter = "active";
			else if (status === 'completed') 
				$scope.statusFilter = "completed";
			else
				$scope.statusFilter = null;
		}
	});

	$scope.addTodo = function () {
		var newTodoValue = $scope.newTodoValue.trim();
		if (newTodoValue.length == 0) {
			return;
		}

		var scopedNextId = nextId; //accessible in this scope.

		$http({
			url: '/item',
			method: 'POST',
			data: {id: scopedNextId, value: newTodoValue, status: STATUS_ACTIVE},
			headers: {'Content-Type': 'application/json'}
		}).error( function(data, status, headers, config) {	 
			if (status == 400) {
				redirectToLogin();
			} else {
				todos[scopedNextId] = {value: newTodoValue, status: Boolean(STATUS_ACTIVE)};
				$scope.listSize++;
			}
		});
		nextId++;
		$scope.newTodoValue = '';
	};

	$scope.doneEditing = function (todoId) {
		$scope.editedTodo = null;
		todos[todoId].value = todos[todoId].value.trim();

		if (!todos[todoId].value) {
			$scope.removeTodo(todoId);
		} else {
			$http({
				url: '/item',
				method: 'PUT',
				data: {id: todoId, value: todos[todoId].value, status: +todos[todoId].status}, // '+' converts to integer 0/1
				headers: {'Content-Type': 'application/json'}
			}).error( function(data, status, headers, config) {	 
				if (status == 400) {
					redirectToLogin();
				}
			});
		}
	};

	$scope.removeTodo = function (todoId) {
		$http({
			url: '/item',
			method: 'DELETE',
			data: {id: todoId},
			headers: {'Content-Type': 'application/json'}  //for some reason, without this, the request uses text/plain..
		}).error( function(data, status, headers, config) {
			if (status == 400) {
				redirectToLogin();
			} else {
				delete todos[todoId];
				$scope.listSize--;
			}
		});
	};

	$scope.mark = function (todoId) {
		$http({
			url: '/item',
			method: 'PUT',
			data: {id: todoId, value: todos[todoId].value, status: +todos[todoId].status}, // '+' converts to integer 0/1
			headers: {'Content-Type': 'application/json'}
		}).error( function(data, status, headers, config) {	 
			if (status == 400) {
				redirectToLogin();
			}
		});
	}

	$scope.markAll = function (isAllChecked) {
		if (document.cookie.indexOf('sessionId') == -1) {
			redirectToLogin();
		} else {
			for (todoId in todos) {
				todos[todoId].status = (isAllChecked) ? Boolean(STATUS_ACTIVE) : Boolean(STATUS_COMPLETED); 
				$scope.mark(todoId);	
			}
		}
	};

	$scope.clearCompletedTodos = function () {
		$http({
			url: '/item',
			method: 'DELETE',
			data: {id: "-1"}, /* all completed */
			headers: {'Content-Type': 'application/json'} 
		}).error( function(data, status, headers, config) {
			if (status == 400) {
				redirectToLogin();
			} else {
				for (todoId in todos) {
					if(todos[todoId].status == STATUS_COMPLETED) {
						delete todos[todoId];
						$scope.listSize--;
					}
				}
			}
		});
	};

	function getList() {
		$http({
			url: '/item',
			method: 'GET'
		}).success( function(data, status, headers, config) {
			todos = $scope.todos = data;
			nextId = getMaxId() + 1;
			$scope.listSize = getTodoListSize();
			for (todoId in todos) {
				todos[todoId].status = Boolean(todos[todoId].status); //checkbox' ng-model doesn't work well with numbers. 
			}
			calcRemainingAndCompleted();
		}).error( function(data, status, headers, config) {
			todos = $scope.todos = {};
			nextId = getMaxId() + 1;
			$scope.listSize = getTodoListSize();
		});
	}

	function getMaxId() {
		if (todos === undefined) {
			return -1;
		} else {
			var maxId = -1;
			for (todoId in todos) {
				if (Number(todoId) > maxId)
					maxId = Number(todoId);
			}
			return maxId;
		}
	}

	function getTodoListSize() {
		if (todos === undefined) {
			return -1;
		} else {
			var size = 0;
			for (todoId in todos) {
				size++;
			}
			return size;
		}
	} 

	function calcRemainingAndCompleted() {
		$scope.remainingCount = 0;
		for (todoId in todos) {
			if(todos[todoId].status !== Boolean(STATUS_COMPLETED))
				$scope.remainingCount += 1;
		}
		$scope.completedCount = $scope.listSize - $scope.remainingCount;
	}

	function redirectToLogin() {
		window.alert("Session expired! Login again.");
		$location.path('/');
	}
});
