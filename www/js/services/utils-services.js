//var Base58, Base64, scrypt_module_factory = null, nacl_factory = null;

angular.module('cesium.utils.services', ['ngResource'])

.factory('UIUtils', ['$ionicLoading', '$ionicPopup', '$translate', '$q', 'ionicMaterialInk', 'ionicMaterialMotion', '$window', '$timeout',
  function($ionicLoading, $ionicPopup, $translate, $q, ionicMaterialInk, ionicMaterialMotion, $window, $timeout) {

  var loadingTextCache=null;

  function alertError(err, subtitle) {
    return $q(function(resolve, reject) {
      if (!err) {
        resolve();
        return;
      }
      $translate([err, subtitle, 'ERROR.POPUP_TITLE', 'ERROR.UNKNOWN_ERROR', 'COMMON.BTN_OK'])
      .then(function (translations) {
        var message = err.message || translations[err];
        return $ionicPopup.show({
          template: '<p>' + (message || translations['ERROR.UNKNOWN_ERROR']) + '</p>',
          title: translations['ERROR.POPUP_TITLE'],
          subTitle: translations[subtitle],
          buttons: [
            {
              text: '<b>'+translations['COMMON.BTN_OK']+'</b>',
              type: 'button-assertive',
              onTap: function(e) {
                resolve(e);
              }
            }
          ]
        });
      });
    });
  }

  function alertInfo(message, subtitle) {
    return $q(function(resolve, reject) {
      $translate([message, subtitle, 'INFO.POPUP_TITLE', 'COMMON.BTN_OK'])
      .then(function (translations) {
        return $ionicPopup.show({
          template: '<p>' + translations[message] + '</p>',
          title: translations['INFO.POPUP_TITLE'],
          subTitle: translations[subtitle],
          buttons: [
            {
              text: '<b>'+translations['COMMON.BTN_OK']+'</b>',
              type: 'button-positive',
              onTap: function(e) {
                resolve(e);
              }
            }
          ]
        });
      });
    });
  }

  function hideLoading(timeout){
    if (timeout) {
      $timeout(function(){
        $ionicLoading.hide();
      }, timeout);
    }
    else {
      $ionicLoading.hide();
    }
  }

  function showLoading() {
    if (!loadingTextCache) {
      $translate(['COMMON.LOADING'])
      .then(function(translations){
        loadingTextCache = translations['COMMON.LOADING'];
        showLoading();
      });
      return;
    }

    $ionicLoading.show({
      template: loadingTextCache
    });
  }

  function onError(msg, reject/*optional*/) {
    return function(err) {
      var fullMsg = msg;
      var subtitle;
      if (!!err && !!err.message) {
        fullMsg = err.message;
        subtitle = msg;
      }
      else if (!msg){
        fullMsg = err;
      }
      // If reject has been given, use it
      if (!!reject) {
        reject(fullMsg);
      }
      // Otherwise, log to console and display error
      else {
        console.error('>>>>>>>' , err);
        hideLoading(10); // timeout, to avoid bug on transfer (when error on reference)
        alertError(fullMsg, subtitle);
      }
    };
  }

  function selectElementText(el) {
    if (el.value || el.type == "text" || el.type == "textarea") {
      // Source: http://stackoverflow.com/questions/14995884/select-text-on-input-focus
      if ($window.getSelection && !$window.getSelection().toString()) {
        el.setSelectionRange(0, el.value.length);
      }
    }
    else {
      if (el.childNodes && el.childNodes.length > 0) {
        selectElementText(el.childNodes[0]);
      }
      else {
        // See http://www.javascriptkit.com/javatutors/copytoclipboard.shtml
        var range = $window.document.createRange(); // create new range object
        range.selectNodeContents(el); // set range to encompass desired element text
        var selection = $window.getSelection(); // get Selection object from currently user selected text
        selection.removeAllRanges(); // unselect any user selected text (if any)
        selection.addRange(range); // add range to Selection object to select it
      }
    }
  }

  function getSelectionText(){
    var selectedText = "";
    if (window.getSelection){ // all modern browsers and IE9+
        selectedText = $window.getSelection().toString();
    }
    return selectedText;
  }

  return {
    alert: {
      error: alertError,
      info: alertInfo
    },
    loading: {
      show: showLoading,
      hide: hideLoading
    },
    onError: onError,
    ink: ionicMaterialInk.displayEffect,
    motion: ionicMaterialMotion,
    selection: {
      select: selectElementText,
      get: getSelectionText
    }
  };
}])

