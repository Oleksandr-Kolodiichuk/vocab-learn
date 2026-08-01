function sm2(card, quality) {
  let { ease_factor: easeFactor, interval_days: intervalDays, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return { ease_factor: easeFactor, interval_days: intervalDays, repetitions, due_at: dueAt };
}

module.exports = { sm2 };
