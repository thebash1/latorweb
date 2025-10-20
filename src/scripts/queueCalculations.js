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
    el.textContent = (Number.isFinite(value) ? value.toFixed(4) : '-');
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

/* ---------- SIMULACIÓN POR SEGUNDO (con START/STOP y protección) ---------- */
const simState = {
  intervalId: null,
  running: false,
  elapsedSeconds: 0,
  queueLength: 0,
  arrivals: 0,
  departures: 0,
  maxDisplay: 60, // máximo de clientes dibujados
  stepMs: 1000
};

// Sampling helper: Poisson with λ small -> Bernoulli approx; but keep ability for >1 arrivals by loop
function samplePoisson(lambda) {
  // For tiny lambda (<<1) this will return 0 or 1 most times.
  // Using Knuth algorithm
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function drawSimulationFrame() {
  const canvas = document.getElementById('simulationCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = Math.max(300, canvas.parentElement.offsetWidth);
  const h = 200;
  canvas.width = w;
  canvas.height = h;

  // fondo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // dibujar servidor (lado izquierdo)
  const padding = 12;
  const serverBox = { x: padding, y: padding + 10, w: 60, h: h - 2 * padding - 20 };
  ctx.fillStyle = '#e9f7ef';
  ctx.fillRect(serverBox.x, serverBox.y, serverBox.w, serverBox.h);
  ctx.strokeStyle = '#28a745';
  ctx.strokeRect(serverBox.x, serverBox.y, serverBox.w, serverBox.h);
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';
  ctx.fillText('Servidor', serverBox.x + 8, serverBox.y + 14);

  // dibujar cola (a la derecha)
  const queueX = serverBox.x + serverBox.w + 20;
  const queueY = serverBox.y;
  const slotW = 18;
  const slotH = 30;
  const gap = 6;

  // cuantos dibujar
  const drawCount = Math.min(simState.queueLength, simState.maxDisplay);
  for (let i = 0; i < drawCount; i++) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    const x = queueX + (slotW + gap) * col;
    const y = queueY + (slotH + gap) * row;
    ctx.fillStyle = i === 0 ? '#ffd700' : '#0d6efd';
    ctx.fillRect(x, y, slotW, slotH);
    ctx.strokeStyle = '#00000022';
    ctx.strokeRect(x, y, slotW, slotH);
  }

  // si hay más clientes que los dibujados, mostrar "+N"
  if (simState.queueLength > simState.maxDisplay) {
    ctx.fillStyle = '#dc3545';
    ctx.font = '14px Arial';
    ctx.fillText('+' + (simState.queueLength - simState.maxDisplay) + ' más', queueX, queueY + (Math.ceil(simState.maxDisplay / 10) * (slotH + gap)) + 18);
  }

  // cuadro de estadísticas
  const statsX = queueX;
  const statsY = queueY + h - padding - 50;
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(statsX, statsY, 260, 46);
  ctx.strokeStyle = '#ddd';
  ctx.strokeRect(statsX, statsY, 260, 46);
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.fillText(`t = ${simState.elapsedSeconds}s`, statsX + 8, statsY + 16);
  ctx.fillText(`Cola = ${simState.queueLength}`, statsX + 8, statsY + 32);
  ctx.fillText(`A=${simState.arrivals} D=${simState.departures}`, statsX + 120, statsY + 16);
}

function updateSimUI() {
  const statusEl = document.getElementById('simStatus');
  const elapsedEl = document.getElementById('simElapsed');
  const queueEl = document.getElementById('simQueue');
  if (statusEl) statusEl.textContent = simState.running ? 'En ejecución' : 'Detenido';
  if (elapsedEl) elapsedEl.textContent = `${simState.elapsedSeconds}s`;
  if (queueEl) queueEl.textContent = `${simState.queueLength}`;
  drawSimulationFrame();
}

function startSimulation() {
  if (simState.running) return; // ya corriendo

  const arrivalRate = getNumericValue('arrivalRate');
  const serviceRate = getNumericValue('serviceRate');
  const simulationTimeHours = getNumericValue('simulationTime');

  if (isNaN(arrivalRate) || isNaN(serviceRate) || isNaN(simulationTimeHours)) {
    showAlert('Por favor, completa todos los campos con valores numéricos válidos (puedes usar coma o punto).', 'warning');
    return;
  }

  // Convertir a por segundo (tasas por hora -> por segundo)
  const lambdaPerSec = arrivalRate / 3600;
  const muPerSec = serviceRate / 3600;

  // reiniciar estado
  simState.running = true;
  simState.elapsedSeconds = 0;
  simState.queueLength = 0;
  simState.arrivals = 0;
  simState.departures = 0;

  // activar boton parar / desactivar simular
  const simulateBtn = document.getElementById('simulateBtn');
  const stopBtn = document.getElementById('stopSimulationBtn');
  if (simulateBtn) simulateBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  updateSimUI();

  // duración máxima en segundos (si usuario puso 0 o negativo, ejecutamos indefinidamente hasta parar)
  const maxSeconds = (simulationTimeHours > 0) ? Math.floor(simulationTimeHours * 3600) : Infinity;

  // protecciones: no dejar que queueLength crezca sin control (limite de seguridad)
  const safetyMaxQueue = 2000000; // tope absoluto: si se alcanza, paramos para proteger al equipo

  simState.intervalId = setInterval(() => {
    // arrivals: sample Poisson(lambdaPerSec)
    const arr = samplePoisson(lambdaPerSec);
    simState.queueLength += arr;
    simState.arrivals += arr;

    // service: si hay alguien en la cola, intentar servicio (una finalización por tick como aproximación)
    if (simState.queueLength > 0) {
      // para probabilidades pequeñas: usamos Bernoulli con prob = 1 - exp(-muPerSec)
      const serviceProb = 1 - Math.exp(-muPerSec);
      if (Math.random() < serviceProb) {
        simState.queueLength = Math.max(0, simState.queueLength - 1);
        simState.departures += 1;
      }
    }

    simState.elapsedSeconds += 1;
    updateSimUI();

    // Parar condiciones
    if (simState.elapsedSeconds >= maxSeconds) {
      showAlert('Simulación finalizada: se alcanzó el tiempo de simulación.', 'info', 4000);
      stopSimulation();
      return;
    }

    if (simState.queueLength >= safetyMaxQueue) {
      showAlert('Simulación detenida: cola excesiva (riesgo de saturación).', 'danger', 8000);
      stopSimulation();
      return;
    }

    // Si la cola crece mucho, seguimos permitiendo la simulación (usuario puede parar).
  }, simState.stepMs);

  showAlert('Simulación iniciada. Actualizaciones cada 1s. Usa "Parar" para detenerla.', 'info', 3500);
}

function stopSimulation() {
  if (simState.intervalId) {
    clearInterval(simState.intervalId);
    simState.intervalId = null;
  }
  simState.running = false;

  const simulateBtn = document.getElementById('simulateBtn');
  const stopBtn = document.getElementById('stopSimulationBtn');
  if (simulateBtn) simulateBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  updateSimUI();
}

// Inicializar listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const calculateBtn = document.getElementById('calculateBtn');
  const simulateBtn = document.getElementById('simulateBtn');
  const stopBtn = document.getElementById('stopSimulationBtn');
  const form = document.getElementById('queueForm');

  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => input.classList.remove('is-invalid'));
    });
  }

  if (calculateBtn) calculateBtn.addEventListener('click', performCalculations);
  if (simulateBtn) simulateBtn.addEventListener('click', startSimulation);
  if (stopBtn) stopBtn.addEventListener('click', stopSimulation);

  // parar simulación si el usuario cierra/navega la página
  window.addEventListener('beforeunload', stopSimulation);

  // dibujar frame inicial
  drawSimulationFrame();
});