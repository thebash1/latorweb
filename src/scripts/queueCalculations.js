class QueueCalculator {
  constructor(arrivalRate, serviceRate) {
    this.lambda = arrivalRate;
    this.mu = serviceRate;
  }

  calculateSystemUtilization() {
    return this.lambda / this.mu;
  }

  calculateAverageCustomersInSystem() {
    const rho = this.calculateSystemUtilization();
    return rho / (1 - rho);
  }

  calculateAverageCustomersInQueue() {
    const rho = this.calculateSystemUtilization();
    return (rho * rho) / (1 - rho);
  }

  calculateAverageTimeInSystem() {
    return 1 / (this.mu - this.lambda);
  }

  calculateAverageTimeInQueue() {
    const rho = this.calculateSystemUtilization();
    return rho / (this.mu - this.lambda);
  }

  calculateEmptySystemProbability() {
    return 1 - this.calculateSystemUtilization();
  }
}

// Helper: obtener valor numérico normalizando coma -> punto
function getNumericValue(id) {
  const raw = (document.getElementById(id)?.value ?? '').toString().trim();
  if (raw === '') return NaN;
  const normalized = raw.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

// Mostrar alertas bootstrap (se eliminan del DOM al cerrarse)
function showAlert(message, type = 'danger', timeout = 4500) {
  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type} alert-dismissible fade show mt-3`;
  alertEl.setAttribute('role', 'alert');
  alertEl.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;

  const form = document.getElementById('queueForm');
  if (form && form.parentNode) {
    form.parentNode.insertBefore(alertEl, form);
  } else {
    document.body.prepend(alertEl);
  }

  function removeAlertNode() {
    if (alertEl && alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
  }

  try {
    if (window.bootstrap && typeof window.bootstrap.Alert === 'function') {
      alertEl.addEventListener('closed.bs.alert', removeAlertNode, { once: true });
      setTimeout(() => {
        const bsAlert = window.bootstrap.Alert.getOrCreateInstance(alertEl);
        bsAlert.close();
      }, timeout);
      return;
    }
  } catch (err) {
    console.warn('Bootstrap Alert API no disponible, usando fallback para remover alerta:', err);
  }

  setTimeout(() => {
    alertEl.classList.remove('show');
    setTimeout(removeAlertNode, 250);
  }, timeout);
}

// Actualizar resultados en la UI (acepta number o string)
function updateResult(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof value === 'string') {
    el.textContent = value;
  } else {
    el.textContent = value;
  }
}

/* ---------- CÁLCULOS (manejo de mu <= lambda) ---------- */
function performCalculations() {
  const arrivalRate = getNumericValue('arrivalRate');
  const serviceRate = getNumericValue('serviceRate');

  if (isNaN(arrivalRate) || isNaN(serviceRate)) {
    showAlert('Por favor ingresa valores numéricos válidos para λ y μ (usa punto o coma como separador).', 'warning');
    return;
  }

  // Si el sistema no es estable, mostramos advertencia y resultados teóricos como '∞' o 'No estable'
  if (!(serviceRate > arrivalRate)) {
    // Mostrar advertencia pero permitir
    showAlert('Advertencia: μ ≤ λ. El sistema es teóricamente inestable; los valores promedio tenderán a infinito. Se permite la simulación para ver comportamiento temporal.', 'warning', 6000);

    updateResult('systemUtilization', (arrivalRate / serviceRate).toFixed ? (arrivalRate / serviceRate).toFixed(4) : (arrivalRate / serviceRate));
    // Mostrar como infinito / no definido
    updateResult('avgCustomersSystem', 'No estable');
    updateResult('avgCustomersQueue', 'No estable');
    updateResult('avgTimeSystem', 'No estable');
    updateResult('avgTimeQueue', 'No estable');
    updateResult('emptySystemProb', '0.0000');
    return;
  }

  try {
    const calc = new QueueCalculator(arrivalRate, serviceRate);
    updateResult('systemUtilization', calc.calculateSystemUtilization() * 100 + "%");
    updateResult('avgCustomersSystem', calc.calculateAverageCustomersInSystem() * 100 + "%");
    updateResult('avgCustomersQueue', calc.calculateAverageCustomersInQueue() * 100 + "%");
    updateResult('avgTimeSystem', calc.calculateAverageTimeInSystem() + " horas");
    updateResult('avgTimeQueue', calc.calculateAverageTimeInQueue() + " horas");
    updateResult('emptySystemProb', calc.calculateEmptySystemProbability() * 100 + "%");
    showAlert('Cálculos realizados correctamente.', 'success');
  } catch (err) {
    showAlert('Error en los cálculos: ' + (err?.message ?? err), 'danger');
  }
}

// Inicializar listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const calculateBtn = document.getElementById('calculateBtn');
  const form = document.getElementById('queueForm');

  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => input.classList.remove('is-invalid'));
    });
  }

  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      performCalculations();
      drawAllChartsBar(getNumericValue('arrivalRate'), getNumericValue('serviceRate'));
    });
  }
});

function drawAllChartsBar(lambda, mu) {
  // Simula valores de lambda desde 0 hasta mu - 0.01
  const labels = [];
  const dataUtilization = [];
  const dataCustomersSystem = [];
  const dataCustomersQueue = [];
  const dataTimeSystem = [];
  const dataTimeQueue = [];
  const dataEmptySystemProb = [];
  for (let l = 0; l < mu; l += mu/10) { // Menos barras para mayor claridad
    const rho = l/mu;
    labels.push(l.toFixed(2));
    dataUtilization.push(rho);
    dataCustomersSystem.push(rho < 1 ? rho/(1 - rho) : null);
    dataCustomersQueue.push(rho < 1 ? (rho*rho)/(1 - rho) : null);
    dataTimeSystem.push(l < mu ? 1/(mu - l) : null);
    dataTimeQueue.push(l < mu ? rho/(mu - l) : null);
    dataEmptySystemProb.push(1 - rho >= 0 ? 1 - rho : null);
  }

  // Utilización
  addBarChart('utilizationChart', labels, dataUtilization, 'Utilización del sistema (ρ)', 'ρ');
  // Clientes en sistema
  addBarChart('customersSystemChart', labels, dataCustomersSystem, 'N° promedio de clientes en el sistema (L)', 'L');
  // Clientes en cola
  addBarChart('customersQueueChart', labels, dataCustomersQueue, 'N° promedio de clientes en la cola (Lq)', 'Lq');
  // Tiempo en sistema
  addBarChart('timeSystemChart', labels, dataTimeSystem, 'Tiempo promedio en el sistema (W)', 'W [horas]');
  // Tiempo en cola
  addBarChart('timeQueueChart', labels, dataTimeQueue, 'Tiempo promedio en la cola (Wq)', 'Wq [horas]');
  // Probabilidad sistema vacío
  addBarChart('emptySystemProbChart', labels, dataEmptySystemProb, 'Probabilidad que el sistema esté vacío (P0)', 'P0');
}

// Función auxiliar para agregar un gráfico de barras
function addBarChart(canvasId, labels, data, title, yLabel) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if(window[canvasId + 'Instance']) window[canvasId + 'Instance'].destroy();
  window[canvasId + 'Instance'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: yLabel,
        data: data,
        backgroundColor: 'rgba(75,192,192,0.5)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: title }
      },
      scales: {
        x: { title: { display: true, text: 'Tasa de llegada (λ)' } },
        y: { title: { display: true, text: yLabel } }
      }
    }
  });
}