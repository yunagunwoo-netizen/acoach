// 홈 대시보드 (목표 모드 + 칼로리/단백질 현황)
// 목표 방향(감량/유지/증량) · 남은 칼로리 · 단백질 목표 대비 섭취 · 오늘의 식사

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { signOut } from '@/services/auth';
import {
  deleteExercise,
  getExercisesByDate,
  sumCaloriesBurned,
} from '@/services/exercises';
import { deleteMeal, getMealsByDate, sumCalories, sumProtein, sumSugar } from '@/services/meals';
import { saveProfile } from '@/services/users';
import type { Exercise, GoalMode, Meal } from '@/types';
import { EXERCISE_TYPE_LABELS } from '@/utils/exercise';
import {
  calcAge,
  calcGoalCalories,
  calcTargetCalories,
  calcTargetProtein,
  GOAL_DESC,
  GOAL_LABELS,
  GOAL_ORDER,
} from '@/utils/calories';
import { BLOOD_SUGAR_LABELS, MEAL_TYPE_LABELS, todayKey } from '@/utils/date';

export default function HomeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    if (!user) return;
    try {
      const [mealList, exList] = await Promise.all([
        getMealsByDate(user.uid, todayKey()),
        getExercisesByDate(user.uid, todayKey()),
      ]);
      setMeals(mealList);
      setExercises(exList);
    } catch {
      // 조용히 실패 (네트워크 등) — 화면은 유지
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 화면에 들어올 때마다 새로고침 (식사/운동 기록 후 돌아오면 반영)
  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

  function confirmDelete(meal: Meal) {
    Alert.alert('식사 삭제', '이 식사 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!user || !meal.id) return;
          await deleteMeal(user.uid, meal.id);
          loadToday();
        },
      },
    ]);
  }

  function confirmDeleteExercise(ex: Exercise) {
    Alert.alert('운동 삭제', '이 운동 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!user || !ex.id) return;
          await deleteExercise(user.uid, ex.id);
          loadToday();
        },
      },
    ]);
  }

  if (!profile) return null; // _layout이 분기 처리

  const consumed = sumCalories(meals);
  const burned = sumCaloriesBurned(exercises);
  // 칼로리 수지: 남은 = 목표 - 섭취 + 소모운동
  const remaining = profile.targetCalories - consumed + burned;
  const totalSugar = sumSugar(meals);

  // 목표 방향 + 단백질 (하위호환: 미설정이면 유지/체중기반 계산)
  const goal: GoalMode = profile.goalMode ?? 'maintain';
  const targetProtein = profile.targetProtein ?? calcTargetProtein(profile.weight, goal);
  const consumedProtein = sumProtein(meals);
  const proteinPct =
    targetProtein > 0 ? Math.min(100, Math.round((consumedProtein / targetProtein) * 100)) : 0;

  // 목표 모드 변경 → 칼로리·단백질 목표 재계산 후 저장 (기존 사용자도 즉시 적용)
  async function changeGoal(g: GoalMode) {
    if (!user || !profile || g === profile.goalMode) return;
    const tdee = calcTargetCalories(
      profile.gender,
      profile.weight,
      profile.height,
      profile.birthDate,
      profile.activityLevel
    );
    await saveProfile(user.uid, {
      ...profile,
      goalMode: g,
      targetCalories: calcGoalCalories(tdee, g),
      targetProtein: calcTargetProtein(profile.weight, g),
    });
    await refreshProfile();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요,</Text>
            <Text style={styles.name}>{profile.name}님 👋</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.logout}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 목표 모드 선택 (탭하면 즉시 적용) */}
        <View style={styles.goalRow}>
          {GOAL_ORDER.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.goalTab, goal === g && styles.goalTabActive]}
              onPress={() => changeGoal(g)}>
              <Text style={[styles.goalTabText, goal === g && styles.goalTabTextActive]}>
                {GOAL_LABELS[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 오늘의 칼로리 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{GOAL_DESC[goal]} · 남은 칼로리</Text>
          <Text style={styles.bigNumber}>
            {remaining.toLocaleString()}
            <Text style={styles.unit}> kcal</Text>
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardSub}>목표 {profile.targetCalories.toLocaleString()}</Text>
            <Text style={styles.cardSub}>섭취 {consumed.toLocaleString()}</Text>
            <Text style={styles.cardSub}>운동 −{burned.toLocaleString()}</Text>
          </View>
        </View>

        {/* 단백질 게이지 (근육 조절 핵심 지표) */}
        <View style={styles.proteinCard}>
          <View style={styles.proteinTop}>
            <Text style={styles.proteinLabel}>단백질 · 근육</Text>
            <Text style={styles.proteinNums}>
              {consumedProtein}
              <Text style={styles.proteinTarget}> / {targetProtein}g</Text>
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${proteinPct}%` }]} />
          </View>
          <Text style={styles.proteinHint}>
            {consumedProtein >= targetProtein
              ? '목표 달성 — 근육 합성에 충분해요 💪'
              : `목표까지 ${targetProtein - consumedProtein}g 남았어요`}
          </Text>
        </View>

        {/* 식사 기록 버튼 */}
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-meal')}>
          <Text style={styles.addBtnText}>＋  식사 기록하기</Text>
        </TouchableOpacity>

        {/* 운동 · 체성분 · 통계 진입 버튼 */}
        <View style={styles.subBtnRow}>
          <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/add-exercise')}>
            <Text style={styles.subBtnText}>🏃  운동</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/body')}>
            <Text style={styles.subBtnText}>⚖️  체성분</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/stats')}>
            <Text style={styles.subBtnText}>📊  통계</Text>
          </TouchableOpacity>
        </View>

        {/* 오늘의 식사 */}
        <Text style={styles.sectionTitle}>오늘의 식사</Text>
        {loading ? (
          <ActivityIndicator color="#208AEF" style={{ marginTop: 20 }} />
        ) : meals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              아직 기록한 식사가 없어요.{'\n'}첫 끼니를 기록해 보세요!
            </Text>
          </View>
        ) : (
          meals.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.mealCard}
              onLongPress={() => confirmDelete(m)}>
              <View style={styles.mealTop}>
                <Text style={styles.mealType}>
                  {MEAL_TYPE_LABELS[m.mealType]} · {m.time}
                </Text>
                <View
                  style={[
                    styles.mealImpact,
                    { backgroundColor: BLOOD_SUGAR_LABELS[m.estimatedBloodSugarImpact].color },
                  ]}>
                  <Text style={styles.mealImpactText}>
                    혈당 {BLOOD_SUGAR_LABELS[m.estimatedBloodSugarImpact].label}
                  </Text>
                </View>
              </View>
              <Text style={styles.mealFoods} numberOfLines={1}>
                {m.foods.map((f) => f.name).join(', ')}
              </Text>
              <Text style={styles.mealKcal}>{m.totalCalories.toLocaleString()} kcal</Text>
            </TouchableOpacity>
          ))
        )}

        {meals.length > 0 ? (
          <Text style={styles.hint}>식사 카드를 길게 누르면 삭제할 수 있어요.</Text>
        ) : null}

        {/* 오늘의 운동 */}
        {exercises.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>오늘의 운동</Text>
            {exercises.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.exCard}
                onLongPress={() => confirmDeleteExercise(e)}>
                <View style={styles.exLeft}>
                  <Text style={styles.exType}>{EXERCISE_TYPE_LABELS[e.type]}</Text>
                  <Text style={styles.exName}>{e.name}</Text>
                </View>
                <View style={styles.exRight}>
                  <Text style={styles.exKcal}>−{e.caloriesBurned.toLocaleString()} kcal</Text>
                  <Text style={styles.exDur}>{e.durationMin}분</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.hint}>운동 카드를 길게 누르면 삭제할 수 있어요.</Text>
          </>
        ) : null}

        {/* 프로필 요약 */}
        <Text style={styles.sectionTitle}>내 정보</Text>
        <View style={styles.infoCard}>
          <InfoRow label="나이" value={`${calcAge(profile.birthDate)}세`} />
          <InfoRow label="성별" value={profile.gender === 'male' ? '남성' : '여성'} />
          <InfoRow label="키 / 몸무게" value={`${profile.height}cm / ${profile.weight}kg`} />
          <InfoRow
            label="목표 혈당(공복)"
            value={`${profile.targetBloodSugar?.fasting ?? '-'} mg/dL`}
          />
        </View>

        <Text style={styles.disclaimer}>
          모든 수치와 제안은 AI 추정값입니다. 건강 관련 중요한 결정은 의사와 상담하세요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 15, color: '#60646C' },
  name: { fontSize: 24, fontWeight: '800', color: '#000', marginTop: 2 },
  logout: { fontSize: 14, color: '#9AA0A6' },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  goalTabActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  goalTabText: { fontSize: 15, color: '#60646C', fontWeight: '700' },
  goalTabTextActive: { color: '#fff' },

  card: { backgroundColor: '#208AEF', borderRadius: 20, padding: 24, marginBottom: 16 },
  proteinCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 8 },
  proteinTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  proteinLabel: { fontSize: 15, fontWeight: '700', color: '#000' },
  proteinNums: { fontSize: 22, fontWeight: '800', color: '#208AEF' },
  proteinTarget: { fontSize: 14, fontWeight: '600', color: '#9AA0A6' },
  barTrack: { height: 12, borderRadius: 999, backgroundColor: '#EDEEF0', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: '#208AEF' },
  proteinHint: { fontSize: 12, color: '#60646C', marginTop: 8 },
  cardLabel: { color: '#D6E9FF', fontSize: 14, fontWeight: '600' },
  bigNumber: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 6 },
  unit: { fontSize: 18, fontWeight: '600' },
  cardRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  cardSub: { color: '#D6E9FF', fontSize: 13 },

  addBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#208AEF',
    marginBottom: 8,
  },
  addBtnText: { color: '#208AEF', fontSize: 16, fontWeight: '700' },

  subBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  subBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E1E6',
  },
  subBtnText: { color: '#3C4043', fontSize: 15, fontWeight: '700' },

  exCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exLeft: { flexShrink: 1 },
  exType: { fontSize: 12, fontWeight: '700', color: '#208AEF' },
  exName: { fontSize: 15, fontWeight: '600', color: '#000', marginTop: 3 },
  exRight: { alignItems: 'flex-end' },
  exKcal: { fontSize: 16, fontWeight: '800', color: '#30A46C' },
  exDur: { fontSize: 12, color: '#9AA0A6', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: 20, marginBottom: 10 },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA0A6', textAlign: 'center', lineHeight: 21 },

  mealCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 },
  mealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { fontSize: 14, fontWeight: '700', color: '#3C4043' },
  mealImpact: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  mealImpactText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mealFoods: { fontSize: 14, color: '#60646C', marginTop: 8 },
  mealKcal: { fontSize: 18, fontWeight: '800', color: '#000', marginTop: 4 },
  hint: { fontSize: 12, color: '#9AA0A6', textAlign: 'center', marginTop: 4 },

  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 15, color: '#60646C' },
  infoValue: { fontSize: 15, color: '#000', fontWeight: '600' },
  disclaimer: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
