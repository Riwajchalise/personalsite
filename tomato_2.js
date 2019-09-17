/*
 * 		tomato.js  -	 timer / keyboard shortcuts
 * 		Copyright (c) 2010 Pratik Desai (desai@pratyk.com)
 */

/**
 * extend Storage (localstorage) to also parse arrays and objects
 */
Storage.prototype.setObj = function(key, obj) {
  return this.setItem(key, JSON.stringify(obj))
}
Storage.prototype.getObj = function(key) {
  return JSON.parse(this.getItem(key))
}

/**
|--------------------------------------------------
| helpers
|--------------------------------------------------
*/

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

/**
|--------------------------------------------------
| state
|--------------------------------------------------
*/

var paramet = {};
var timerState = {
  current: undefined,
  startTime: undefined,
  isRunning: false,
  description: '',
  id: undefined,
  trackerIsOpen: false,
}

var tickFunction = function (timer, time_in_seconds, formatted_time) {
  var timerSetting = localStorage.getItem("showTimerInTitle");
  if (timerSetting === 'true') {
    document.title = '(' + formatted_time + ')' + ' TomatoTimer';
  }
}

var defaultSettings = {
  buzzer: function () {
    // custom buzz functions
    document.title = 'Buzzzzz!';
    buzzer();
    logTimer();
    autoStartTimers();
    addTrackerModalContent();
  },
  tick: tickFunction
}

/**
|--------------------------------------------------
| app
|--------------------------------------------------
*/

function toggleSetting(checkbox, setting) {
  var thisCheck = $(checkbox)[0];
  if (thisCheck.checked) {
    localStorage.setItem(setting, true);
  } else {
    localStorage.setItem(setting, false);
  }
}

function setState(ctx, key, val) {
  if (key) {
    ctx[key] = val;
  }
}

function setCurrent(newCurrent, isRunning) {
  setState(timerState, 'current', newCurrent);
  setState(timerState, 'startTime', moment());
  setState(timerState, 'isRunning', isRunning);
  setState(timerState, 'id', uuidv4())
}

/**
 * log the current timer, start and stop time
 */

function logTimer() {
  if (timerState.isRunning) {
    var stopTime = moment();
    var currentLocalStorageLog = localStorage.getObj('timerLog');

    var newLogObject = Object.assign({}, timerState, {
      stopTime,
    });

    currentLocalStorageLog.push(newLogObject);

    localStorage.setObj('timerLog', currentLocalStorageLog);

    if (timerState.current === 'pomodoro') {
      // if it was a pomodoro, also add this to current pomodoro goal
      var donePomodoros = parseInt(localStorage.getItem('pomodoros_done_today'), 10);
      localStorage.setItem('pomodoros_done_today', donePomodoros + 1);
    }
  }
}


function setTimerAndStart(type) {
  return function () {
    setCurrent(type, true);
    toggleButtons(type);

    $("#timer_default").createTimer(Object.assign({
      time_in_seconds: parseInt(paramet[type]),
      autostart: true,
    }, defaultSettings));
  }
}

/**
 * auto timer sequence
 */

var sequence = [
  'pomodoro',
  'short_break',
  'pomodoro',
  'short_break',
  'pomodoro',
  'short_break',
  'pomodoro',
  'long_break',
];

var currentSequenceIndex = 1;

function autoStartTimers() {
  if (!getLocalStorageBool('autoStartSequence')) {
    return;
  }

  var currentSequenceType = sequence[currentSequenceIndex];

  toggleButtons(currentSequenceType);
  setCurrent(currentSequenceType, true);

  $("#timer_default").createTimer(Object.assign({
    time_in_seconds: parseInt(paramet[currentSequenceType]),
    autostart: true,
  }, defaultSettings));

  if (currentSequenceType === 'long_break') {
    currentSequenceIndex = 0; // reset to the first pomodoro
  } else {
    currentSequenceIndex += 1;
  }
}


/**
 * tracker modal content
 */

