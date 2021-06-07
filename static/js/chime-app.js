// UI Elements
let createMeetingBtn = document.getElementById('create-meeting-btn');
let addAttendeeBtn = document.getElementById('add-attendee-btn');
let joinMeetingBtn = document.getElementById('join-meeting-btn');
let eventsList = document.getElementById('events');

let microPhone = document.getElementById('microphone-icon');
let speaker = document.getElementById('speaker-icon');
let localVideo = document.getElementById('video-icon');
const localVideoTile = document.getElementById('local-video-tile');

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
joinMeetingBtn.addEventListener('click', joinMeeting);

microPhone.addEventListener('click', muteUnmuteMicrophone);
localVideo.addEventListener('click', shareStopLocalVideo);

var meetingId;
var attendeeId;
var joinToken;
var meeting = {};
var attendee = {};
var meetingSession;

var audioInputDevices, audioOutputDevices, videoInputDevices;
var localVideoCurrentlyShared = false;

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
    let attendeeMeetingName = document.getElementById('attendee-meeting-name').value.trim();
    let attendeeName = document.getElementById('attendee-name').value.trim();

    payload['attendee_meeting_name'] = attendeeMeetingName;
    payload['attendee_name'] = attendeeName;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));

    xhr.onload = function () {
        response = JSON.parse(this.responseText);
        console.log(response);
        meeting = response.meeting;
        attendee = response.attendee.Attendee;

        if (this.status === 201) {
            attendeeId = attendee.AttendeeId;
            joinToken = attendee.joinToken;
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



async function setupAudioVideoDevices() {
    audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();

    // Setup Audio Input Device
    const audioInputDeviceInfo = audioInputDevices[0];
    const firstAudioInputDevice = audioInputDeviceInfo.deviceId;
    await meetingSession.audioVideo.chooseAudioInputDevice(firstAudioInputDevice);

    // Setup Audio Output Device
    const audioOutputDeviceInfo = audioOutputDevices[0];
    const firstAudioOutputDevice = audioOutputDeviceInfo.deviceId;
    await meetingSession.audioVideo.chooseAudioOutputDevice(firstAudioOutputDevice);
}

function shareStopLocalVideo() {
    // If video is currently shared, stop it.
    if (localVideoCurrentlyShared) {
        localVideoCurrentlyShared = false;
        localVideo.className = 'fas fa-video-slash mr-1 fa-2x';
        stopSharingLocalVideo();
    } else {
        // oterhwise, start the video.
        localVideoCurrentlyShared = true;
        localVideo.className = 'fas fa-video mr-1 fa-2x';
        shareLocalVideo();
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