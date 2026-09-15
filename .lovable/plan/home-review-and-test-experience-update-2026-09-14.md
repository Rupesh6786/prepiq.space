# Home, Review, and Test Experience Update

## What will change

- Remove the entire “Push questions to the cloud database” area from Admin Review, including its sync actions and local seed references. Keep question loading, refresh behavior, filters, editing, and deletion.
- Add a homepage section titled “Why choose PrepIQ.space MAH MCA CET Mock Tests?” with four concise benefit blocks: exam simulation, comprehensive coverage, realistic exam environment, and detailed performance analysis.
- Redesign the active test screen into a full-height exam workspace:
  - Left: subject heading, chapter/topic/subtopic tags, large question area, options, and bottom-centered Previous, Mark for review, and Next controls.
  - Right upper: scrollable question palette grouped by subject.
  - Right lower: prominent Submit button and live counts for Not visited, Attempted, Answered & reviewed, Not attempted, and Marked for review.
  - Preserve answer selection, timing, rich question formatting, cancellation, submit confirmation, automatic submission, and result saving.
- Make the new test layout adapt cleanly to mobile, placing the question first and the grouped palette below it.

## State definitions

- Not visited: the learner has not opened the question.
- Attempted: answered without review marking.
- Answered & reviewed: answered and marked for review.
- Not attempted: visited but unanswered and not marked.
- Marked for review: unanswered and marked for review.

## Verification

- Run the existing TypeScript validation.
- Open the homepage and an authenticated test where available, checking desktop and mobile layout, state counts, navigation, and confirmation dialogs.
