// Project Board: shows your projects as a wall board (a web page) for an office TV or second screen.
// Lives in Google Apps Script, attached to your "Project Board" Google Sheet.
// The Sheet is the only place data is edited; this script only reads it.
// Part of https://github.com/research-reclaimed/project-board (MIT license).

// Leave this empty if this script is attached to the Sheet (Extensions > Apps Script),
// which is the normal setup. Only fill it in if the script lives somewhere else: paste the
// long ID from the Sheet's web address, the part between /d/ and /edit.
const SHEET_ID = '';

// Columns that are NEVER sent to the page, even in your own view.
// Use them for private notes and housekeeping.
const PRIVATE_COLUMNS = ['notes', 'source', 'check_with_me'];

// Runs when the board's web address is opened.
// Add ?visitor=1 to the end of the address for the visitor view (for when someone is in your office).
function doGet(e) {
  const page = HtmlService.createTemplateFromFile('Board');
  page.visitor = !!(e && e.parameter && e.parameter.visitor === '1');
  return page.evaluate()
    .setTitle('Project Board')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Reads the first tab of the Sheet and returns the rows to the page.
// Private details are removed HERE, before anything reaches the screen:
// private columns are never sent; in visitor view, student project names and next tasks are not sent either.
function getBoardData(visitor) {
  const book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const header = values.shift().map(h => String(h).trim());
  const tz = Session.getScriptTimeZone();

  const rows = values
    .filter(r => String(r[0]).trim() !== '')          // skip blank lines
    .map(r => {
      const row = {};
      header.forEach((name, i) => {
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd'); // dates typed in the Sheet
        row[name] = String(v === null || v === undefined ? '' : v).trim();
      });
      return row;
    })
    .filter(row => row.group !== 'Retired');           // set group to "Retired" to hide a row

  rows.forEach(row => {
    PRIVATE_COLUMNS.forEach(c => delete row[c]);
    if (visitor) {
      if (row.group === 'Student') row.board_name = 'Student project';
      row.next_task_1to2hr = '';
    }
  });

  return {
    rows: rows,
    updated: Utilities.formatDate(new Date(), tz, "EEE d MMM 'at' h:mm a")
  };
}