function addTrackerModalContent() {
  /**
   * show goal pomodoros the user has entered
   */
  var pomodoroGoal = localStorage.getItem('pomodoro_goal');
  var pomodoroGoalNumber = parseInt(pomodoroGoal, 10);
  console.log('adding tracker ontent', pomodoroGoalNumber);
  if (pomodoroGoalNumber) {

    if (parseInt(localStorage.getItem('pomodoros_done_today'), 10)) {
      // clear disabled button state
      $("#pomodoroGoalClear").removeClass('disabled');
      $("#pomodoroGoalClear").prop('disabled', false);
    } else {
      // add disabled button state
      $("#pomodoroGoalClear").addClass('disabled');
      $("#pomodoroGoalClear").prop('disabled', true);
    }

    // fill out circles
    var amountArray = new Array(pomodoroGoalNumber);
    var pomodoroGoalHTML = '';
    var donePomodoros = parseInt(localStorage.getItem('pomodoros_done_today'), 10);

    for (var i = 1; i <= pomodoroGoalNumber; i++) {
      var className = 'pom-goal-circle';
      if (i <= donePomodoros) {
        className += ' pom-goal-circle-full';
      }
      pomodoroGoalHTML +='<div class="'+ className+ '"></div>';
    }

    $('#tracker-goal-pomodoros').html(pomodoroGoalHTML);
  } else {
    $('#tracker-goal-pomodoros').html('no goals set!');
    $("#pomodoroGoalClear").addClass('disabled');
    $("#pomodoroGoalClear").prop('disabled', true);
  }

  /**
   * tracker modal content
   */
  var logLine = localStorage.getObj('timerLog');
  if (logLine && logLine.length > 0) {
    // remove disabled state from log button
    $("#pomodoroTimerClear").removeClass('disabled');
    $("#pomodoroTimerClear").prop('disabled', false);

    var logLineHTML = logLine
    .map(function (item) {
      var readableStartTime = moment(item.startTime).format("dddd, MMMM Do YYYY, h:mm:ss a");
      var readableStopTime = moment(item.stopTime).format("dddd, MMMM Do YYYY, h:mm:ss a");

      var inner = "<td>" + item.current + "</td>"
        + "<td>" + readableStartTime + "</td>"
        + "<td>" + readableStopTime + "</td>"
        + "<td><input type='text' class='log-description' value='" + item.description + "' data-id='" + item.id + "'/></td>";

      return "<tr>" + inner + "</tr>";
    });


    var timerLogHTML = "<tr>"
    + "<th>Session</th>"
    + "<th>Start time</th>"
    + "<th>End time</th>"
    + "<th>Description</th>"
    + "</tr>"
    + logLineHTML;

    $("#tracker-time-list").html(timerLogHTML);
  } else {
    $("#tracker-time-list").html('nothing logged yet');
    $("#pomodoroTimerClear").addClass('disabled');
    $("#pomodoroTimerClear").prop('disabled', true);
  }

  // bind change events again
  $('.log-description').change(logDescriptionChange);
}


/**
|--------------------------------------------------
| jquery event handling
|--------------------------------------------------
*/

$(function () {
  setCurrent('pomodoro');
  loadSettings();
  updateTimers();
  addTrackerModalContent();

  /**
   * user settings
   */

  $('#checkBoxTimerIndication').click(function() {
    toggleSetting(this, 'showTimerInTitle');
  })

  $('#checkBoxNotifications').click(function () {
    toggleSetting(this, 'browserNotifications');
  })

  $('#checkBoxAutoStartSequence').click(function () {
    toggleSetting(this, 'autoStartSequence');
  })

  $('#pomodoro_goal').on('change', function (e) {
    localStorage.setItem('pomodoro_goal', e.target.value);
    addTrackerModalContent();
  })


  $("#timer_default").createTimer(Object.assign({
      time_in_seconds: parseInt(paramet[timerState.current]),
    }, defaultSettings));

  // chrome intermittent NaN on refresh workaround
  setTimeout(function() {
    $("#timer_default").resetTimer(Object.assign({
      time_in_seconds: parseInt(paramet[timerState.current])
    }, defaultSettings));
    //$("#timer_start, #timer_pause, #timer_reset").prop('disabled', false);
  }, 200);

  $("#pomodoro").click(setTimerAndStart('pomodoro'));
  $("#short_break").click(setTimerAndStart('short_break'));
  $("#long_break").click(setTimerAndStart('long_break'));

  $("#timer_start").click(function () {
    setCurrent(timerState.current, true);
    $("#timer_default").startTimer(defaultSettings);
  });

  $("#timer_pause").click(function () {
    setCurrent(timerState.current, false);
    if ($("#timer_default").data('countdown.state') == 'running') {
      $("#timer_default").pauseTimer();
    }
  });
  $("#timer_reset").click(function () {
    setCurrent(timerState.current, false);
    $("#timer_default").resetTimer(Object.assign({
      time_in_seconds: parseInt(paramet[timerState.current])
    }, defaultSettings));
  });

  /**
   * tracker input change handling.
   */

  $('.log-description').change(logDescriptionChange);

  // TODO clear log button
});

