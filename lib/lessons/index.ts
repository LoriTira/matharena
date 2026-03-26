import type { InteractiveLesson } from '@/types';
import { multiplyBy11 } from './multiply-by-11';
import { squaringEnding5 } from './squaring-ending-5';
import { complementSubtraction } from './complement-subtraction';
import { additionLeftToRight } from './addition-left-to-right';
import { divisionBySplitting } from './division-by-splitting';
import { multiplyNear100 } from './multiply-near-100';

export const LESSONS: InteractiveLesson[] = [
  multiplyBy11,
  squaringEnding5,
  complementSubtraction,
  additionLeftToRight,
  divisionBySplitting,
  multiplyNear100,
];

export function getLessonBySlug(slug: string): InteractiveLesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
