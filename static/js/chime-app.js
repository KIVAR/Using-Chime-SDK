// UI Elements
let createMeetingBtn = document.getElementById('create-meeting-btn');
let addAttendeeBtn = document.getElementById('add-attendee-btn');
let leaveMeetingBtn = document.getElementById('leave-meeting-btn');
let showVideoTilesBtn = document.getElementById('show-video-tiles-btn');

let eventsList = document.getElementById('events');

let microPhone = document.getElementById('microphone-icon');
let speaker = document.getElementById('speaker-icon');
let localVideo = document.getElementById('video-icon');
const localVideoTile = document.getElementById('local-video-tile');

let meetingAlertsMsg = document.getElementById('meeting-alerts-msg');

const vt1 = document.getElementById('video-tile-1');
const vt2 = document.getElementById('video-tile-2');
const vt3 = document.getElementById('video-tile-3');
const vt4 = document.getElementById('video-tile-4');
const vt5 = document.getElementById('video-tile-5');
const vt6 = document.getElementById('video-tile-6');
const vt7 = document.getElementById('video-tile-7');
const vt8 = document.getElementById('video-tile-8');
const vt9 = document.getElementById('video-tile-9');
const vt10 = document.getElementById('video-tile-10');
const vt11 = document.getElementById('video-tile-11');
const vt12 = document.getElementById('video-tile-12');
const vt13 = document.getElementById('video-tile-13');
const vt14 = document.getElementById('video-tile-14');
const vt15 = document.getElementById('video-tile-15');
const vt16 = document.getElementById('video-tile-16');

// Event Listeners
createMeetingBtn.addEventListener('click', createMeeting);
addAttendeeBtn.addEventListener('click', addAttendee);
leaveMeetingBtn.addEventListener('click', leaveSession);
showVideoTilesBtn.addEventListener('click', showVideoTiles);

microPhone.addEventListener('click', muteUnmuteMicrophone);
localVideo.addEventListener('click', shareStopLocalVideo);

audioInputDevicesGroup = document.getElementById('audio-input-devices');
audioInputDevicesGroup.addEventListener('click', useCurrentlySelectedAudioInputDevice);

audioOutputDevicesGroup = document.getElementById('audio-output-devices');
audioOutputDevicesGroup.addEventListener('click', useCurrentlySelectedAudioOutputDevice);

var meetingId;
var attendeeId;
var joinToken;
var meeting = {};
var attendee = {};
var meetingSession;

var audioDeviceId = 0;
var showVideoTilesFlag = false;

var audioInputDevices, audioOutputDevices, videoInputDevices;
var localVideoCurrentlyShared = false;

/**
 * Create a Meeting
 */
function createMeeting() {
    setMeetingAlertsMsg('', 'normal');

    const xhr = new XMLHttpRequest();
    let url = "https://xectwc6i27.execute-api.us-east-2.amazonaws.com/prod/create-meeting";

    let payload = {};
    let meetingName = document.getElementById('meeting-name').value.trim();
    payload['meeting_name'] = meetingName;
    console.log(payload);

    if (meetingName.trim().length === 0) {
        setMeetingAlertsMsg('Enter a valid meeting name', 'failure');
        return;
    }

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', idToken);
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        response = JSON.parse(this.responseText);
        meeting = response;

        if (this.status === 200) {
            meetingId = response.Meeting.MeetingId;
            setMeetingAlertsMsg('Meeting created ' + meetingId, 'success');
        } else {
            setMeetingAlertsMsg(response);
        }
    };

    xhr.onerror = function() {
        setMeetingAlertsMsg(`Network Error`);
      };
}

/**
 * Add an Attendee
 */
function addAttendee() {
    setMeetingAlertsMsg('', 'normal');

    const xhr = new XMLHttpRequest();
    let url = "https://xectwc6i27.execute-api.us-east-2.amazonaws.com/prod/add-attendee";

    let payload = {};
    let attendeeMeetingName = document.getElementById('attendee-meeting-name').value.trim();
    let attendeeName = document.getElementById('attendee-name').value.trim();

    if (attendeeMeetingName.trim().length === 0 || attendeeName.trim().length === 0) {
        setMeetingAlertsMsg('Enter Meeting name & Attendee name', 'failure');
        return;
    }

    payload['attendee_meeting_name'] = attendeeMeetingName;
    payload['attendee_name'] = attendeeName;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', idToken);
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        if (this.status === 200) {
            response = JSON.parse(this.responseText);
            meeting = response.meeting;
            attendee = response.attendee.Attendee;

            attendeeId = attendee.AttendeeId;
            joinToken = attendee.joinToken;
            setMeetingAlertsMsg('Attendee added ', 'success');

            document.getElementById('audio-input-devices-block').style.display = 'block';
            document.getElementById('audio-output-devices-block').style.display = 'block';
            document.getElementById('video-input-devices-block').style.display = 'block';
            document.getElementById('events-block').style.display = 'inline-block';
            joinMeeting();
        } else {
            setMeetingAlertsMsg(this.responseText, 'failure');
        }
    };

    xhr.onerror = function() {
        setMeetingAlertsMsg(`Network Error`);
      };
}

