// 메인 앱 영역 레이아웃.
// Day 1에서는 화면이 홈 하나뿐이라 탭 없이 Stack으로 둡니다.
// (식단 분석/운동/건강검진/설정 화면이 추가되면 이 파일을 실제 탭으로 바꿉니다.)

import { Stack } from 'expo-router';

export default function TabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
