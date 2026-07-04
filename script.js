const terrainSelect = document.querySelector("#terrain-select");
const dangerSelect = document.querySelector("#danger-select");
const paceSelect = document.querySelector("#pace-select");
const rollInput = document.querySelector("#roll-total");
const generateBtn = document.querySelector("#generate-btn");

const resultCard = document.querySelector("#result-card");
const resultTags = document.querySelector("#result-tags");
const outcomeHeading = document.querySelector("#outcome-heading");

const resultImpact = document.querySelector("#result-impact");
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

let travelTables = {};
let outcomeEvents = {};
let lastEventTitle = "";

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
    `Roll ${baseRoll} ${formatModifier(paceModifier)} pace ${formatModifier(dangerModifier)} danger = ${finalScore}. ${outcome.summary}`;

  resultWeather.textContent = weather;
  resultCondition.textContent = condition;
  resultProgress.textContent = progress;
  resultChoice.textContent = choice;

  updateEventDisplay(outcome, event);
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
  resultWeather.textContent = "";
  resultCondition.textContent = "";
  resultProgress.textContent = "";
  resultEncounter.textContent = "";
  resultEffect.textContent = "";
  resultPrompt.textContent = "";
  resultChoice.textContent = "";
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