/**
|--------------------------------------------------
| keyboard event handling
|--------------------------------------------------
*/

$(document).keydown(function (e) {
  if (e.which == 80 && e.altKey) {
    //ALT+P -- Pomodoro
    setTimerAndStart('pomodoro')();
  }
  if (e.which == 83 && e.altKey) {
    //ALT+S -- Short Break
    setTimerAndStart('short_break')();
  }
  if (e.which == 76 && e.altKey) {
    //ALT+L -- Long Break
    setTimerAndStart('long_break')();
  }
  if (e.which == 82 && e.altKey) {
    //ALT+R -- Reset Timer
    setCurrent(timerState.current, false);
    $("#timer_default").resetTimer(Object.assign({
      time_in_seconds: parseInt(paramet[timerState.current])
    }, defaultSettings));
    return false;
    }
  if (e.which == 32 && ! e.altKey) {
    //SPACE -- Start/Stop Timer
    if (timerState.isRunning) {
      $("#timer_default").pauseTimer(defaultSettings);
      setCurrent(timerState.current, false);
    }
    else {
      $("#timer_default").startTimer(defaultSettings);
      setCurrent(timerState.current, true);
    }
    return true;
  }
});


/**
|--------------------------------------------------
|  ui, localstorage, document
|--------------------------------------------------
*/


function logDescriptionChange(e) {
  var id = $(this).data('id')
  var log = localStorage.getObj('timerLog');
  log.find(function (item) {
    if (item.id === id) {
      item.description = e.target.value;
    }
  });
  localStorage.setObj('timerLog', log);
}

function clearPomodoroLog() {
  localStorage.setObj('timerLog', []);
  addTrackerModalContent();
}

function clearPomodoroGoalTracker() {
  localStorage.setItem('pomodoros_done_today', 0);
  addTrackerModalContent();
}

function toggleButtons(active) {
  $("#timer_selection button").removeClass('active');
  $("#" + active).addClass('active');
}

function updateTimers() {
  pom1 = localStorage.getItem("pomodoro") * 60;

  if (pom1 == 3600) {
    pom = 3599;
  } else {
    pom = pom1;
  }

  paramet = {
    pomodoro: pom,
    short_break: localStorage.getItem("shortbreak") * 60,
    long_break: localStorage.getItem("longbreak") * 60
  };

  $("#timer_default").resetTimer({
    time_in_seconds: parseInt(paramet[timerState.current])
  });
}

function loadSettings() {
  if (localStorage["pomflag"] != 1 && localStorage["pomflag"] != 2) {
    localStorage.setItem("pomodoro", 25);
    localStorage.setItem("shortbreak", 5);
    localStorage.setItem("longbreak", 10);
    localStorage.setItem("pomflag", 1);
    localStorage.setItem("alertoption","alarmwatch");
    localStorage.setItem("volumeoption",0.5);
  }
  if ( localStorage["pomflag"] != 2) {
    localStorage.setItem("pomflag", 2);
    localStorage.setItem("showTimerInTitle", true);
    localStorage.setItem("browserNotifications", true);
    localStorage.setItem("autoStartSequence", false);
    localStorage.setItem("pomodoro_goal", 1);
    localStorage.setItem("pomodoros_done_today", 0);
    localStorage.setObj("timerLog", []);
  }

  $("#alertoption").val(localStorage.getItem("alertoption"));
  $("#volume").val(localStorage.getItem("volumeoption"));
  $("#time_pomodoro").val(localStorage.getItem("pomodoro"));
  $("#time_shortbreak").val(localStorage.getItem("shortbreak"));
  $("#time_longbreak").val(localStorage.getItem("longbreak"));

  $("#pomodoro_goal").val(localStorage.getItem("pomodoro_goal"));

  var timerIndicationValue = getLocalStorageBool("showTimerInTitle");
  var notificationsValue = getLocalStorageBool("browserNotifications");
  var autoStartValue = getLocalStorageBool("autoStartSequence");

  $("#checkBoxTimerIndication").prop('checked', timerIndicationValue);
  $("#checkBoxNotifications").prop('checked', notificationsValue);
  $("#checkBoxAutoStartSequence").prop('checked', autoStartValue);
}

function getLocalStorageBool(item) {
  return localStorage.getItem(item) === 'true' || localStorage.getItem(item) === true
}

function toggleTimerIndicationInTitle(value) {
  localStorage.setItem("showTimerInTitle", value);
}

function toggleBrowserNotifications(value) {
  localStorage.setItem("browserNotifications", value);
}
