/* Copyright (C) 2014 Jaguar Land Rover - All Rights Reserved
 *
 * Proprietary and confidential
 * Unauthorized copying of this file, via any medium, is strictly prohibited
 *
 * THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY
 * KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
 * PARTICULAR PURPOSE.
*/

var _callbacks = {};
var _nextReplyId = 0;

var _status_listeners = {};
var _status_listener_id = 0;

function postMessage(msg, callback) {
	var replyId = _nextReplyId++;
	_callbacks[replyId] = callback;
	msg.replyId = replyId;
	extension.postMessage(JSON.stringify(msg));
}

var sendSyncMessage = function(msg) {
	return JSON.parse(extension.internal.sendSyncMessage(JSON.stringify(msg)));
};

extension.setMessageListener(function(msg) {
	var m = JSON.parse(msg);
  	var replyId = m.replyId;
  	var callback = _callbacks[replyId];

  	if (m.cmd === 'signal') {
    		if (!m.signal_name) {
      			console.error('Invalid signal from Camera API');
      			return;
    		}

    		if (m.signal_name === 'CameraServerStatusChanged' || m.signal_name === 'CameraStatusChanged') {
      			handleStatusChange(m);
    		}
  	} 
	else if (!isNaN(parseInt(replyId)) && (typeof(callback) === 'function')) {
  		callback(m);
    		delete m.replyId;
    		delete _callbacks[replyId];
  	} 
	else {
    		console.error('Invalid replyId from Cameras API: ' + replyId);
  	}
});

function handleStatusChange(msg) 
{
	for (var key in _status_listeners) {
    		var cb = _status_listeners[key];
    		if (!cb || typeof(cb) !== 'function') {
      			console.error('No listener object found for id ' + key);
      			throw new tizen.WebAPIException(tizen.WebAPIException.UNKNOWN_ERR);
    		}
    		cb(msg.cam_id, msg.status);
  	}
}

exports.subscribe = function(name, listener) {
  	var msg = { cmd: 'subscribe', name: name };
  	postMessage(msg, function(result) {
    		if (result.error) {
      			console.error('subscribe failed');
      			throw new tizen.WebAPIException(tizen.WebAPIException.UNKNOWN_ERR);
    		}

		if (!(listener instanceof Function) && listener != undefined)
    			throw new tizen.WebAPIException(tizen.WebAPIException.TYPE_MISMATCH_ERR);

		_status_listeners[++_status_listener_id]=listener;
  	});
};

exports.startCameraStreamingServer = function(cam_id, port) {
	var msg = { cmd: 'start_camera_streaming_server', cam_id: cam_id, port: port };
	postMessage(msg, function(result) {
    		if (result.error) {
      			console.error('start of streaming server failed');
      			throw new tizen.WebAPIException(tizen.WebAPIException.UNKNOWN_ERR);
    		}

		if (result.value != undefined) {
      			return result.value;
	});
	return null;
};

exports.stopCameraStreamingServer = function(cam_id) {
	var msg = { cmd: 'stop_camera_streaming_server', cam_id: cam_id };
	postMessage(msg, function(result) {
    		if (result.error) {
      			console.error('stopping of streaming server failed');
      			throw new tizen.WebAPIException(tizen.WebAPIException.UNKNOWN_ERR);
    		}
	});

};

exports.getCameraStatus = function(cam_id) {
	var result = sendSyncMessage({ cmd: 'ActiveCall' });
  	if (result.error) {
    		console.error('getCamerStatus failed');
    		throw new tizen.WebAPIException(tizen.WebAPIException.UNKNOWN_ERR);
  	}

  	if (result.value != undefined) {
    		return result.value;
  	}	
  	return null;
};

