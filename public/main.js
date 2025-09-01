const addAppButton = document.getElementById('add-app');
const appsContainer = document.getElementById('apps-container');
const appTemplate = document.getElementById('app-template');
let appIndex = 0;

function addApp() {
  const templateContent = appTemplate.content.cloneNode(true);
  const appConfigDiv = templateContent.querySelector('.app-config');

  appConfigDiv.querySelectorAll('input, select').forEach(input => {
    input.name = `apps[${appIndex}][${input.name}]`;
  });

  appsContainer.appendChild(templateContent);
  appIndex++;
}

appsContainer.addEventListener('click', function(e) {
  if (e.target.classList.contains('remove-app')) {
    e.target.closest('.app-config').remove();
  }
});

addAppButton.addEventListener('click', addApp);

// Add one app by default when the script loads
addApp();
