// Gmail inbox clean-out: label old conversations by year and archive them.
// NOTHING IS DELETED. Archived mail stays searchable under its year label.
// Runs in Google Apps Script (script.google.com) on your own account.
// Part of https://github.com/research-reclaimed/project-board (MIT license).
// Change the years in JOBS below to the years you want to clear out.

// Which mail to move. "in:inbox" means only mail still sitting in the inbox.
const JOBS = [
  { query: 'in:inbox after:2024/01/01 before:2025/01/01', label: '2024' },
  { query: 'in:inbox after:2025/01/01 before:2026/01/01', label: '2025' },
];

// Safety rule: if a conversation has ANY message on or after this date,
// leave it in the inbox (it is still active).
const KEEP_IF_ACTIVE_SINCE = new Date('2026-01-01T00:00:00');

const BATCH = 100;                    // conversations handled per step (Gmail's limit)
const TIME_LIMIT_MS = 5 * 60 * 1000;  // stop after 5 minutes (Google cuts scripts off at 6)

function archiveOldMail() {
  const memory = PropertiesService.getScriptProperties(); // remembers progress between runs
  const start = Date.now();

  for (const job of JOBS) {
    if (memory.getProperty('done_' + job.label)) continue;  // this year already finished

    // Use the existing year label (create it only if missing).
    const label = GmailApp.getUserLabelByName(job.label) || GmailApp.createLabel(job.label);

    // "skip" = how many still-active conversations we are deliberately leaving behind,
    // so the next search starts after them instead of seeing them again.
    let skip = Number(memory.getProperty('skip_' + job.label) || 0);

    while (true) {
      if (Date.now() - start > TIME_LIMIT_MS) {     // out of time: save place, run again in 1 min
        memory.setProperty('skip_' + job.label, String(skip));
        scheduleNextRun();
        return;
      }
      const threads = GmailApp.search(job.query, skip, BATCH);
      if (threads.length === 0) {                   // nothing left for this year
        memory.setProperty('done_' + job.label, 'yes');
        console.log(job.label + ': finished. Kept ' + skip + ' active conversations in the inbox.');
        break;
      }
      const old = threads.filter(t => t.getLastMessageDate() < KEEP_IF_ACTIVE_SINCE);
      skip += threads.length - old.length;
      if (old.length > 0) {
        label.addToThreads(old);              // add the year label
        GmailApp.moveThreadsToArchive(old);   // remove from inbox (not deleted)
      }
      console.log(job.label + ': archived ' + old.length + ', kept ' + (threads.length - old.length) + ' active');
    }
  }
  removeTimers();
  console.log('All done. You can delete this script project.');
}

// Sets a one-off timer so the script carries on by itself.
function scheduleNextRun() {
  removeTimers();
  ScriptApp.newTrigger('archiveOldMail').timeBased().after(60 * 1000).create();
}

// Removes any timers this script made (also use this to stop it early).
function removeTimers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}
