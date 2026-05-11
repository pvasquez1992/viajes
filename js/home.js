const today = new Date();
today.setHours(0, 0, 0, 0);

document.querySelectorAll('.trip-card[data-end]').forEach((card) => {
    const status = card.querySelector('.trip-status');
    const endDate = new Date(`${card.dataset.end}T00:00:00`);
    const startDate = new Date(`${card.dataset.start}T00:00:00`);

    if (endDate < today) {
        card.classList.add('finished');
        status.textContent = 'Finalizado';
        return;
    }

    if (startDate <= today && today <= endDate) {
        card.classList.add('current');
        status.textContent = 'En curso';
        return;
    }

    card.classList.add('planned');
    status.textContent = 'Planificando';
});
