const terrainSelect = document.querySelector("#terrain-select");
const dangerSelect = document.querySelector("#danger-select");
const paceSelect = document.querySelector("#pace-select");
const rollInput = document.querySelector("#roll-total");
const generateBtn = document.querySelector("#generate-btn");

const resultCard = document.querySelector("#result-card");
const resultTags = document.querySelector("#result-tags");
const outcomeHeading = document.querySelector("#outcome-heading");

const resultImpact = document.querySelector("#result-impact");
const resultBrief = document.querySelector("#result-brief");
const resultWeather = document.querySelector("#result-weather");
const resultCondition = document.querySelector("#result-condition");
const resultProgress = document.querySelector("#result-progress");
const resultEncounter = document.querySelector("#result-encounter");
const resultEffect = document.querySelector("#result-effect");
const resultPrompt = document.querySelector("#result-prompt");
const resultChoice = document.querySelector("#result-choice");

const eventSection = document.querySelector("#event-section");
const eventHeading = document.querySelector("#event-heading");
const copyResultBtn = document.querySelector("#copy-result-btn");
const saveResultBtn = document.querySelector("#save-result-btn");
const clearLogBtn = document.querySelector("#clear-log-btn");
const logCount = document.querySelector("#log-count");
const emptyLogMessage = document.querySelector("#empty-log-message");
const travelLogList = document.querySelector("#travel-log-list");

let travelTables = {};
let outcomeEvents = {};
let lastEventTitle = "";
let currentTravelResult = null;
let travelLog = loadTravelLog();

const outcomeClassNames = [
  "outcome-disaster",
  "outcome-hardship",
  "outcome-quiet",
  "outcome-opportunity",
  "outcome-windfall",
  "outcome-legendary"
];

const paceModifiers = {
  Careful: 2,
  Normal: 0,
  Fast: -2
};

const dangerModifiers = {
  Safe: 4,
  Tense: 1,
  Strange: -1,
  Dangerous: -3
};

generateBtn.disabled = true;
generateBtn.textContent = "Loading Travel Tables...";

Promise.all([
  fetchJson("data/travel-tables.json"),
  fetchJson("data/outcome-events.json")
])
  .then(function ([tables, events]) {
    travelTables = tables;
    outcomeEvents = events;

    generateBtn.disabled = false;
    generateBtn.textContent = "Resolve Travel Day";
  })
  .catch(function (error) {
    console.log("Could not load travel data:", error);

    showMessage(
      "Data loading error",
      "The travel tables could not be loaded.",
      "Check that data/travel-tables.json and data/outcome-events.json both exist."
    );
  });

generateBtn.addEventListener("click", resolveTravelDay);
copyResultBtn.addEventListener("click", copyTravelResult);
saveResultBtn.addEventListener("click", saveCurrentResult);
clearLogBtn.addEventListener("click", clearTravelLog);
travelLogList.addEventListener("click", handleTravelLogClick);

renderTravelLog();

function fetchJson(filePath) {
  return fetch(filePath).then(function (response) {
    if (!response.ok) {
      throw new Error(`Could not load ${filePath}`);
    }

    return response.json();
  });
}

