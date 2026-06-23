// 일·주간 요약 그래프 — 최근 7/14일 식사·운동을 집계해 추이 막대 + 기간 요약
// 라이브러리 없이 View 막대(체성분 화면과 동일 톤). 북극성=칼로리 수지+단백질.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { getExercisesSince, sumCaloriesBurned } from '@/services/exercises';
import { getMealsSince, sumCalories, sumProtein, sumSugar } from '@/services/meals';
import type { GoalMode } from '@/types';
import { calcTargetProtein } from '@/utils/calories';
import { lastNDateKeys } from '@/utils/date';

type Metric = 'intake' | 'protein' | 'sugar' | 'net';
type DayStat = { date: string; intake: number; protein: number; sugar: number; burned: number; net: number };

const PLOT_H = 150;

export default function StatsScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<7 | 14>(7);
  const [metric, setMetric] = useState<Metric>('intake');
  const [days, setDays] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const keys = lastNDateKeys(period);
      const start = keys[0];
      const [meals, exercises] = await Promise.all([
        getMealsSince(user.uid, start),
        getExercisesSince(user.uid, start),
      ]);
      // 날짜별 그룹핑
      const byDate: Record<string, DayStat> = {};
      keys.forEach((k) => (byDate[k] = { date: k, intake: 0, protein: 0, sugar: 0, burned: 0, net: 0 }));
      for (const k of keys) {
        const dm = meals.filter((m) => m.date === k);
        const de = exercises.filter((e) => e.date === k);
        const intake = sumCalories(dm);
        const burned = sumCaloriesBurned(de);
        byDate[k] = {
          date: k,
          intake,
          protein: sumProtein(dm),
          sugar: sumSugar(dm),
          burned,
          net: intake - burned,
        };
      }
      setDays(keys.map((k) => byDate[k]));
    } catch {
      // 조용히 실패 — 화면 유지
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  const goal: GoalMode = profile.goalMode ?? 'maintain';
  const targetProtein = profile.targetProtein ?? calcTargetProtein(profile.weight, goal);
  const targetCalories = profile.targetCalories;

  // 기간 요약 (기록한 날 기준 평균)
  const loggedDays = days.filter((d) => d.intake > 0);
  const n = loggedDays.length || 1;
  const avgIntake = Math.round(loggedDays.reduce((a, d) => a + d.intake, 0) / n);
  const avgProtein = Math.round(loggedDays.reduce((a, d) => a + d.protein, 0) / n);
  const proteinGoalDays = days.filter((d) => d.protein >= targetProtein && d.protein > 0).length;
  const totalBurned = days.reduce((a, d) => a + d.burned, 0);

  const METRICS: { key: Metric; label: string; unit: string; color: string; target?: number }[] = [
    { key: 'intake', label: '섭취', unit: 'kcal', color: '#208AEF', target: targetCalories },
    { key: 'protein', label: '단백질', unit: 'g', color: '#30A46C', target: targetProtein },
    { key: 'sugar', label: '당류', unit: 'g', color: '#F5A623' },
    { key: 'net', label: '순(섭취−운동)', unit: 'kcal', color: '#7C6BF0', target: targetCalories },
  ];
  const active = METRICS.find((m) => m.key === metric)!;
  const chartData = days.map((d) => ({ date: d.date, value: d[metric] }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← 홈</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>통계</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 기간 토글 */}
        <View style={styles.segRow}>
          {([7, 14] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.seg, period === p && styles.segActive]}
              onPress={() => setPeriod(p)}>
              <Text style={[styles.segText, period === p && styles.segTextActive]}>최근 {p}일</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 기간 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>기록 {loggedDays.length}일 · 평균</Text>
          <View style={styles.summaryRow}>
            <Summary label="섭취" value={`${avgIntake.toLocaleString()}`} unit="kcal" />
            <Summary label="단백질" value={`${avgProtein}`} unit="g" />
            <Summary label="단백질 목표달성" value={`${proteinGoalDays}`} unit="일" />
            <Summary label="운동 소모(합)" value={`${totalBurned.toLocaleString()}`} unit="kcal" />
          </View>
        </View>

        {/* 지표 토글 */}
        <View style={styles.metricRow}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricChip, metric === m.key && { backgroundColor: m.color, borderColor: m.color }]}
              onPress={() => setMetric(m.key)}>
              <Text style={[styles.metricText, metric === m.key && styles.metricTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 차트 */}
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>
            {active.label} 추이 ({active.unit})
            {active.target ? `  ·  목표 ${Math.round(active.target).toLocaleString()}` : ''}
          </Text>
          {loading ? (
            <ActivityIndicator color="#208AEF" style={{ marginVertical: 60 }} />
          ) : (
            <StatBar
              data={chartData}
              target={active.target}
              color={active.color}
              showValues={period <= 7}
            />
          )}
        </View>

        <Text style={styles.hint}>
          기록이 쌓일수록 패턴이 또렷해져요. 식사·운동을 꾸준히 기록해 보세요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>
        {value}
        <Text style={styles.summaryUnit}> {unit}</Text>
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// 라이브러리 없이 View로 그리는 0기준 막대 + 목표선
function StatBar({
  data,
  target,
  color,
  showValues,
}: {
  data: { date: string; value: number }[];
  target?: number;
  color: string;
  showValues: boolean;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const chartMax = maxVal * 1.15;
  const toPx = (v: number) => (v / chartMax) * PLOT_H;

  return (
    <View>
      <View style={[styles.plot, { height: PLOT_H }]}>
        {target ? (
          <View style={[styles.targetLine, { bottom: toPx(target) }]}>
            <Text style={styles.targetLabel}>목표</Text>
          </View>
        ) : null}
        {data.map((d, i) => (
          <View key={d.date + i} style={styles.barCol}>
            {showValues && d.value > 0 ? (
              <Text style={styles.barValue} numberOfLines={1}>
                {Math.round(d.value)}
              </Text>
            ) : null}
            <View style={[styles.bar, { height: Math.max(0, toPx(d.value)), backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={styles.dateRow}>
        {data.map((d, i) => (
          <Text key={d.date + i} style={styles.barDate} numberOfLines={1}>
            {d.date.slice(5)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { fontSize: 16, color: '#208AEF', fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  container: { paddingHorizontal: 20, paddingBottom: 40 },

  segRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  segText: { fontSize: 14, color: '#60646C', fontWeight: '600' },
  segTextActive: { color: '#fff' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16 },
  summaryTitle: { fontSize: 13, color: '#60646C', fontWeight: '600', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 17, fontWeight: '800', color: '#000' },
  summaryUnit: { fontSize: 11, fontWeight: '600', color: '#9AA0A6' },
  summaryLabel: { fontSize: 11, color: '#9AA0A6', marginTop: 4, textAlign: 'center' },

  metricRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  metricText: { fontSize: 12, color: '#60646C', fontWeight: '700' },
  metricTextActive: { color: '#fff' },

  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  chartLabel: { fontSize: 13, color: '#60646C', fontWeight: '600', marginBottom: 16 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, position: 'relative' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: '#9AA0A6', marginBottom: 2 },
  bar: { width: '72%', borderRadius: 4 },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5484D',
    zIndex: 1,
  },
  targetLabel: { position: 'absolute', right: 0, top: -13, fontSize: 9, color: '#E5484D', fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  barDate: { flex: 1, textAlign: 'center', fontSize: 9, color: '#9AA0A6' },

  hint: { fontSize: 12, color: '#9AA0A6', textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
