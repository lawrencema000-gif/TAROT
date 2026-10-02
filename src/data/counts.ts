/**
 * The numbers the landing page stands behind.
 *
 * Plain literals on purpose. The landing is the first thing a cold visitor
 * downloads, and the sources these count — the deck, the two spread files,
 * the quiz registry inside QuizzesPage — are hundreds of kilobytes it must
 * not carry. So the figures live here, and src/test/golden/counts.test.ts
 * holds each one to its source: add a spread or an always-on quiz without
 * changing the number here and the build fails.
 *
 * Quizzes count the registry entries that are always on. The ones behind
 * the `ayurveda-dosha` and `extra-quizzes` feature flags are not promised
 * to a visitor who may never see them.
 */
export const CARD_COUNT = 78;
export const SPREAD_COUNT = 40;
export const QUIZ_COUNT = 10;
export const SIGN_COUNT = 12;