function resolveTravelDay() {
  const selectedTerrain = terrainSelect.value;
  const selectedDanger = dangerSelect.value;
  const selectedPace = paceSelect.value;
  const baseRoll = Number(rollInput.value);

  if (!rollInput.value || Number.isNaN(baseRoll) || baseRoll < 1 || baseRoll > 30) {
    showMessage(
      "Roll needed",
      "Enter a player travel roll from 1 to 30.",
      "The roll should be the player's travel check total before modifiers."
    );
    return;
  }

  const paceModifier = paceModifiers[selectedPace];
  const dangerModifier = dangerModifiers[selectedDanger];
  const finalScore = baseRoll + paceModifier + dangerModifier;
  const outcome = getTravelOutcome(finalScore);
  const tableKey = getTableKeyForOutcome(outcome.key);

  const weather = getRandomItem(travelTables.weatherTables[tableKey]);
  const condition = travelTables.conditionTables[selectedTerrain][tableKey];
  const progress = getProgressResult(tableKey, selectedPace);
  const choice = getRandomItem(travelTables.playerChoiceTables[tableKey]);
  const event = chooseOutcomeEvent(outcome.key, selectedTerrain);

  resultCard.classList.remove("hidden");
  applyOutcomeClass(outcome.key);

  resultTags.textContent = `${selectedTerrain} • ${selectedDanger} • ${selectedPace} Pace`;
  outcomeHeading.textContent = outcome.label;

  resultImpact.textContent =
  `Final Score: ${finalScore} • Roll ${baseRoll} ${formatModifier(paceModifier)} pace ${formatModifier(dangerModifier)} danger.`;

  resultBrief.textContent = getTravelBrief(
   outcome,
   selectedTerrain,
   selectedDanger,
   selectedPace,
   event
  );

  resultWeather.textContent = weather;
  resultCondition.textContent = condition;
  resultProgress.textContent = progress;
  resultChoice.textContent = choice;

  updateEventDisplay(outcome, event);

  currentTravelResult = createTravelLogEntry({
  terrain: selectedTerrain,
  danger: selectedDanger,
  pace: selectedPace,
  baseRoll: baseRoll,
  paceModifier: paceModifier,
  dangerModifier: dangerModifier,
  finalScore: finalScore,
  outcome: outcome,
  brief: resultBrief.textContent,
  weather: weather,
  condition: condition,
  progress: progress,
  event: event,
  choice: choice
});

saveResultBtn.disabled = false;
saveResultBtn.textContent = "Save to Travel Log";
}

function getTravelOutcome(finalScore) {
  if (finalScore <= 5) {
    return {
      key: "disaster",
      label: "Disaster",
      summary: "The journey creates a serious problem."
    };
  }

  if (finalScore <= 10) {
    return {
      key: "hardship",
      label: "Hardship",
      summary: "The party faces a difficult travel problem or costly delay."
    };
  }

  if (finalScore <= 15) {
    return {
      key: "quiet",
      label: "Quiet Travel",
      summary: "No major event occurs."
    };
  }

  if (finalScore <= 20) {
    return {
      key: "opportunity",
      label: "Opportunity",
      summary: "The party gains a small benefit or useful opening."
    };
  }

  if (finalScore <= 25) {
    return {
      key: "windfall",
      label: "Windfall",
      summary: "The party gains a significant travel advantage."
    };
  }

  return {
    key: "legendary",
    label: "Legendary Fortune",
    summary: "The journey produces a rare and memorable benefit."
  };
}

function getTableKeyForOutcome(outcomeKey) {
  const tableKeys = {
    disaster: "setback",
    hardship: "complication",
    quiet: "standard",
    opportunity: "advantage",
    windfall: "excellent",
    legendary: "excellent"
  };

  return tableKeys[outcomeKey];
}

function getTravelBrief(outcome, terrain, danger, pace, event) {
  const terrainText = terrain.toLowerCase();
  const dangerText = danger.toLowerCase();
  const paceText = pace.toLowerCase();

  const eventText = event
    ? ` The travel beat centers on ${event.title}, giving the DM a clear moment to bring to the table.`
    : "";

  const briefs = {
    disaster:
      `The party's ${paceText} pace through ${dangerText} ${terrainText} travel turns against them. The journey creates a serious problem that can cost time, resources, safety, or momentum.${eventText}`,
    hardship:
      `Travel through the ${terrainText} becomes difficult, but not disastrous. The party can keep moving, but the day demands a cost, delay, or hard choice.${eventText}`,
    quiet:
      `The party moves through the ${terrainText} without a major event. The day stays focused on weather, route conditions, progress, and the choices they make along the way.`,
    opportunity:
      `The party handles the journey well and finds a useful opening during ${terrainText} travel. The day creates a small advantage they can act on.${eventText}`,
    windfall:
      `The journey through the ${terrainText} turns in the party's favor. They gain a meaningful advantage, useful discovery, safer route, or stronger position before the day is done.${eventText}`,
    legendary:
      `The party's travel through the ${terrainText} becomes unusually fortunate. This is the kind of rare travel moment that can shape the session, reveal a major clue, or change the route ahead.${eventText}`
  };

  return briefs[outcome.key];
}