function updateEvents(msg) {
    eventsList.innerText = msg;
}

async function joinMeeting() {
    createSession();

    const observer2 = {
        audioVideoDidStart: () => {
            updateEvents('Audio, Video started');
        }
    };

    const audioElement = document.getElementById('micro-phone-audio');
    meetingSession.audioVideo.bindAudioElement(audioElement);
    meetingSession.audioVideo.addObserver(observer2);
    meetingSession.audioVideo.start();
}

async function createSession() {
    const logger = new ChimeSDK.ConsoleLogger('MyLogger', ChimeSDK.LogLevel.INFO);
    const deviceController = new ChimeSDK.DefaultDeviceController(logger);

    const configuration = new ChimeSDK.MeetingSessionConfiguration(meeting, attendee);

    // In the usage examples below, you will use this meetingSession object.
    meetingSession = new ChimeSDK.DefaultMeetingSession(
        configuration,
        logger,
        deviceController
    );

    // Mute Audio initially
    meetingSession.audioVideo.realtimeMuteLocalAudio();

    await setupAudioVideoDevices();

    // Use case #23
    // Subscribe to attendee presence changes
    subscribeToAttendeePresenceChanges();

    // Use case #6
    // Observe session lifecycle events - connecting/start/stop
    observeSessionLifeCycleChanges();

    // Use case #4
    // Add a device change observer to receive the updated device list.
    // For example, when you pair Bluetooth headsets with your computer, audioInputsChanged and 
    // audioOutputsChanged are called with the device list including headsets.
    monitorChangeInDevices();

    // Watch upto 16 video tiles
    videoMultipleAttendeeVideos();

    // Usecase #28
    // If Meeting is stooped for any reason.
    setupMeetingStoppedObserver();
}


/**
 * Add an observer to receive session lifecycle events: connecting, start, and stop.
 */
function observeSessionLifeCycleChanges() {
    const observer = {
        audioVideoDidStart: () => {
            updateEvents('Meeting session started');
        },
        audioVideoDidStop: sessionStatus => {
            // See the "Stopping a session" section for details.
            updateEvents('Meetign session stopped with a session status code: ', sessionStatus.statusCode());
        },
        audioVideoDidStartConnecting: reconnecting => {
            if (reconnecting) {
                // e.g. the WiFi connection is dropped.
                updateEvents('Attempting to reconnect');
            }
        }
    };

    meetingSession.audioVideo.addObserver(observer);
}

/**
 * Subscribe to attendee presence changes. 
 * When an attendee joins or leaves a session, the callback receives presentAttendeeId
 * and present (a boolean).
 */
