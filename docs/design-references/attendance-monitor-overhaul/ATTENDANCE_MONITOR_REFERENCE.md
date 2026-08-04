# Attendance Monitor UI Reference

## Product statement

Attendance is the operational source of truth for workforce presence, absence, recorded work hours, and record quality. It is not the primary attendance-marking screen.

Foreman Today remains the place where live Enter, Exit, and break actions occur. Both CEO Attendance and Foreman Attendance use this monitor/records design; CEO has company-wide scope, while Foreman is locked to the assigned project.

---

## 1. Global visual language

Preserve the existing Worksite Operations Platform shell and design system:

- background approximately `#F6F7F9`;
- white surfaces;
- primary text approximately `#111827`;
- secondary text approximately `#64748B`;
- borders approximately `#E2E8F0`;
- violet selected/primary action approximately `#6D28D9`–`#7C3AED`;
- emerald for present/complete/on-site;
- amber for no entry/incomplete/on-break;
- red for absent/invalid/conflict;
- blue for approved leave;
- compact typography and spacing;
- 10–12 px corner radii;
- restrained shadows;
- Lucide outline icons;
- no gradients or decorative charts.

Attendance should feel dense, calm, and operational.

---

## 2. CEO daily monitor — desktop reference

Approximate 1440 × 900 application viewport with existing CEO sidebar.

### Header row

- `Attendance`
- subtitle: `Monitor workforce presence, recorded work hours, and attendance exceptions.`
- no hero action.

### Scope toolbar

A compact white toolbar:

- segmented control: `Daily monitor` selected, `Records`;
- previous date arrow;
- date control, e.g. `Tue, 4 Aug 2026`;
- next arrow;
- `Today` shortcut only when another date is selected;
- project select with `All active projects` selected.

Changing date/project updates the URL and result regions. There is no full-width `Show attendance` button.

### Summary zone

Use a 12-column layout.

#### Presence card — 5 columns

Header:

- `Today’s attendance`
- `All active projects`
- large but restrained `91%`

Breakdown:

- `182 Present`
- `14 No entry yet` before cutoff or `14 Absent` after cutoff/historical
- `4 Approved leave`
- `200 Expected`

Use a thin horizontal proportion bar, not a radial chart.

#### Live state card — compact

- `96 On site`
- `7 On break`
- `79 Exited`
- `103 Active sessions`

#### Recorded hours card — compact

- `1,286h 30m Valid time`
- `1,204h Normal`
- `82h 30m Overtime`
- note: `12 open sessions excluded until exit`

#### Record quality card — compact

- `6 Need attention`
- `4 Incomplete`
- `1 Invalid`
- `1 Leave conflict`
- secondary `View issues` filter action.

### Project monitor table

Title: `Project attendance`

Columns:

- Project
- Day type
- Expected
- Present
- No entry / Absent
- Leave
- Attendance
- On site
- Recorded
- OT
- Issues

Sample rows:

- SAFAR — Normal — 126 — 118 — 5 — 3 — 93.7% — 96 — 842h — 34h — 2
- NORTHSTAR — Normal — 84 — 70 — 12 — 2 — 83.3% — 61 — 496h — 19h — 4
- MERANTI — Public holiday — N/A expected — 18 working — absence N/A — 16 on site — 126h — 3h — 0

Problem rows use semantic text/chips, not a fully red background.

Clicking a project applies project scope while preserving date and view.

### Worker ledger

Title: `Worker records`

Toolbar:

- search;
- All;
- Present;
- No entry/Absent;
- Approved leave;
- On site;
- Needs attention;
- More filters.

Desktop columns:

- Worker
- Project
- Presence
- Current state
- First entry
- Last exit
- Recorded
- OT
- Quality
- chevron/action

Rows are compact and contained. There are no live marking buttons.

---

## 3. CEO daily monitor — mobile reference

Approximate 390 × 844 viewport with CEO app bar and bottom navigation.

First viewport order:

1. title `Attendance`;
2. segmented `Daily monitor | Records`;
3. one compact date navigator row;
4. project selector `All active projects`;
5. full-width presence card;
6. two compact operational cards or the first project row;
7. start of project/worker records.

### Presence card example

```text
Today’s attendance                    91%
All active projects

182 Present       14 No entry
4 On leave        200 Expected
[██████████████████░░]
```

### Compact cards

Two-column grid:

