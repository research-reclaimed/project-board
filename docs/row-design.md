# Designing your rows

The board is only as useful as its rows. These are the conventions the board was built around.
Change them to fit your work.

## One row per thing you are responsible for

A paper, a student's project, a grant, a class you are teaching, a consulting client, a standing
admin task. Not one row per task: each row carries only its **next** task.

## The columns

| Column | What goes in it | Example | Shown on the TV? |
|---|---|---|---|
| `row_id` | Any short unique code. Rows without one are skipped. | `m01` | No |
| `group` | Which block the row sits in. Must match a name in `GROUP_ORDER` in `Board.html`. `Retired` hides a row. | `Manuscript` | As the heading |
| `board_name` | Short name. For students, use initials, not full names. | `AB - Fish and offshore wind` | Yes |
| `where_it_is` | How far along it is overall. | `Ch. 2 of 3` · `Week 12 of 14` · `Draft` | Yes |
| `doing_now` | The kind of work happening this week. | `Analysis` · `Writing` · `Field planning` | Yes (as a tag) |
| `ball_in_court` | `yes` if the next move is yours, `no` if you are waiting on someone. | `no` | `no` rows go to the "Waiting on others" strip |
| `focus_today` | `yes` for up to three rows you mean to move today. | `yes` | In the "Today's focus" strip |
| `next_task_1to2hr` | One task you could finish in a single 1-2 hour block. | `Read Ch. 1 Results draft` | Yes (hidden in visitor view) |
| `due` | A hard deadline, typed as a date. | `2027-01-15` | Yes: orange within 14 days, red when due or overdue |
| `notes` | Anything private: meeting dates, context. | | **Never** |
| `sort` | A number for order within a group (10, 20, 30 leaves room to insert). | `10` | No |

## Stage lists that worked

- **Manuscript.** Idea, Analysis, Outline, Draft, Co-author review, Submitted, Revision, Accepted, Published.
- **Student project** (one row per student project, initials only).
  - Where it is: Proposal, Proposal defense, Ch. 1, Ch. 2, Ch. 3, Thesis defense, Submitted. Use only as many chapters as the student has.
  - Doing now: Analysis, Writing, Analysis + writing, or Revising.
  - Student paperwork belongs in an Admin row; committee meeting dates go in `notes`.
- **Grant.** Where it is: Proposal, Awarded, Active, Report due, Closeout.
  - "Active" alone hides the real work, so pair it with `doing_now`: Field planning, Fieldwork, Lab, Analysis, Model building, Writing, Meetings or Reporting.
- **Teaching, class in session** (one row per class). Where it is: Week N of the semester.
  - Next task: whatever is still undone for the coming week (slides, in-class activity, quiz, readings posted, grading).
- **Course being built.** Design, Approval, Building, Ready.
- **Consulting or side business.** Idea, Building, Testing, Selling. Give a big client its own row.
- **Admin, email, service.** No stages; make the next task a recurring time block (for example, email daily at 3:30 pm).

## Privacy

The script removes `notes` (and any column listed in `PRIVATE_COLUMNS` in `Code.gs`) before
anything reaches the page. Add `?visitor=1` to the board's web address when someone else can see
the screen: student project names are replaced with "Student project", and next tasks are hidden.

Even so, the board is a web page. Keep sensitive details (grades, health, personnel matters) out of
the Sheet altogether.
