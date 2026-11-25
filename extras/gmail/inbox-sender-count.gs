/**
 * Part of https://github.com/research-reclaimed/project-board (MIT license).
 *
 * Inbox sender count (READ-ONLY: this script never labels, archives or deletes anything).
 *
 * What it does, in plain language:
 *   1. Looks at every conversation in your inbox, 100 at a time.
 *   2. For each one, writes a line to the "Threads" tab of a new Google Sheet
 *      called "Inbox sender count": who started it, who wrote last, dates,
 *      unread or not, whether you ever replied, and whether it looks like a
 *      mailing list (has an "unsubscribe" header).
 *   3. When it has seen everything, it builds a "Senders" tab: one line per
 *      sender, most emails first.
 *
 * Why timers: Google stops any script after 6 minutes. So the script works for
 * about 5 minutes, saves its place, and sets a timer to start itself again
 * 1 minute later. You click Run ONCE; the timers do the rest.
 *
 * How to tell it is done: View > Executions shows "All done" in the log, and
 * the sheet has a "Senders" tab.
 *
 * Please do not archive or delete inbox mail while it runs (about 15-30 min);
 * that shifts the list and some conversations could be missed. New mail
 * arriving is fine.
 */

const QUERY = 'in:inbox';
const BATCH = 100;
const TIME_LIMIT_MS = 5 * 60 * 1000;

function countInboxSenders() {
  const started = Date.now();
  const props = PropertiesService.getScriptProperties();
  removeTimers_();

  // First run: make the sheet and remember where it is.
  let sheetId = props.getProperty('sheetId');
  if (!sheetId) {
    const ss = SpreadsheetApp.create('Inbox sender count');
    const t = ss.getSheets()[0].setName('Threads');
    t.appendRow(['thread_id', 'first_from', 'last_from', 'subject', 'first_date', 'last_date',
                 'messages', 'unread', 'i_replied', 'mailing_list']);
    sheetId = ss.getId();
    props.setProperty('sheetId', sheetId);
    props.setProperty('start', '0');
    Logger.log('Made sheet: ' + ss.getUrl());
  }
  const ss = SpreadsheetApp.openById(sheetId);
  const threadsTab = ss.getSheetByName('Threads');
  // Your own addresses (login + aliases). Dots are ignored when comparing, because
  // the same mailbox can appear as first.last@ and firstlast@.
  const mine = [Session.getActiveUser().getEmail()].concat(GmailApp.getAliases())
    .map(a => noDots_(a.toLowerCase()));

  let start = Number(props.getProperty('start') || 0);

  while (Date.now() - started < TIME_LIMIT_MS) {
    const threads = GmailApp.search(QUERY, start, BATCH);
    if (threads.length === 0) {
      buildSenderSummary_(ss);
      props.deleteAllProperties();
      Logger.log('All done. Sheet: ' + ss.getUrl());
      return;
    }

    // One call fetches the messages for all 100 conversations (much faster).
    const allMessages = GmailApp.getMessagesForThreads(threads);
    const rows = threads.map((th, i) => {
      const msgs = allMessages[i];
      const first = msgs[0];
      const last = msgs[msgs.length - 1];
      const iReplied = msgs.some(m => mine.indexOf(noDots_(emailOnly_(m.getFrom()))) !== -1);
      let isList = false;
      try { isList = first.getHeader('List-Unsubscribe') !== ''; } catch (e) {}
      return [
        th.getId(),
        first.getFrom(),
        last.getFrom(),
        (th.getFirstMessageSubject() || '').slice(0, 120),
        first.getDate(),
        last.getDate(),
        msgs.length,
        th.isUnread() ? 'yes' : 'no',
        iReplied ? 'yes' : 'no',
        isList ? 'yes' : 'no'
      ];
    });
    threadsTab.getRange(threadsTab.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

    start += threads.length;
    props.setProperty('start', String(start));
    Logger.log('Looked at ' + start + ' conversations so far.');
  }

  // Out of time: start again in 1 minute.
  ScriptApp.newTrigger('countInboxSenders').timeBased().after(60 * 1000).create();
  Logger.log('Pausing at ' + start + '; timer set to continue in 1 minute.');
}

/** Builds the "Senders" tab: one line per sender (by who started the conversation). */
function buildSenderSummary_(ss) {
  const data = ss.getSheetByName('Threads').getDataRange().getValues();
  data.shift(); // drop header row

  // New mail can shift the list, so the same conversation may appear twice; keep one.
  const seen = {};
  const tally = {};
  data.forEach(r => {
    if (seen[r[0]]) return;
    seen[r[0]] = true;
    const key = emailOnly_(r[1]);
    if (!tally[key]) {
      tally[key] = { name: r[1], threads: 0, unread: 0, replied: 0, list: 0, newest: r[5], oldest: r[4] };
    }
    const s = tally[key];
    s.threads++;
    if (r[7] === 'yes') s.unread++;
    if (r[8] === 'yes') s.replied++;
    if (r[9] === 'yes') s.list++;
    if (r[5] > s.newest) s.newest = r[5];
    if (r[4] < s.oldest) s.oldest = r[4];
  });

  const rows = Object.keys(tally).map(k => {
    const s = tally[k];
    return [k, s.name, s.threads, s.unread, s.replied, s.list > 0 ? 'yes' : 'no', s.newest, s.oldest];
  }).sort((a, b) => b[2] - a[2]);

  let tab = ss.getSheetByName('Senders');
  if (tab) tab.clear(); else tab = ss.insertSheet('Senders', 0);
  tab.appendRow(['sender_email', 'sender_name', 'conversations', 'unread', 'i_replied', 'mailing_list',
                 'newest', 'oldest']);
  if (rows.length) tab.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  tab.setFrozenRows(1);
  Logger.log('Unique conversations: ' + Object.keys(seen).length + '; senders: ' + rows.length);
}

/** "Jane Doe <jane@x.org>" -> "jane@x.org" */
function emailOnly_(from) {
  const m = String(from).match(/<([^>]+)>/);
  return (m ? m[1] : String(from)).trim().toLowerCase();
}

/** "first.last@example.edu" -> "firstlast@example.edu" */
function noDots_(addr) {
  const parts = addr.split('@');
  return parts[0].replace(/\./g, '') + '@' + (parts[1] || '');
}

function removeTimers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'countInboxSenders')
    .forEach(t => ScriptApp.deleteTrigger(t));
}
