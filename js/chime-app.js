// UI Elements
let createMeetingBtn = document.getElementById('create-meeting-btn');
let addAttendeeBtn = document.getElementById('add-attendee-btn');
let joinMeetingBtn = document.getElementById('join-meeting-btn');
let eventsList = document.getElementById('events');

let microPhone = document.getElementById('microphone-icon');
let speaker = document.getElementById('speaker-icon');
let video = document.getElementById('video-icon');

// Event Listeners
createMeetingBtn.addEventListener('click', createMeeting);
addAttendeeBtn.addEventListener('click', addAttendee);
joinMeetingBtn.addEventListener('click', joinMeeting);

microPhone.addEventListener('click', enableAudioInput);
speaker.addEventListener('click', enableAudioOutput);
video.addEventListener('click', enableVideoInput);

var meetingId;
var attendeeId;
var joinToken;
var meeting = {};
var attendee = {};
var meetingSession;

var audioInputDevices, audioOutputDevices, videoInputDevices;

/**
 * Create a Meeting
 */
function createMeeting() {
    const xhr = new XMLHttpRequest();
    let url = "http://localhost:5000/create-meeting";

    let payload = {};
    let meetingName = document.getElementById('meeting-name').value.trim();
    payload['meeting_name'] = meetingName;
    console.log(payload);

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        response = JSON.parse(this.responseText);
        meeting = response;

        if (this.status === 201) {
            meetingId = response.Meeting.MeetingId;
            updateEvents('Meeting created ' + meetingId);
        } else {
            updateEvents(response);
        }
    };
}

/**
 * Add an Attendee
 */
function addAttendee() {
    const xhr = new XMLHttpRequest();
    let url = "http://localhost:5000/add-attendee";

    let payload = {};
    let userMeetingId = document.getElementById('meeting-id').value.trim();
    let attendeeName = document.getElementById('attendee-name').value.trim();

    payload['meeting_id'] = userMeetingId;
    payload['attendee_name'] = attendeeName;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        response = JSON.parse(this.responseText);
        attendee = response;

        if (this.status === 201) {
            attendeeId = response.Attendee.AttendeeId;
            joinToken = response.Attendee.joinToken;
            updateEvents('Attendee added ' + attendeeId);
        } else {
            updateEvents(response);
        }
    };
}

function updateEvents(msg) {
    let listElement = document.createElement('li');
    listElement.textContent = msg;
    eventsList.appendChild(listElement);
}

function createSession() {
    const logger = new ChimeSDK.ConsoleLogger('MyLogger', ChimeSDK.LogLevel.INFO);
    const deviceController = new ChimeSDK.DefaultDeviceController(logger);

    const configuration = new ChimeSDK.MeetingSessionConfiguration(meeting, attendee);

    // In the usage examples below, you will use this meetingSession object.
    meetingSession = new ChimeSDK.DefaultMeetingSession(
        configuration,
        logger,
        deviceController
    );

    listAudioVideoDevices();

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


async function listAudioVideoDevices() {
    audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();

    // An array of MediaDeviceInfo objects
    audioInputDevices.forEach(mediaDeviceInfo => {
        updateEvents(`Device ID: ${mediaDeviceInfo.deviceId} Microphone: ${mediaDeviceInfo.label}`);
    });

    // An array of MediaDeviceInfo objects
    audioOutputDevices.forEach(mediaDeviceInfo => {
        updateEvents(`Device ID: ${mediaDeviceInfo.deviceId} Microphone: ${mediaDeviceInfo.label}`);
    });

    // An array of MediaDeviceInfo objects
    videoInputDevices.forEach(mediaDeviceInfo => {
        updateEvents(`Device ID: ${mediaDeviceInfo.deviceId} Microphone: ${mediaDeviceInfo.label}`);
    });
}

async function enableAudioInput() {
    // Setup Audio Input Device
    const audioInputDeviceInfo = audioInputDevices[0];
    await meetingSession.audioVideo.chooseAudioInputDevice(
        audioInputDeviceInfo.deviceId
    );
}

async function enableAudioOutput() {
    // Setup Audio Output Device
    const audioOutputDeviceInfo = audioOutputDevices[0];
    await meetingSession.audioVideo.chooseAudioOutputDevice(
        audioOutputDeviceInfo.deviceId
    );
}

async function enableVideoInput() {
    // Setup Video Input Device
    const videoInputDeviceInfo = videoInputDevices[0];

    if (videoInputDeviceInfo !== undefined && videoInputDeviceInfo !== null) {
        await meetingSession.audioVideo.chooseVideoInputDevice(
            videoInputDeviceInfo.deviceId
        );
    }

    // Use case 13. Start sharing your video.
    const videoElement = document.getElementById('chime-video');

    const videoObserver = {
        // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
        videoTileDidUpdate: tileState => {
            // Ignore a tile without attendee ID and other attendee's tile.
            if (!tileState.boundAttendeeId || !tileState.localTile) {
                return;
            }

            meetingSession.audioVideo.bindVideoElement(tileState.tileId, videoElement);
        }
    };

    meetingSession.audioVideo.addObserver(videoObserver);
    meetingSession.audioVideo.startLocalVideoTile();
}

/**
 * Add a device change observer to receive the updated device list. 
 * For example, when you pair Bluetooth headsets with your computer, audioInputsChanged and audioOutputsChanged are 
 * called with the device list including headsets.
 */
function monitorChangeInDevices() {
    const observer = {
        audioInputsChanged: freshAudioInputDeviceList => {
            // An array of MediaDeviceInfo objects
            freshAudioInputDeviceList.forEach(mediaDeviceInfo => {
                updateEvents(`Device ID: ${mediaDeviceInfo.deviceId} Microphone: ${mediaDeviceInfo.label}`);
            });
        },
        audioOutputsChanged: freshAudioOutputDeviceList => {
            updateEvents('Audio outputs updated: ', freshAudioOutputDeviceList);
        },
        videoInputsChanged: freshVideoInputDeviceList => {
            updateEvents('Video inputs updated: ', freshVideoInputDeviceList);
        }
    };

    meetingSession.audioVideo.addDeviceChangeObserver(observer);
}

async function joinMeeting() {
    createSession();

    const observer2 = {
        audioVideoDidStart: () => {
            updateEvents('Audio, Video started');
        }
    };

    const audioElement = document.getElementById('micro-phone-audio');
    // meetingSession.audioVideo.bindAudioElement(audioElement);

    meetingSession.audioVideo.bindAudioElement(audioElement);
    meetingSession.audioVideo.addObserver(observer2);
    meetingSession.audioVideo.start();
}