.factory('localStorage', ['$window', function($window) {
  return {
    put: function(key, value) {
      $window.localStorage[key] = value;
    },
    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    setObject: function(key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function(key) {
      return JSON.parse($window.localStorage[key] || '{}');
    }
  };
}])

// See http://plnkr.co/edit/vJQXtsZiX4EJ6Uvw9xtG?p=preview
.factory('$focus', function($timeout, $window) {
  return function(id) {
    // timeout makes sure that it is invoked after any other event has been triggered.
    // e.g. click events that need to run before the focus or
    // inputs elements that are in a disabled state but are enabled when those events
    // are triggered.
    $timeout(function() {
      var element = $window.document.getElementById(id);
      if(element)
        element.focus();
    });
  };
})

.factory('System', function($timeout, $window, UIUtils, $translate, $ionicPopup, $cordovaClipboard, $cordovaBarcodeScanner, $q) {

  var CONST = {
    MAX_HEIGHT: 400,
    MAX_WIDTH: 400
  },
  camera = {
    enable: false
  },
  clipboard = {
    enable: false
  };

  ionic.Platform.ready(function() {
    // Check if camera AND scan is enable
	  camera.enable = !!navigator.camera;
    camera.handle = navigator.camera;

    // Check if clipboard is enable
	  clipboard.enable = camera.enable;
  });

  function resizeImageFromFile(file) {
    return $q(function(resolve, reject) {

      var reader = new FileReader();

      reader.onload = function(event){
        var img = document.createElement("img");

        img.onload = function(event) {
          var width = event.target.width;
          var height = event.target.height;

          if (width > height) {
            if (width > CONST.MAX_WIDTH) {
              height *= CONST.MAX_WIDTH / width;
              width = CONST.MAX_WIDTH;
            }
          } else {
            if (height > CONST.MAX_HEIGHT) {
              width *= CONST.MAX_HEIGHT / height;
              height = CONST.MAX_HEIGHT;
            }
          }
          var canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(event.target, 0, 0,  canvas.width, canvas.height);

          var dataurl = canvas.toDataURL();

          resolve(dataurl);
        };

        img.src = event.target.result;
      };

      if (file) {
        reader.readAsDataURL(file);
      }
      else {
        //reject("Not a file");
      }
    });
  }

  camera.takePicture = function(sourceType) {
    return $q(function (resolve, reject) {
      if (!camera.enable) {
        reject('Camera not enable. Please check [system.camera.enable] before use.');
        return;
      }
      if (!sourceType) {
        $translate(['SYSTEM.PICTURE_CHOOSE_TYPE', 'SYSTEM.BTN_PICTURE_GALLERY', 'SYSTEM.BTN_PICTURE_CAMERA'])
        .then(function(translations){
          $ionicPopup.show({
            title: translations['SYSTEM.PICTURE_CHOOSE_TYPE'],
            buttons: [
              {
                text: translations['SYSTEM.BTN_PICTURE_GALLERY'],
                type: 'button',
                onTap: function(e) {
                  return navigator.camera.PictureSourceType.PHOTOLIBRARY;
                }
              },
              {
                text: translations['SYSTEM.BTN_PICTURE_CAMERA'],
                type: 'button button-positive',
                onTap: function(e) {
                  return navigator.camera.PictureSourceType.CAMERA;
                }
              }
            ]
          })
          .then(function(sourceType){
            camera.takePicture(sourceType);
          });
        });
      }
      else {
        var options = {
            quality: 50,
            destinationType: navigator.camera.DestinationType.DATA_URL,
            sourceType: sourceType,
            encodingType: navigator.camera.EncodingType.PNG,
            targetWidth : CONST.MAX_WIDTH,
            targetHeight : CONST.MAX_HEIGHT
        };
        camera.handle.camera.getPicture(
          function (imageData) {resolve(imageData);},
          function(err){reject(err);},
          options
        );
      }
    });
  };

  camera.scan = function () {
    return $q(function(resolve,reject){
      if (!scan.enable) {
        reject('Camera not enable. Please check [system.camera.enable] before use.');
        return;
      }
      $cordovaBarcodeScanner.scan()
      .then(function(result) {
        if (!result.cancelled) {
          resolve(result);
        }
        else {
          resolve();
        }
      },
      function(error) {reject(error);});
    });
  };

  clipboard.copy = function (text, callback) {
    if (!clipboard.enable) {
      return; // Always to call copy, but do nothing if not available
    }
    $cordovaClipboard
      .copy(text)
      .then(function () {
        // success
        if (callback) {
          callback();
        }
        else {
          console.log("Copy text to clipboard: " + text);
        }
      }, function () {
        // error
        UIUtils.alert.error('ERROR.COPY_CLIPBOARD');
      });
  };

  return {
    image: {
      resize: resizeImageFromFile
    },
    clipboard: clipboard,
    camera: camera
  };
})

.service('ModalService', function($ionicModal, $rootScope, $q, $controllers) {

  var show = function(tpl, $scope) {

    var promise;
    $scope = $scope || $rootScope.$new();

    promise = $q(function(resolve, reject){
      $ionicModal.fromTemplateUrl(tpl, {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function(modal) {
        $scope.modal = modal;
        $scope.modal.show();
      });
    });

     $scope.openModal = function() {
       $scope.modal.show();
     };
     $scope.closeModal = function(result) {
       $scope.modal.hide();
       resolve(result);
     };
     $scope.$on('$destroy', function() {
       $scope.modal.remove();
     });

    return promise;
  };

  return {
    show: show
  };

})



.directive('eventFocus', function(focus) {
  return function(scope, elem, attr) {
    elem.on(attr.eventFocus, function() {
      focus(attr.eventFocusId);
    });

    // Removes bound events in the element itself
    // when the scope is destroyed
    scope.$on('$destroy', function() {
      elem.off(attr.eventFocus);
    });
  };
})


;