function chooseOutcomeEvent(outcomeKey, terrain) {
  if (outcomeKey === "quiet") {
    return null;
  }

  const eventsForOutcome = outcomeEvents[outcomeKey] || [];

  let matchingEvents = eventsForOutcome.filter(function (event) {
    return event.terrain === terrain || event.terrain === "Any";
  });

  if (matchingEvents.length === 0) {
    matchingEvents = eventsForOutcome;
  }

  if (matchingEvents.length > 1) {
    const nonRepeatingEvents = matchingEvents.filter(function (event) {
      return event.title !== lastEventTitle;
    });

    if (nonRepeatingEvents.length > 0) {
      matchingEvents = nonRepeatingEvents;
    }
  }

  const chosenEvent = getRandomItem(matchingEvents);
  lastEventTitle = chosenEvent.title;

  return chosenEvent;
}

function updateEventDisplay(outcome, event) {
  if (!event) {
    eventSection.classList.add("hidden");

    resultEncounter.textContent = "";
    resultEffect.textContent = "";
    resultPrompt.textContent = "";
    return;
  }

  eventSection.classList.remove("hidden");

  eventHeading.textContent = outcome.label;
  resultEncounter.textContent = `${event.title}: ${event.description}`;
  resultEffect.textContent = `Effect: ${event.effect}`;
  resultPrompt.textContent = `DM Prompt: ${event.dmPrompt}`;
}

function getProgressResult(tableKey, pace) {
  const baseProgress = getRandomItem(travelTables.progressTables[tableKey]);

  const paceNotes = {
    Careful:
      "Careful pace reduces risk, but costs a little time.",
    Normal:
      "Normal pace keeps the journey balanced.",
    Fast:
      "Fast pace may cover more ground, but makes trouble more likely."
  };

  return `${baseProgress} ${paceNotes[pace]}`;
}

function showMessage(tags, heading, message) {
  resultCard.classList.remove("hidden");
  clearOutcomeClass();

  eventSection.classList.add("hidden");

  resultTags.textContent = tags;
  outcomeHeading.textContent = heading;
  resultImpact.textContent = message;
  resultBrief.textContent = "";
  resultWeather.textContent = "";
  resultCondition.textContent = "";
  resultProgress.textContent = "";
  resultEncounter.textContent = "";
  resultEffect.textContent = "";
  resultPrompt.textContent = "";
  resultChoice.textContent = "";

  currentTravelResult = null;
  saveResultBtn.disabled = true;
}

function copyTravelResult() {
  const eventText = eventSection.classList.contains("hidden")
    ? ""
    : `

${eventHeading.textContent}:
${resultEncounter.textContent}

${resultEffect.textContent}

${resultPrompt.textContent}`;

  const travelResult = `
DM Travel Buddy Result

${resultTags.textContent}
${outcomeHeading.textContent}

Travel Score:
${resultImpact.textContent}

Travel Brief:
${resultBrief.textContent}

Travel Summary:
Weather: ${resultWeather.textContent}
Condition: ${resultCondition.textContent}
Progress: ${resultProgress.textContent}${eventText}

Player Choice:
${resultChoice.textContent}
`;

  navigator.clipboard
    .writeText(travelResult.trim())
    .then(function () {
      copyResultBtn.textContent = "Copied!";

      setTimeout(function () {
        copyResultBtn.textContent = "Copy Travel Result";
      }, 1500);
    })
    .catch(function (error) {
      console.log("Clipboard copy failed:", error);
      copyResultBtn.textContent = "Copy failed";

      setTimeout(function () {
        copyResultBtn.textContent = "Copy Travel Result";
      }, 1500);
    });
}

function applyOutcomeClass(outcomeKey) {
  clearOutcomeClass();
  resultCard.classList.add(`outcome-${outcomeKey}`);
}

function clearOutcomeClass() {
  resultCard.classList.remove(...outcomeClassNames);
}

function createTravelLogEntry(result) {
  return {
    id: createLogId(),
    createdAt: new Date().toLocaleString(),
    terrain: result.terrain,
    danger: result.danger,
    pace: result.pace,
    baseRoll: result.baseRoll,
    paceModifier: result.paceModifier,
    dangerModifier: result.dangerModifier,
    finalScore: result.finalScore,
    outcomeKey: result.outcome.key,
    outcomeLabel: result.outcome.label,
    brief: result.brief,
    weather: result.weather,
    condition: result.condition,
    progress: result.progress,
    event: result.event
      ? {
          title: result.event.title,
          description: result.event.description,
          effect: result.event.effect,
          dmPrompt: result.event.dmPrompt
        }
      : null,
    choice: result.choice
  };
}

