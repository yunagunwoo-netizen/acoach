// Day 1에서는 사용하지 않는 화면 — 홈으로 보냅니다.
// (식단 분석 등 추가 화면이 생기면 이 자리에 구현)

import { Redirect } from 'expo-router';

export default function ExploreScreen() {
  return <Redirect href="/" />;
}
