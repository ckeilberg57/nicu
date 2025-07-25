// — Top Level Config — //
const PEX_HOST = 'cklab-edges.ck-collab-engtest.com';
const HOST_PIN = '2025';

let rtc;
let currentAlias;

// — UI Elements — //
const videoDiv = document.getElementById('videoContainer');
const localVid = document.getElementById('localVideo');
const remoteVid = document.getElementById('remoteVideo');
const btnVideo = document.getElementById('btnVideo');
const btnMic = document.getElementById('btnMic');
const btnSpeaker = document.getElementById('btnSpeaker');
const endBtn = document.getElementById('endBtn');

// — Parse patient info from clicked View Meeting — //
window.toggleVideoBox = async function (roomId) {
  const appointmentEl = document.querySelector(`li[data-room="${roomId}"]`);
  const infoText = appointmentEl.querySelector('.appointment-info').textContent;
  const match = infoText.match(/MRN:\s*(\d+)/);
  const mrn = match ? match[1] : '000000';
  const patientName = infoText.split('-')[1].trim();

  currentAlias = `nicu${mrn}${roomId}`;

  // Setup video
  document.getElementById('noObservation').style.display = 'none';
  document.querySelector('.video-wrapper').style.display = 'flex';
  document.querySelector('.controls').style.display = 'flex';

  await startConference(patientName);
};

async function startConference(displayName) {
  rtc = new PexRTC();

  rtc.onSetup = () => {
    console.log('onSetup — connecting with PIN:', HOST_PIN);
    rtc.connect(HOST_PIN);
  };

  rtc.onConnect = remoteStream => {
    console.log('onConnect — media flow established');
    remoteVid.srcObject = remoteStream;
    videoDiv.style.display = 'block';
    endBtn.disabled = false;

    btnVideo.onclick = () => {
      const vt = rtc.user_media_stream.getVideoTracks()[0];
      vt.enabled = !vt.enabled;
      btnVideo.classList.toggle('off');
      btnVideo.classList.toggle('on');
    };

    btnMic.onclick = () => {
      const at = rtc.user_media_stream.getAudioTracks()[0];
      at.enabled = !at.enabled;
      btnMic.classList.toggle('off');
      btnMic.classList.toggle('on');
    };

    btnSpeaker.onclick = () => {
      remoteVid.muted = !remoteVid.muted;
      btnSpeaker.classList.toggle('off');
      btnSpeaker.classList.toggle('on');
    };
  };

  rtc.onConferenceUpdate = status => {
    console.log('onConferenceUpdate:', status);
  };

  rtc.onError = err => {
    console.error('PexRTC error:', err);
    alert('Call error: ' + err);
    resetUI();
  };

  rtc.onDisconnect = reason => {
    console.log('[rtc.onDisconnect] Call disconnected. Reason:', reason);
    setTimeout(() => {
      console.log('[rtc.onDisconnect] Calling resetUI()...');
      resetUI();
    }, 200);
  };

  try {
    rtc.user_media_stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localVid.srcObject = rtc.user_media_stream;
    rtc.makeCall(PEX_HOST, currentAlias, displayName, null, 'video');
  } catch (err) {
    alert('Camera/microphone error: ' + err.message);
    resetUI();
  }
}

endBtn.addEventListener('click', () => {
  console.log('[endBtn] Disconnect button clicked');
  if (rtc) {
    console.log('[endBtn] Calling rtc.disconnect()...');
    rtc.disconnect();
  } else {
    console.log('[endBtn] No RTC session, calling resetUI() directly...');
    resetUI();
  }
});

function resetUI() {
  // Stop and clear local video
  if (localVid && localVid.srcObject) {
    localVid.srcObject.getTracks().forEach(track => {
      track.stop();
    });
    localVid.srcObject = null;
  }

  // Stop and clear remote video
  if (remoteVid && remoteVid.srcObject) {
    remoteVid.srcObject.getTracks().forEach(track => {
      track.stop();
    });
    remoteVid.srcObject = null;
  }

  // Hide video display elements
  const wrapper = document.querySelector('.video-wrapper');
  const controls = document.querySelector('.controls');
  if (wrapper) wrapper.style.setProperty('display', 'none', 'important');
  if (controls) controls.style.setProperty('display', 'none', 'important');

  // Show the "noObservation" message clearly
  const noObsBox = document.getElementById('noObservation');
  if (noObsBox) noObsBox.style.setProperty('display', 'block', 'important');

  // Also try blanking the video tags visually (forces repaint)
  remoteVid.srcObject = null;
  remoteVid.load();
  localVid.srcObject = null;
  localVid.load();

  // Hide any open "video-box" overlays under patients
  document.querySelectorAll('.video-box').forEach(box => {
    box.style.setProperty('display', 'none', 'important');
  });

  // Optionally force reflow to repaint
  document.body.offsetHeight; // trigger reflow
}