function saveCurrentResult() {
  if (!currentTravelResult) {
    return;
  }

  travelLog.unshift(currentTravelResult);
  saveTravelLog();
  renderTravelLog();

  saveResultBtn.textContent = "Saved!";

  setTimeout(function () {
    saveResultBtn.textContent = "Save to Travel Log";
  }, 1500);
}

function loadTravelLog() {
  const savedLog = localStorage.getItem("dmTravelBuddyLog");

  if (!savedLog) {
    return [];
  }

  try {
    return JSON.parse(savedLog);
  } catch (error) {
    console.log("Could not load travel log:", error);
    return [];
  }
}

function saveTravelLog() {
  localStorage.setItem("dmTravelBuddyLog", JSON.stringify(travelLog));
}

function renderTravelLog() {
  logCount.textContent = `${travelLog.length} Saved`;

  if (travelLog.length === 0) {
    emptyLogMessage.classList.remove("hidden");
    travelLogList.innerHTML = "";
    clearLogBtn.disabled = true;
    return;
  }

  emptyLogMessage.classList.add("hidden");
  clearLogBtn.disabled = false;

  travelLogList.innerHTML = travelLog
    .map(function (entry) {
      const eventMarkup = entry.event
        ? `
          <p class="log-event">
            <strong>${escapeHTML(entry.event.title)}:</strong>
            ${escapeHTML(entry.event.description)}
          </p>
        `
        : `
          <p class="log-event text-muted">
            No event. Quiet travel beat.
          </p>
        `;

      return `
        <article class="log-card" data-log-id="${entry.id}">
          <div class="log-card-topline">
            <span class="badge ${getOutcomeBadgeClass(entry.outcomeKey)}">
              ${escapeHTML(entry.outcomeLabel)}
            </span>

            <button
              class="button button-ghost button-small"
              type="button"
              data-delete-id="${entry.id}"
            >
              Delete
            </button>
          </div>

          <h3>${escapeHTML(entry.terrain)} Travel</h3>

          <p class="log-meta">
            ${escapeHTML(entry.createdAt)} • ${escapeHTML(entry.danger)} • ${escapeHTML(entry.pace)} Pace • Final Score ${entry.finalScore}
          </p>

          <p>${escapeHTML(entry.brief)}</p>

          ${eventMarkup}

          <details class="log-details">
            <summary>View details</summary>

            <dl>
              <div>
                <dt>Weather</dt>
                <dd>${escapeHTML(entry.weather)}</dd>
              </div>

              <div>
                <dt>Condition</dt>
                <dd>${escapeHTML(entry.condition)}</dd>
              </div>

              <div>
                <dt>Progress</dt>
                <dd>${escapeHTML(entry.progress)}</dd>
              </div>

              <div>
                <dt>Player Choice</dt>
                <dd>${escapeHTML(entry.choice)}</dd>
              </div>
            </dl>
          </details>
        </article>
      `;
    })
    .join("");
}

function handleTravelLogClick(event) {
  const deleteButton = event.target.closest("[data-delete-id]");

  if (!deleteButton) {
    return;
  }

  const idToDelete = deleteButton.dataset.deleteId;

  travelLog = travelLog.filter(function (entry) {
    return entry.id !== idToDelete;
  });

  saveTravelLog();
  renderTravelLog();
}

function clearTravelLog() {
  travelLog = [];
  saveTravelLog();
  renderTravelLog();
}

function getOutcomeBadgeClass(outcomeKey) {
  const badgeClasses = {
    disaster: "badge-danger",
    hardship: "badge-warning",
    quiet: "",
    opportunity: "badge-success",
    windfall: "badge-warning",
    legendary: "badge-primary"
  };

  return badgeClasses[outcomeKey] || "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createLogId() {
  return `travel-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatModifier(modifier) {
  if (modifier >= 0) {
    return `+${modifier}`;
  }

  return `${modifier}`;
}

function getRandomItem(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}