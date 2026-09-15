const SHEET_ENVIRONMENTS = [
  '무소음',
  '백색소음(바다)',
  '가사 없는 음악',
  '가사 있는 음악(한국어)',
  '가사 있는 음악(외국어)',
];

const APP_ENVIRONMENTS = [
  '무소음',
  '백색소음(바다)',
  '가사 없는 음악',
  '가사 있는 음악(한국어)',
  '가사 있는 음악(외국어)',
];

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getResultSheet() {
  return getSpreadsheet().getSheets()[0];
}

function ensureResultHeaders(sheet) {
  const headers = [
    '결과 ID',
    ...SHEET_ENVIRONMENTS.map((name) => `${name} 정답률`),
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function ensureMathSheet() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Math');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('Math');
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 4, 2).setValues([
      ['문제열', '답열'],
      ['3 + 11 = ?', '14'],
      ['4 + 9 = ?', '13'],
      ['10 + 11 = ?', '21'],
    ]);
  }

  return sheet;
}

function doGet() {
  const spreadsheet = getSpreadsheet();
  const configSheet = spreadsheet.getSheetByName('Config');
  const wordsSheet = spreadsheet.getSheetByName('Words');
  const mathSheet = ensureMathSheet();
  const config = {};

  if (configSheet && configSheet.getLastRow() > 1) {
    const configRows = configSheet
      .getRange(2, 1, configSheet.getLastRow() - 1, 2)
      .getValues();

    configRows.forEach(([key, value]) => {
      if (key) {
        config[String(key).trim()] = String(value).trim();
      }
    });
  }

  const words = wordsSheet && wordsSheet.getLastRow() > 1
    ? wordsSheet
        .getRange(2, 1, wordsSheet.getLastRow() - 1, 1)
        .getValues()
        .flat()
        .map((word) => String(word).trim())
        .filter(Boolean)
    : [];

  const mathProblems = mathSheet.getLastRow() > 1
    ? mathSheet
        .getRange(2, 1, mathSheet.getLastRow() - 1, 2)
        .getValues()
        .map(([question, answer]) => ({
          question: String(question).trim(),
          answer: String(answer).trim(),
        }))
        .filter(({ question, answer }) => question && answer)
    : [];

  return ContentService
    .createTextOutput(JSON.stringify({ config, words, mathProblems }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getResultSheet();
  const data = JSON.parse(e.postData.contents);
  const results = data.results || [];

  ensureResultHeaders(sheet);

  const row = [data.resultId || ''];

  SHEET_ENVIRONMENTS.forEach((sheetEnvironmentName, index) => {
    const appEnvironmentName = APP_ENVIRONMENTS[index];
    const result = results.find(
      (item) =>
        item.environment === appEnvironmentName ||
        item.environment === sheetEnvironmentName
    );

    const rate = result && result.presented
      ? `${Math.round((result.correct / result.presented) * 100)}%`
      : '';

    row.push(rate);
  });

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
