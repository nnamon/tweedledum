// Every lesson in order: the tutor's 69, then Tweedledum's own from 70.

import { MORE_LESSONS } from './more';
import { TUTOR_LESSONS, type TutorLesson } from './tutor';

export const LESSONS: TutorLesson[] = [...TUTOR_LESSONS, ...MORE_LESSONS];
