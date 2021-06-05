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
var meetingResponse;
var attendeeResponse;
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
        meetingResponse = JSON.parse(this.responseText);
        const response = JSON.parse(this.responseText);

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
    let userMeetingId =  document.getElementById('meeting-id').value.trim();
    let attendeeName = document.getElementById('attendee-name').value.trim();

    payload['meeting_id'] = userMeetingId;
    payload['attendee_name'] = attendeeName;

    console.log(payload);

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        attendeeResponse = JSON.parse(this.responseText);
        const response = JSON.parse(this.responseText);
        console.log(response);

        if (this.status === 201) {
            attendeeId = response.Attendee.AttendeeId;
            joinToken = response.Attendee.joinToken;
            updateEvents('Attendee added ' + attendeeId);

            createSession();
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

    const configuration = new ChimeSDK.MeetingSessionConfiguration(meetingResponse, attendeeResponse);

    // In the usage examples below, you will use this meetingSession object.
    meetingSession = new ChimeSDK.DefaultMeetingSession(
        configuration,
        logger,
        deviceController
    );

    listAudioVideoDevices();
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
    // // Setup Video Output Device
    const videoInputDeviceInfo = videoInputDevices[0];
    await meetingSession.audioVideo.chooseVideoInputDevice(
        videoInputDeviceInfo.deviceId
    );

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

async function joinMeeting() {
    // Use case 4. 
    // Add a device change observer to receive the updated device list. 
    // For example, when you pair Bluetooth headsets with your computer, audioInputsChanged and audioOutputsChanged are 
    // called with the device list including headsets.
    const observer1 = {
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

    meetingSession.audioVideo.addDeviceChangeObserver(observer1);


    const observer2 = {
        audioVideoDidStart: () => {
            updateEvents('Started');
        }
    };


    const audioElement = document.getElementById('micro-phone-audio');
    // meetingSession.audioVideo.bindAudioElement(audioElement);

    meetingSession.audioVideo.bindAudioElement(audioElement);
    meetingSession.audioVideo.addObserver(observer2);
    meetingSession.audioVideo.start();

    /*

    // Use case 6. Add an observer to receive session lifecycle events: connecting, start, and stop.
    const observer1 = {
        audioVideoDidStart: () => {
            console.log('Started');
        },
        audioVideoDidStop: sessionStatus => {
            // See the "Stopping a session" section for details.
            console.log('Stopped with a session status code: ', sessionStatus.statusCode());
        },
        audioVideoDidStartConnecting: reconnecting => {
            if (reconnecting) {
                // e.g. the WiFi connection is dropped.
                console.log('Attempting to reconnect');
            }
        }
    };

    meetingSession.audioVideo.addObserver(observer1);

    //   Use case 7. Mute and unmute an audio input.
    // Mute
    meetingSession.audioVideo.realtimeMuteLocalAudio();

    // Unmute
    const unmuted = meetingSession.audioVideo.realtimeUnmuteLocalAudio();
    if (unmuted) {
        console.log('Other attendees can hear your audio');
    } else {
        // See the realtimeSetCanUnmuteLocalAudio use case below.
        console.log('You cannot unmute yourself');
    }

    // Use case 8. To check whether the local microphone is muted, use this method rather than keeping track of your own mute state.
    const muted = meetingSession.audioVideo.realtimeIsLocalAudioMuted();
    if (muted) {
        console.log('You are muted');
    } else {
        console.log('Other attendees can hear your audio');
    }
    */
}