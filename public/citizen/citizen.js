async function sendSOS() {
  const btn = document.getElementById('sosBtn');
  const status = document.getElementById('status');

  btn.disabled = true;
  status.textContent = 'Getting your location...';

  if (!navigator.geolocation) {
    status.textContent = 'Location not supported on this device.';
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    status.textContent = 'Sending alert...';

    try {
      const victimCount = parseInt(document.getElementById('victimCount').value) || 1;
      const vulnerability = document.getElementById('vulnerability').value;

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, message: 'Citizen SOS', victimCount, vulnerability })
      });
      const data = await res.json();
      status.textContent = `Alert sent! ID #${data.id} — help is on the way.`;
    } catch (err) {
      await queueSOS({ lat, lng, message: 'Citizen SOS', victimCount, vulnerability });
      status.textContent = 'No connection — alert queued and will send automatically once you\'re back online.';
    }

    btn.disabled = false;
  }, (err) => {
    status.textContent = 'Location access denied. Cannot send precise SOS.';
    btn.disabled = false;
  });
}

async function loadAnnouncements() {
  const container = document.getElementById('announcements');
  try {
    const res = await fetch('/api/announcements');
    const announcements = await res.json();

    if (announcements.length === 0) {
      container.innerHTML = '<p style="color:#888">No announcements yet.</p>';
      return;
    }

    container.innerHTML = announcements.map(a => `
      <div class="announcement">
        <strong>${a.title}</strong>
        <p>${a.body}</p>
        <div class="time">${new Date(a.created_at).toLocaleString()}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:red">Failed to load announcements.</p>';
  }
}

loadAnnouncements();

let selectedHazard = 'other';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hazard-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hazard-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedHazard = btn.dataset.hazard;
    });
  });
});

function compressImage(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image')) return resolve(file); // skip video, compress photos only

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function submitReport() {
  const status = document.getElementById('reportStatus');
  const fileInput = document.getElementById('mediaFile');
  const description = document.getElementById('reportDescription').value;

  if (!fileInput.files[0]) {
    status.textContent = 'Please select a photo or video.';
    return;
  }

  if (!navigator.geolocation) {
    status.textContent = 'Location not supported on this device.';
    return;
  }

  status.textContent = 'Getting your location...';

  navigator.geolocation.getCurrentPosition(async (position) => {
    status.textContent = 'Uploading...';

    const rawFile = fileInput.files[0];
    const finalFile = await compressImage(rawFile);

    const formData = new FormData();
    formData.append('media', finalFile);
    formData.append('lat', position.coords.latitude);
    formData.append('lng', position.coords.longitude);
    formData.append('description', description);
    formData.append('hazardType', selectedHazard);

    try {
      const res = await fetch('/api/photo-reports', { method: 'POST', body: formData });
      const data = await res.json();
      status.textContent = `Report #${data.id} submitted. Thank you.`;
      fileInput.value = '';
      document.getElementById('reportDescription').value = '';
    } catch (err) {
      status.textContent = 'Failed to submit — check your connection.';
    }
  }, () => {
    status.textContent = 'Location access denied. Cannot submit report.';
  });
}

const citizenSocket = io();

citizenSocket.on('smsSimulated', (data) => {
  showCitizenAlert(data);
});
citizenSocket.on('newAnnouncement', () => {
  loadAnnouncements();
});


function showCitizenAlert(data) {
  const banner = document.getElementById('citizen-alert-banner');
  if (!banner) return;

  banner.innerHTML = `
    <div style="background:#e74c3c; color:#fff; padding:16px 20px; margin: 12px 24px; border-radius:10px; font-family:'Space Grotesk',sans-serif;">
      <strong style="font-size:13px; letter-spacing:1px;">📱 EMERGENCY ALERT — ${data.zoneName}</strong>
      <div style="margin-top:8px; font-size:14px;">${data.smsText}</div>
    </div>
  `;
}

async function submitLostFound() {
  const status = document.getElementById('lfStatus');
  const reportType = document.getElementById('lfType').value;
  const name = document.getElementById('lfName').value.trim();
  const description = document.getElementById('lfDescription').value.trim();
  const contactInfo = document.getElementById('lfContact').value.trim();
  const fileInput = document.getElementById('lfMedia');

  if (!name) {
    status.textContent = 'Please enter a name or description.';
    return;
  }

  status.textContent = 'Submitting...';

  const formData = new FormData();
  formData.append('reportType', reportType);
  formData.append('name', name);
  formData.append('description', description);
  formData.append('contactInfo', contactInfo);
  if (fileInput.files[0]) formData.append('media', fileInput.files[0]);

  navigator.geolocation.getCurrentPosition(async (position) => {
    formData.append('lat', position.coords.latitude);
    formData.append('lng', position.coords.longitude);
    await postLostFound(formData, status);
  }, async () => {
    await postLostFound(formData, status);
  });
}

async function postLostFound(formData, status) {
  try {
    const res = await fetch('/api/lost-found', { method: 'POST', body: formData });
    const data = await res.json();
    status.textContent = `Report #${data.id} submitted.`;
    document.getElementById('lfName').value = '';
    document.getElementById('lfDescription').value = '';
    document.getElementById('lfContact').value = '';
    document.getElementById('lfMedia').value = '';
  } catch (err) {
    status.textContent = 'Failed to submit — check your connection.';
  }
}

let lostFoundData = [];

async function loadLostFoundList() {
  const res = await fetch('/api/lost-found');
  lostFoundData = await res.json();
  renderLostFoundList();
}

function renderLostFoundList() {
  const container = document.getElementById('lostFoundList');
  const search = document.getElementById('lfSearch').value.toLowerCase();

  const filtered = lostFoundData.filter(e => e.name.toLowerCase().includes(search));

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#7fa08c">No entries found.</p>';
    return;
  }

  container.innerHTML = filtered.map(e => `
    <div class="announcement" style="opacity:${e.status === 'found' ? '0.5' : '1'};">
      <strong>${e.status === 'found' ? '✓ FOUND — ' : ''}${e.report_type === 'person' ? '🧍' : '📦'} ${e.name}</strong>
      <p>${e.description || ''}</p>
      ${e.photo_url ? `<img src="${e.photo_url}" style="max-width:150px; border-radius:8px; margin-top:6px;">` : ''}
      ${e.contact_info ? `<div class="time">Contact: ${e.contact_info}</div>` : ''}
      <div class="time">${new Date(e.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

citizenSocket.on('newLostFound', () => loadLostFoundList());
citizenSocket.on('lostFoundStatusUpdate', () => loadLostFoundList());
loadLostFoundList();