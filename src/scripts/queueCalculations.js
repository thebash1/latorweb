export class QueueCalculator {
  constructor(arrivalRate, serviceRate) {
    this.lambda = arrivalRate; // tasa de llegada
    this.mu = serviceRate;     // tasa de servicio
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

document.addEventListener('DOMContentLoaded', () => {
  const calculateBtn = document.getElementById('calculateBtn');
  const simulateBtn = document.getElementById('simulateBtn');
  const form = document.getElementById('queueForm');

  calculateBtn.addEventListener('click', () => {
    if (form.checkValidity()) {
      performCalculations();
    } else {
      form.classList.add('was-validated');
    }
  });

  simulateBtn.addEventListener('click', startSimulation);

  // Reset validation on input
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      form.classList.remove('was-validated');
    });
  });
});

function performCalculations() {
  const arrivalRate = parseFloat(document.getElementById('arrivalRate').value);
  const serviceRate = parseFloat(document.getElementById('serviceRate').value);

  if (arrivalRate >= serviceRate) {
    showAlert('Error: La tasa de llegada debe ser menor que la tasa de servicio para un sistema estable.', 'danger');
    return;
  }

  try {
    const calculator = new QueueCalculator(arrivalRate, serviceRate);

    updateResult('systemUtilization', calculator.calculateSystemUtilization());
    updateResult('avgCustomersSystem', calculator.calculateAverageCustomersInSystem());
    updateResult('avgCustomersQueue', calculator.calculateAverageCustomersInQueue());
    updateResult('avgTimeSystem', calculator.calculateAverageTimeInSystem());
    updateResult('avgTimeQueue', calculator.calculateAverageTimeInQueue());
    updateResult('emptySystemProb', calculator.calculateEmptySystemProbability());
  } catch (error) {
    showAlert('Error en los cálculos: ' + error.message, 'danger');
  }
}

function updateResult(elementId, value) {
  const element = document.getElementById(elementId);
  element.textContent = value.toFixed(4);
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const form = document.getElementById('queueForm');
  form.parentNode.insertBefore(alertDiv, form);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

function startSimulation() {
  const canvas = document.getElementById('simulationCanvas');
  const ctx = canvas.getContext('2d');
  
  // Ajustar el tamaño del canvas al contenedor
  function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = 300;
  }

  // Llamar a resizeCanvas cuando cambie el tamaño de la ventana
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // TODO: Implementar la simulación visual
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#6c757d';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Área de simulación (en desarrollo)', canvas.width/2, canvas.height/2);
}