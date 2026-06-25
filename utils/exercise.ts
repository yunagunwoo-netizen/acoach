// 운동 관련 순수 헬퍼 (UI/외부 API와 분리 — utils/)
// 소모 칼로리 계산은 utils/calories.ts의 calcCaloriesBurned(MET 공식) 재사용.

import type { ImageSourcePropType } from 'react-native';
import type { ExerciseType } from '@/types';

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  cardio: '유산소',
  strength: '근력',
};

export const EXERCISE_TYPE_ORDER: ExerciseType[] = ['cardio', 'strength'];

// 운동 종류별 커스텀 3D 아이콘 (assets/icons, 투명 PNG)
export const EXERCISE_TYPE_ICONS: Record<ExerciseType, ImageSourcePropType> = {
  cardio: require('../assets/icons/run.png'),
  strength: require('../assets/icons/dumbbell.png'),
};

// 운동 프리셋 — 이름 + MET(대사당량) + 커스텀 아이콘. 탭하면 소모칼로리 자동 계산에 사용.
// MET 값은 Compendium of Physical Activities 기준 일반값(중장년 보수적 선택).
export interface ExercisePreset {
  name: string;
  met: number;
  icon: ImageSourcePropType; // assets/icons 투명 PNG
}

export const EXERCISE_PRESETS: Record<ExerciseType, ExercisePreset[]> = {
  cardio: [
    { name: '걷기(가볍게)', met: 3.0, icon: require('../assets/icons/walk.png') },
    { name: '빠르게 걷기', met: 4.3, icon: require('../assets/icons/walk.png') },
    { name: '달리기', met: 8.0, icon: require('../assets/icons/run.png') },
    { name: '자전거', met: 6.0, icon: require('../assets/icons/bike.png') },
    { name: '등산', met: 6.5, icon: require('../assets/icons/mountain.png') },
    { name: '수영', met: 7.0, icon: require('../assets/icons/swim.png') },
    { name: '줄넘기', met: 8.5, icon: require('../assets/icons/jumprope.png') },
  ],
  strength: [
    { name: '웨이트(일반)', met: 5.0, icon: require('../assets/icons/dumbbell.png') },
    { name: '웨이트(고강도)', met: 6.0, icon: require('../assets/icons/barbell.png') },
    { name: '맨몸운동', met: 4.0, icon: require('../assets/icons/muscle.png') },
    { name: '코어/복근', met: 3.5, icon: require('../assets/icons/abs.png') },
    { name: '스트레칭/요가', met: 2.5, icon: require('../assets/icons/yoga.png') },
  ],
};
