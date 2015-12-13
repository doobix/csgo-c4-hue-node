var fs = require('fs');
var http = require('http');

var HUE_BRIDGE_IP = '';
var HUE_USER = '';
var HUE_PATH = '/api/' + HUE_USER + '/';

var lights = [];
var bombTime = null;
var currentStatus = '';
var lastBlinkTime = null;
var blinkOn = true;
var lastStrobeTime = null;
var currentStrobeLight = 1
var previousStrobeLight = null;

// Get all the lights connected to the hue bridge
http.request({
  host: HUE_BRIDGE_IP,
  path: HUE_PATH + 'groups/0'
}, function(res) {
  var lightData = '';
  res.on('data', function (data) {
    lightData += data;
  });
  res.on('end', function() {
    lightData = JSON.parse(lightData);
    lights = lightData.lights;
  });
}).end();

setInterval(checkBombStatus, 250);

function checkBombStatus() {
  fs.readFile('bomb_status', 'utf8', function(err, bombStatus) {
    if (err) throw err;

    if (bombStatus === 'planted') {
      console.log('bomb planted!');
      if (currentStatus !== 'planted') {
        changeAllLights(noLights());
        blinkOn = true;
        currentStatus = 'planted';
      }
      if (bombTime === null) {
        bombTime = Date.now();
      }
      var totalBombTime = Date.now() - bombTime;
      console.log('bomb planted for ' + totalBombTime + ' ms');

      if (totalBombTime >= 30000) {
        if (lastBlinkTime === null) {
          lastBlinkTime = Date.now() - 2000;
        }
        var elapsedBlinkTime = Date.now() - lastBlinkTime;
        if (elapsedBlinkTime >= 1000) {
          lastBlinkTime = Date.now();
          blinkOn = blinkLights(blinkOn);
        }
      } else {
        if (lastStrobeTime === null) {
          lastStrobeTime = Date.now() - 2000;
        }
        var elapsedStrobeTime = Date.now() - lastStrobeTime;
        if (elapsedStrobeTime >= 1000) {
          lastStrobeTime = Date.now();
          var strobedLights = strobeLights(lights, currentStrobeLight, previousStrobeLight);
          currentStrobeLight = strobedLights[0];
          previousStrobeLight = strobedLights[1];
        }
      }
    } else if (bombStatus === 'exploded' && currentStatus !== 'exploded') {
      console.log('bomb exploded!');
      currentStatus = 'exploded';
      changeAllLights(explodeLights());
    } else if (bombStatus === 'defused' && currentStatus !== 'defused') {
      currentStatus = 'defused';
      changeAllLights(blueLights());
    } else if (bombStatus === '' && currentStatus !== '') {
      console.log('no bomb status!');
      currentStatus = '';
      bombTime = null;
      lastBlinkTime = null;
      lastStrobeTime = null;
      changeAllLights(whiteLights());
    }
  });
}

function blinkLights() {
  if (blinkOn) {
    changeAllLights(redLights());
    return false;
  } else {
    changeAllLights(noLights());
    return true;
  }
}

function strobeLights() {
  // Turn off previous light
  if (previousStrobeLight && currentStrobeLight !== previousStrobeLight) {
    changeLight(previousStrobeLight, noLights());
    console.log('off ' + previousStrobeLight)
  }
  // Turn on current light
  previousStrobeLight = currentStrobeLight;
  changeLight(currentStrobeLight, redLights());
  if (currentStrobeLight < lights.length) {
    currentStrobeLight++;
  } else {
    currentStrobeLight = 1;
  }
  console.log('on ' + previousStrobeLight);
  return [currentStrobeLight, previousStrobeLight];
}

function changeLight(light, lightType) {
  var jsonString = JSON.stringify(lightType);
  http.request({
    host: HUE_BRIDGE_IP,
    path: HUE_PATH + 'lights/' + light + '/state',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': jsonString.length
    }
  }, function() {

  }).write(jsonString);
}

function changeAllLights(lightType) {
  var jsonString = JSON.stringify(lightType);
  http.request({
    host: HUE_BRIDGE_IP,
    path: HUE_PATH + 'groups/0/action',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': jsonString.length
    }
  }, function() {

  }).write(jsonString);
}

function redLights() {
  return {
    'on': true,
    'sat': 254,
    'bri': 254,
    'hue': 0,
    'transitiontime': 0
  }
}

function blueLights() {
  return {
    'on': true,
    'sat': 254,
    'bri': 254,
    'hue': 45000,
    'transitiontime': 0
  }
}

function explodeLights() {
  return {
    'on': true,
    'sat': 254,
    'bri': 254,
    'hue': 10000,
    'transitiontime': 0
  }
}

function whiteLights() {
  return {
    'on': true,
    'sat': 0,
    'bri': 254,
    'hue': 10000
  }
}

function noLights() {
  return {
    'on': false,
    'transitiontime': 0
  }
}
