function formatTicketType(type) {
  if (type === 'vip') return 'Jegy + vacsora';
  return 'Normál jegy';
}

async function fetchTickets() {
  const tbody = document.getElementById('tickets-body');
  try {
    const res = await fetch('/api/tickets');
    const data = await res.json();
    if (!res.ok) throw new Error();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8">Nincs még jegyrendelés.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(t => `
      <tr>
        <td>${t.id}</td>
        <td>${t.name}</td>
        <td>${t.email}</td>
        <td>${formatTicketType(t.ticket_type)}</td>
        <td>${t.quantity}</td>
        <td>${t.total_price}</td>
        <td><code>${t.code}</code></td>
        <td>${new Date(t.created_at).toLocaleString('hu-HU')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8">Hiba történt a jegyek betöltésekor.</td></tr>';
  }
}

async function fetchReservations() {
  const tbody = document.getElementById('reservations-body');
  try {
    const res = await fetch('/api/reservations');
    const data = await res.json();
    if (!res.ok) throw new Error();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7">Nincs még asztalfoglalás.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.name}</td>
        <td>${r.email}</td>
        <td>${r.phone || '-'}</td>
        <td>${r.guests}</td>
        <td>${r.notes || '-'}</td>
        <td>${new Date(r.created_at).toLocaleString('hu-HU')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7">Hiba történt a foglalások betöltésekor.</td></tr>';
  }
}

async function verifyTicket(e) {
  e.preventDefault();
  const input = document.getElementById('verify-code');
  const resultDiv = document.getElementById('verify-result');
  const code = input.value.trim();
  resultDiv.textContent = '';

  if (!code) {
    resultDiv.textContent = 'Adj meg egy jegykódot.';
    return;
  }

  try {
    const res = await fetch(`/api/tickets/code/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok || !data.valid) {
      resultDiv.innerHTML = '<span style="color:#b91c1c;font-weight:600;">Érvénytelen jegy.</span>';
      return;
    }

    const t = data.ticket;
    resultDiv.innerHTML = `
      <div style="font-size:0.95rem;">
        <p><strong>Érvényes jegy</strong></p>
        <p><strong>Név:</strong> ${t.name}</p>
        <p><strong>Email:</strong> ${t.email}</p>
        <p><strong>Jegytípus:</strong> ${formatTicketType(t.ticket_type)}</p>
        <p><strong>Mennyiség:</strong> ${t.quantity} db</p>
        <p><strong>Összeg:</strong> ${t.total_price} Ft</p>
      </div>
    `;
  } catch (err) {
    console.error(err);
    resultDiv.textContent = 'Nem sikerült csatlakozni a szerverhez.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchTickets();
  fetchReservations();
  const verifyForm = document.getElementById('verify-form');
  if (verifyForm) verifyForm.addEventListener('submit', verifyTicket);
});