- `103 Active now` with `96 on site · 7 on break`;
- `1,286h Valid time` with `82h 30m overtime`;
- `6 Need attention` may span full width when nonzero.

### Project rows

```text
SAFAR                                  93.7%
Normal day · 126 expected
118 present · 5 no entry · 3 leave
96 on site · 842h recorded
2 records need attention                  >
```

### Worker rows

```text
[photo] Ahmed                         Present
        Electrician · Helper
        SAFAR · 09:00–17:00 · 8h 00m
        Exited · Complete                 >
```

No Enter/Exit/break controls. Search/filter bar becomes sticky once reached.

---

## 4. Foreman Attendance reference

Use the same visual hierarchy and worker records as CEO daily monitor, but:

- project is fixed and shown as `SAFAR`;
- no `All active projects` selector;
- no company project-comparison table;
- summary is only the assigned project;
- worker rows omit the Project line/column;
- correction remains available for authorized project records;
- no device sync strip or local queue issue center;
- no live marking buttons.

On mobile, the first viewport should show:

- Attendance title;
- Daily monitor/Records tabs;
- date navigator;
- project label and day type;
- presence summary;
- start of worker records.

This must look distinctly different from Foreman Today.

---

## 5. Records view reference

### Desktop

Toolbar:

- `Records` selected;
- month `August 2026`;
- CEO project `All authorized projects` or one project;
- search and filters.

Monthly summary strip/cards:

- `3,824 Expected worker-days`
- `3,512 Present`
- `214 Absent`
- `98 Approved leave`
- `28,940h Valid time`
- `1,642h Overtime`
- `17 Records need attention`
- `41 Off-day worked` when nonzero.

Worker roll-up table:

- Worker
- Project
- Present days
- Absent days
- Leave
- Off-day worked
- Total hours
- OT
- Issues
- Details

Selecting a worker reveals or navigates to the daily register:

- Date
- Presence
- First in
- Last out
- Recorded
- OT
- Quality
- Details

No 31-column matrix.

### Mobile

Summary uses a compact two-column metric layout followed by worker roll-up rows:

```text
[photo] Ahmed                         24 present
        SAFAR · Electrician · Helper
        1 absent · 1 leave · 196h 30m
        12h OT · Complete                 >
```

---

## 6. Worker-day detail sheet

### Header

- worker avatar/name;
- project;
- date/day type;
- presence and quality chips.

### Time summary

- first entry;
- last exit/open;
- normal;
- overtime;
- special-rate time;
- total valid time.

### Sessions

Chronological contained sections:

```text
Session 1                           Complete
09:00 → 17:00
Break 12:30 → 13:00
7h 30m valid
```

Incomplete:

```text
Session 2                         Incomplete
18:05 → No exit recorded
Not included in payable time
```

### Issues

Plain-language issue rows with semantic icon and resolution context.

### Correction

Secondary `Correct record` button. Online-only. Required reason. No `Saved on device`, `Syncing`, or queue terminology.

---

## 7. CEO dashboard metric replacement

Keep the existing priority queue and first three company metrics.

Replace only the fourth metric with:

```text
[calendar/check icon]
182 present
Today’s attendance
14 no entry · 4 leave · 91%
```

The entire metric links to today’s CEO Attendance daily monitor.

After 17:00 use `14 absent` instead of `14 no entry`.

All-off-day variant:

```text
23 working today
Off-day attendance
18 on site · absence not applicable
```

Do not add more dashboard sections in this task.

---

## 8. Loading references

- Header and stable controls render immediately.
- Summary skeleton preserves final card sizes.
- Project table skeleton uses header plus 3–5 rows.
- Worker ledger skeleton uses header plus compact rows.
- Records summary/table load independently.
- Dashboard attendance metric has its own cell skeleton.
- Do not replace the entire page with a generic skeleton for a project/date change.

---

## 9. Negative constraints

Do not implement:

- large `Show attendance` button;
- CEO browser `Attendance synchronized` strip;
- Enter/Exit/break buttons on Attendance;
- giant metric-card wall;
- radial gauge or decorative line/pie charts;
- one card per table cell;
- horizontally compressed desktop table on mobile;
- project selector for Foreman;
- company comparison for Foreman;
- automatic absence on off-days;
- automatic generated exits;
- bulk marking;
- 31-column calendar grid;
- new visual language unrelated to existing app.
