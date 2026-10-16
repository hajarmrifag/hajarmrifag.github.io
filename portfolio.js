// Small, user-controlled explanations. No simulated request reaches a service.
const layerCopy = {
  interface: ['01', 'Give people control.', 'GridFlex’s React workspace turns battery settings and energy profiles into interactive charts and scenario comparisons.'],
  api: ['02', 'Bound the expensive work.', 'FastAPI validates scenario inputs, caps request bodies at 16 KB and allows two concurrent computations. The real endpoint is POST /api/simulate.'],
  engine: ['03', 'Keep the physics in one place.', 'The reusable Python engine models demand shifting and battery dispatch. Numerical checks and recorded benchmarks keep performance claims inspectable.'],
};
const description = document.querySelector('#layer-description');
const layerButtons = [...document.querySelectorAll('[data-layer]')];
document.querySelector('.annotation').hidden = false;
layerButtons.forEach(button => {
  button.disabled = false;
  button.addEventListener('click', () => {
    const [number, title, body] = layerCopy[button.dataset.layer];
    layerButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    description.querySelector('.layer-indicator').textContent = number;
    const heading = document.createElement('strong');
    heading.textContent = title;
    description.querySelector('p').replaceChildren(heading, document.createTextNode(` ${body}`));
  });
});

const role = document.querySelector('#claim-role');
const result = document.querySelector('#permission-result');
function updatePermissionSketch() {
  const allowed = ['Manager', 'Admin'].includes(role.value);
  result.classList.toggle('is-allowed', allowed);
  result.querySelector('.result-symbol').textContent = allowed ? '✓' : '×';
  result.querySelector('strong').textContent = allowed ? 'Update the status. Record the change.' : 'Read the record. Keep the status.';
  result.querySelector('p > span').textContent = allowed
    ? `${role.value === 'Admin' ? 'Administrators' : 'Managers'} can request a status change. The service records the previous and new status in the audit history.`
    : 'Adjusters cannot change claim status. The API enforces the same boundary as the interface.';
}
role?.addEventListener('change', updatePermissionSketch);
if (role) {
  role.disabled = false;
  updatePermissionSketch();
}

const copyButton = document.querySelector('#copy-email');
if (copyButton && navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText('hajarmrifag2@gmail.com');
      status.textContent = 'Email copied.';
    } catch {
      status.textContent = 'Select the email address to copy it.';
    }
  });
}
