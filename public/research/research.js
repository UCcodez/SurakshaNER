const navButtons = document.querySelectorAll(".researcher-nav button");
const sections = document.querySelectorAll(".researcher-section");

function showSection(sectionId) {
  sections.forEach((section) => {
    section.hidden = section.id !== sectionId;
  });

  navButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.section === sectionId
    );
  });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showSection(button.dataset.section);
  });
});

showSection("overview");

const parameterForm = document.getElementById("parameter-form");
const parameterStatus = document.getElementById("parameter-status");

parameterForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(parameterForm);

  const parameters = {
    learningRate: Number(formData.get("learningRate")),
    batchSize: Number(formData.get("batchSize")),
    epochs: Number(formData.get("epochs"))
  };

  console.log("Updated parameters:", parameters);

  parameterStatus.textContent =
    "Parameters saved locally. No training job has been started.";
});

// --- New experiment (previously had no handler at all) ---
const experimentForm = document.getElementById("experiment-form");
const experimentStatus = document.getElementById("experiment-status");

if (experimentForm && experimentStatus) {
  experimentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(experimentForm);

    const experiment = {
      name: formData.get("experimentName"),
      baseModel: formData.get("baseModel"),
      task: formData.get("task")
    };

    console.log("New experiment configuration:", experiment);

    experimentStatus.textContent =
      "Experiment saved locally. No training job has been started.";
  });
}

// --- Dataset actions (previously had no handlers at all) ---
const registerDatasetBtn = document.getElementById("register-dataset");
const exportCatalogueBtn = document.getElementById("export-catalogue");
const datasetStatus = document.getElementById("dataset-status");

if (registerDatasetBtn && datasetStatus) {
  registerDatasetBtn.addEventListener("click", () => {
    datasetStatus.textContent =
      "Dataset registered locally for this demonstration.";
  });
}

if (exportCatalogueBtn && datasetStatus) {
  exportCatalogueBtn.addEventListener("click", () => {
    datasetStatus.textContent =
      "Catalogue export is illustrative in this demo — no file is generated.";
  });
}