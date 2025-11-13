const ticketForm = document.getElementById('ticket-form');
const ticketError = document.getElementById('ticket-error');
const ticketResultCard = document.getElementById('ticket-result-card');
const ticketSummary = document.getElementById('ticket-summary');

const reservationForm = document.getElementById('reservation-form');
const reservationError = document.getElementById('reservation-error');
const reservationSuccess = document.getElementById('reservation-success');

function formatTicketType(type) {
  if (type === 'vip') return 'Jegy + vacsora';
  return 'Normál jegy';
}

async function createTicket(e) {
  e.preventDefault();
  ticketError.textContent = '';
  ticketResultCard.style.display = 'none';
  ticketSummary.innerHTML = '';
  const qrcodeContainer = document.getElementById('qrcode');
  qrcodeContainer.innerHTML = '';

  const formData = new FormData(ticketForm);
  const payload = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    ticket_type: formData.get('ticket_type'),
    quantity: formData.get('quantity')
  };

  if (!payload.name || !payload.email) {
    ticketError.textContent = 'Kérlek, tölts ki minden kötelező mezőt.';
    return;
  }

  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      ticketError.textContent = data.error || 'Ismeretlen hiba történt.';
      return;
    }

    ticketResultCard.style.display = 'block';
    ticketSummary.innerHTML = `
      <p><strong>Név:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Jegytípus:</strong> ${formatTicketType(data.ticket_type)}</p>
      <p><strong>Mennyiség:</strong> ${data.quantity} db</p>
      <p><strong>Összeg:</strong> ${data.total_price} Ft</p>
      <p><strong>Jegykód:</strong> <code>${data.code}</code></p>
    `;

    const verifyUrl = `${window.location.origin}/verify/${data.code}`;
    new QRCode(qrcodeContainer, {
      text: verifyUrl,
      width: 160,
      height: 160
    });

    ticketForm.reset();
  } catch (err) {
    console.error(err);
    ticketError.textContent = 'Nem sikerült csatlakozni a szerverhez.';
  }
}

async function createReservation(e) {
  e.preventDefault();
  reservationError.textContent = '';
  reservationSuccess.textContent = '';

  const formData = new FormData(reservationForm);
  const payload = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim(),
    guests: formData.get('guests'),
    notes: formData.get('notes').trim()
  };

  if (!payload.name || !payload.email || !payload.guests) {
    reservationError.textContent = 'Kérlek, tölts ki minden kötelező mezőt.';
    return;
  }

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      reservationError.textContent = data.error || 'Ismeretlen hiba történt.';
      return;
    }

    reservationSuccess.textContent = 'Sikeres foglalás! Hamarosan felvesszük veled a kapcsolatot.';
    reservationForm.reset();
  } catch (err) {
    console.error(err);
    reservationError.textContent = 'Nem sikerült csatlakozni a szerverhez.';
  }
}

if (ticketForm) {
  ticketForm.addEventListener('submit', createTicket);
}
if (reservationForm) {
  reservationForm.addEventListener('submit', createReservation);
}
