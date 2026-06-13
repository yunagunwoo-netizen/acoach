// 홈 대시보드 (Day 2)
// 목표 칼로리 + 오늘 섭취/남은 칼로리 + 오늘의 식사 목록 + 식사 기록 버튼

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
import { deleteMeal, getMealsByDate, sumCalories, sumSugar } from '@/services/meals';
import type { Meal } from '@/types';
import { calcAge } from '@/utils/calories';
import { BLOOD_SUGAR_LABELS, MEAL_TYPE_LABELS, todayKey } from '@/utils/date';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getMealsByDate(user.uid, todayKey());
      setMeals(list);
    } catch {
      // 조용히 실패 (네트워크 등) — 화면은 유지
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 화면에 들어올 때마다 새로고침 (식사 기록 후 돌아오면 반영)
  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals])
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
          loadMeals();
        },
      },
    ]);
  }

  if (!profile) return null; // _layout이 분기 처리

  const consumed = sumCalories(meals);
  const remaining = profile.targetCalories - consumed;
  const totalSugar = sumSugar(meals);

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

        {/* 오늘의 칼로리 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>오늘 남은 칼로리</Text>
          <Text style={styles.bigNumber}>
            {remaining.toLocaleString()}
            <Text style={styles.unit}> kcal</Text>
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardSub}>목표 {profile.targetCalories.toLocaleString()}</Text>
            <Text style={styles.cardSub}>섭취 {consumed.toLocaleString()}</Text>
            <Text style={styles.cardSub}>당류 {totalSugar}g</Text>
          </View>
        </View>

        {/* 식사 기록 버튼 */}
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-meal')}>
          <Text style={styles.addBtnText}>＋  식사 기록하기</Text>
        </TouchableOpacity>

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
  card: { backgroundColor: '#208AEF', borderRadius: 20, padding: 24, marginBottom: 16 },
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
