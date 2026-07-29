export type ReviewRating = 'again' | 'good' | 'easy';
export function nextReview(rating: ReviewRating, mastery: number, reviewCount: number) {
  const nextMastery = rating === 'again' ? Math.max(0, mastery - 15) : rating === 'good' ? Math.min(100, mastery + 12) : Math.min(100, mastery + 22);
  const intervals = rating === 'again' ? 1 : rating === 'good' ? Math.max(1, Math.round(Math.pow(2, reviewCount))) : Math.max(3, Math.round(Math.pow(2.4, reviewCount + 1)));
  const date = new Date(); date.setDate(date.getDate() + Math.min(intervals, 60));
  return { mastery: nextMastery, nextReview: date.toISOString() };
}