function subscribeToAttendeePresenceChanges() {
    const attendeePresenceSet = new Set();
    const callback = (presentAttendeeId, present) => {
        updateEvents(`Attendee ID: ${presentAttendeeId} Present: ${present}`);
        if (present) {
            attendeePresenceSet.add(presentAttendeeId);
        } else {
            attendeePresenceSet.delete(presentAttendeeId);
        }
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
}

function removeChildren(id) {
    while (document.getElementById(id).childNodes.length > 0) {
        document.getElementById(id).childNodes.forEach(node => node.remove());
    }
}

/**
 * Initial list of Audio, Video Devices
 */
async function setupAudioVideoDevices() {
    audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();

    // Audio Input Devices
    removeChildren('audio-input-devices');

    audioInputDevices.forEach((device, index) => {
        let radio = createRadioButton('AudioInput', 'audio-input-' + index, index, index === 0 ? true : false, `${device.label}`);
        document.getElementById('audio-input-devices').appendChild(radio);
    });

    // Audio Output Devices
    removeChildren('audio-output-devices');

    audioOutputDevices.forEach((device, index) => {
        let radio = createRadioButton('AudioOutput', 'audio-output-' + index, index, index === 0 ? true : false, `${device.label}`);
        document.getElementById('audio-output-devices').appendChild(radio);
    });

    // Video Input Devices
    removeChildren('video-input-devices');

    videoInputDevices.forEach((device, index) => {
        let radio = createRadioButton('VideoInupt', 'video-input-' + index, index, index === 0 ? true : false, `${device.label}`);
        document.getElementById('video-input-devices').appendChild(radio);
    });

    // Setup Audio Input Device
    if (audioInputDevices.length > 0) {
        const audioInputDeviceInfo = audioInputDevices[0];
        const firstAudioInputDevice = audioInputDeviceInfo.deviceId;
        await meetingSession.audioVideo.chooseAudioInputDevice(firstAudioInputDevice);
    }

    // Setup Audio Output Device
    if (audioOutputDevices.length > 0) {
        const audioOutputDeviceInfo = audioOutputDevices[0];
        const firstAudioOutputDevice = audioOutputDeviceInfo.deviceId;
        await meetingSession.audioVideo.chooseAudioOutputDevice(firstAudioOutputDevice);
    }
}

function shareStopLocalVideo() {
    // If video is currently shared, stop it.
    if (localVideoCurrentlyShared) {
        localVideoCurrentlyShared = false;
        localVideo.className = 'fas fa-video-slash mr-1 fa-2x';
        stopSharingLocalVideo();
        document.getElementById('self-video-area').style.display = 'none';
    } else {
        // oterhwise, start the video.
        localVideoCurrentlyShared = true;
        localVideo.className = 'fas fa-video mr-1 fa-2x';
        shareLocalVideo();
        document.getElementById('self-video-area').style.display = 'block';
    }
}

/**
 * Share local video
 */
async function shareLocalVideo() {
    // Setup Video Input Device
    videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();
    const videoInputDeviceInfo = videoInputDevices[0];

    if (videoInputDeviceInfo !== undefined && videoInputDeviceInfo !== null) {
        const firstVideoDeviceId = videoInputDeviceInfo.deviceId;
        // The camera LED light will turn on indicating that it is now capturing.
        await meetingSession.audioVideo.chooseVideoInputDevice(firstVideoDeviceId);
    }

    // Use case 13. Start sharing your video.
    const videoObserver = {
        // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
        videoTileDidUpdate: tileState => {
            // Ignore a tile without attendee ID and other attendee's tile.
            if (!tileState.boundAttendeeId || !tileState.localTile) {
                return;
            }

            meetingSession.audioVideo.bindVideoElement(tileState.tileId, localVideoTile);
        }
    };

    meetingSession.audioVideo.addObserver(videoObserver);
    meetingSession.audioVideo.startLocalVideoTile();
}

/**
 * Stop sharing local video
 */
function stopSharingLocalVideo() {
    let localTileId = null;

    const observer = {
        videoTileDidUpdate: tileState => {
            // Ignore a tile without attendee ID and other attendee's tile.
            if (!tileState.boundAttendeeId || !tileState.localTile) {
                return;
            }

            // videoTileDidUpdate is also invoked when you call startLocalVideoTile or tileState changes.
            // The tileState.active can be false in poor Internet connection, when the user paused the video tile, or when the video tile first arrived.
            updateEvents(`If you called stopLocalVideoTile, ${tileState.active} is false.`);
            meetingSession.audioVideo.bindVideoElement(tileState.tileId, localVideoTile);
            localTileId = tileState.tileId;
        },
        videoTileWasRemoved: tileId => {
            if (localTileId === tileId) {
                updateEvents(`You called removeLocalVideoTile. videoElement can be bound to another tile.`);
                localTileId = null;
            }
        }
    };

    meetingSession.audioVideo.addObserver(observer);
    meetingSession.audioVideo.stopLocalVideoTile();

    // Optional: You can remove the local tile from the session.
    // meetingSession.audioVideo.removeLocalVideoTile();
}

/**
 * Add a device change observer to receive the updated device list. 
 * For example, when you pair Bluetooth headsets with your computer, audioInputsChanged and audioOutputsChanged are 
 * called with the device list including headsets.
 */
function monitorChangeInDevices() {
    const observer = {
        audioInputsChanged: freshAudioInputDeviceList => {
            removeChildren('audio-input-devices');

            // An array of MediaDeviceInfo objects
            freshAudioInputDeviceList.forEach((mediaDeviceInfo, index) => {
                let radio = createRadioButton('AudioInput', 'audio-input-' + index, index, index === 0 ? true : false, `${mediaDeviceInfo.label}`);
                document.getElementById('audio-input-devices').appendChild(radio);
            });
        },

        audioOutputsChanged: freshAudioOutputDeviceList => {
            removeChildren('audio-output-devices');

            freshAudioOutputDeviceList.forEach((mediaDeviceInfo, index) => {
                let radio = createRadioButton('AudioOutput', 'audio-output-' + index, index, index === 0 ? true : false, `${mediaDeviceInfo.label}`);
                document.getElementById('audio-output-devices').appendChild(radio);
            });
        },

        videoInputsChanged: freshVideoInputDeviceList => {
            updateEvents('Video inputs updated: ', freshVideoInputDeviceList);
        }
    };

    meetingSession.audioVideo.addDeviceChangeObserver(observer);
}


/**
 * Mute/Unmute microphone
 */
async function muteUnmuteMicrophone() {
    const muted = meetingSession.audioVideo.realtimeIsLocalAudioMuted();
    if (muted) {
        updateEvents('You are muted');
        meetingSession.audioVideo.realtimeUnmuteLocalAudio();
        updateEvents('Others can listen to you!');

        microPhone.className = "fas fa-microphone mr-1 fa-2x";

        audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();

        // Setup Audio Input Device
        const audioInputDeviceInfo = audioInputDevices[0];
        const firstAudioInputDevice = audioInputDeviceInfo.deviceId;
        await meetingSession.audioVideo.chooseAudioInputDevice(firstAudioInputDevice);

        const audioElement = document.getElementById('micro-phone-audio');
        meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
        updateEvents('Other attendees can hear your audio');
        meetingSession.audioVideo.realtimeMuteLocalAudio();
        updateEvents('You are muted');

        microPhone.className = "fas fa-microphone-slash mr-1 fa-2x";
    }
}

async function useCurrentlySelectedAudioInputDevice(e) {
    let index = e.target.getAttribute('index');
    updateEvents(`Audio Input ${index}`);
    let audioDeviceId = parseInt(index);

    $("input:radio[value=index][name='AudioInput']").prop('checked', true);

    audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    const audioInputDeviceInfo = audioInputDevices[audioDeviceId];
    const firstAudioInputDevice = audioInputDeviceInfo.deviceId;
    await meetingSession.audioVideo.chooseAudioInputDevice(firstAudioInputDevice);
}

async function useCurrentlySelectedAudioOutputDevice(e) {
    let index = e.target.getAttribute('index');
    updateEvents(`Audio Output ${index}`);
    $("input:radio[value=index][name='AudioOutput']").prop('checked', true);
    let audioDeviceId = parseInt(index);

    audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    const audioOutputDeviceInfo = audioOutputDevices[audioDeviceId];
    const AudioOutputDevice = audioOutputDeviceInfo.deviceId;
    await meetingSession.audioVideo.chooseAudioOutputDevice(AudioOutputDevice);
}

/**
 * View up to 16 attendee videos. Assume that you have 16 video elements in your application, 
 * and that an empty cell means it's taken.
 * 
 * 
 * No one is sharing video               e.g. 9 attendee videos (9 empty cells)
 *
 * Next available:                       Next available:
 * videoElements[0]                      videoElements[7]
 * ╔════╦════╦════╦════╗                 ╔════╦════╦════╦════╗
 * ║  0 ║  1 ║  2 ║  3 ║                 ║    ║    ║    ║    ║
 * ╠════╬════╬════╬════╣                 ╠════╬════╬════╬════╣
 * ║  4 ║  5 ║  6 ║  7 ║                 ║    ║    ║    ║  7 ║
 * ╠════╬════╬════╬════╣                 ╠════╬════╬════╬════╣
 * ║  8 ║  9 ║ 10 ║ 11 ║                 ║  8 ║    ║ 10 ║    ║
 * ╠════╬════╬════╬════╣                 ╠════╬════╬════╬════╣
 * ║ 12 ║ 13 ║ 14 ║ 15 ║                 ║ 12 ║ 13 ║ 14 ║ 15 ║
 * ╚════╩════╩════╩════╝                 ╚════╩════╩════╩════╝
 */
function videoMultipleAttendeeVideos() {
    const videoElements = [vt1, vt2, vt3, vt4, vt5, vt6, vt7, vt8, vt9, vt10, vt11, vt12, vt13, vt14, vt15, vt16];

    // index-tileId pairs
    const indexMap = {};

    const acquireVideoElement = tileId => {
        // Return the same video element if already bound.
        for (let i = 0; i < 16; i += 1) {
            if (indexMap[i] === tileId) {
                return videoElements[i];
            }
        }
        // Return the next available video element.
        for (let i = 0; i < 16; i += 1) {
            if (!indexMap.hasOwnProperty(i)) {
                indexMap[i] = tileId;
                return videoElements[i];
            }
        }
        throw new Error('no video element is available');
    };

    const releaseVideoElement = tileId => {
        for (let i = 0; i < 16; i += 1) {
            if (indexMap[i] === tileId) {
                delete indexMap[i];
                return;
            }
        }
    };

    const observer = {
        // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
        videoTileDidUpdate: tileState => {
            // Ignore a tile without attendee ID, a local tile (your video), and a content share.
            if (!tileState.boundAttendeeId || tileState.localTile || tileState.isContent) {
                return;
            }

            meetingSession.audioVideo.bindVideoElement(
                tileState.tileId,
                acquireVideoElement(tileState.tileId)
            );
        },
        videoTileWasRemoved: tileId => {
            releaseVideoElement(tileId);
        }
    };

    meetingSession.audioVideo.addObserver(observer);
}

/**
 * Creates Radio Buttons for Audio Input/Output and Video Input Devices.
 * @param {*} group 
 * @param {*} id 
 * @param {*} value 
 * @param {*} checked 
 * @param {*} labelText 
 * @returns 
 */
function createRadioButton(group, id, value, checked, labelText) {
    let div = document.createElement('div');
    div.className = 'form-check';

    let input = document.createElement('input');
    input.className = 'form-check-input';
    input.type = 'radio';
    input.name = group;
    input.id = id;
    input.value = value;
    input.checked = checked;
    input.setAttribute('index', value);

    let label = document.createElement('label');
    label.className = 'form-check-label';
    label.for = id;
    label.textContent = labelText;
    label.setAttribute('index', value);

    div.append(input, label);
    return div;
}

/**
 * Writes a message
 * @param {*} msg 
 * @param {*} type 
 */
function setMeetingAlertsMsg(msg, type) {
    meetingAlertsMsg.innerText = msg;

    switch (type) {
        case 'success':
            meetingAlertsMsg.className = 'alert alert-success';
            break;

        case 'normal':
            meetingAlertsMsg.className = '';
            break;

        case 'failure':
            meetingAlertsMsg.className = 'alert alert-danger';
            break;
    }
}

/**
 * This method sets up an observer that is called whenever the meeting is stopped. 
 *      - You (or someone else) have called the DeleteMeeting API action in your server application.
 *      - You attempted to join a deleted meeting.
 *      - No audio connections are present in the meeting for more than five minutes.
 *      - Fewer than two audio connections are present in the meeting for more than 30 minutes.
 *      - Screen share viewer connections are inactive for more than 30 minutes.
 *      - The meeting time exceeds 24 hours.
 */
function setupMeetingStoppedObserver() {
    const observer = {
        audioVideoDidStop: sessionStatus => {
            const sessionStatusCode = sessionStatus.statusCode();
            if (sessionStatusCode === MeetingSessionStatusCode.MeetingEnded) {
                updateEvents('The session has ended');
            } else {
                updateEvents('Stopped with a session status code: ', sessionStatusCode);
            }
        }
    };

    meetingSession.audioVideo.addObserver(observer);
}

function leaveSession() {
    const observer = {
        audioVideoDidStop: sessionStatus => {
            const sessionStatusCode = sessionStatus.statusCode();
            if (sessionStatusCode === MeetingSessionStatusCode.Left) {
                /*
                  - You called meetingSession.audioVideo.stop().
                  - When closing a browser window or page, Chime SDK attempts to leave the session.
                */
                updateEvents('You left the session');
            } else {
                updateEvents('Stopped with a session status code: ', sessionStatusCode);
            }
        }
    };

    if (meetingSession !== null && meetingSession !== undefined) {
        meetingSession.audioVideo.addObserver(observer);
        meetingSession.audioVideo.stop();
    }
}

function generateAlerts() {
    const observer = {
        connectionDidBecomePoor: () => {
          updateEvents('Your connection is poor');
        },
        connectionDidSuggestStopVideo: () => {
            updateEvents('Recommend turning off your video');
        },
        videoSendDidBecomeUnavailable: () => {
          // Chime SDK allows a total of 16 simultaneous videos per meeting.
          // If you try to share more video, this method will be called.
          // See videoAvailabilityDidChange below to find out when it becomes available.
          updateEvents('You cannot share your video');
        },
        videoAvailabilityDidChange: videoAvailability => {
          // canStartLocalVideo will also be true if you are already sharing your video.
          if (videoAvailability.canStartLocalVideo) {
            updateEvents('You can share your video');
          } else {
            updateEvents('You cannot share your video');
          }
        }
      };
      
      meetingSession.audioVideo.addObserver(observer);
}

function showVideoTiles() {
    showVideoTilesFlag = !showVideoTilesFlag;

    if (showVideoTilesFlag) {
        document.getElementById('video-tiles-16').style.display = 'block';
    } else {
        document.getElementById('video-tiles-16').style.display = 'none';
    }
}