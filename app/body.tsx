// 체성분 기록·추이 화면 — 체중/체지방률/골격근량 입력 + 가벼운 막대 추이 차트(라이브러리 없음)
// 체중 저장 시 프로필 체중·목표(칼로리/단백질)도 함께 갱신 → 북극성(칼로리수지+근육) 최신 유지

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { getBodyCompositions, saveBodyComposition } from '@/services/bodyComposition';
import { saveProfile } from '@/services/users';
import type { BodyComposition, GoalMode } from '@/types';
import {
  calcGoalCalories,
  calcTargetCalories,
  calcTargetProtein,
} from '@/utils/calories';
import { todayKey } from '@/utils/date';

// 추이 차트에서 고를 수 있는 지표
type Metric = 'weight' | 'bodyFatPercent' | 'skeletalMuscleMass';
const METRICS: { key: Metric; label: string; unit: string; icon: ImageSourcePropType }[] = [
  { key: 'weight', label: '체중', unit: 'kg', icon: require('../assets/icons/scale.png') },
  { key: 'bodyFatPercent', label: '체지방률', unit: '%', icon: require('../assets/icons/tape.png') },
  { key: 'skeletalMuscleMass', label: '골격근량', unit: 'kg', icon: require('../assets/icons/muscle.png') },
];

export default function BodyScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<BodyComposition[]>([]);
  const [loading, setLoading] = useState(true);

  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState<Metric>('weight');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getBodyCompositions(user.uid);
      setRecords(list);
      // 입력칸 기본값: 가장 최근 기록(없으면 프로필 체중)
      const last = list[list.length - 1];
      setWeight(String(last?.weight ?? profile?.weight ?? ''));
      if (last?.bodyFatPercent != null) setFat(String(last.bodyFatPercent));
      if (last?.skeletalMuscleMass != null) setMuscle(String(last.skeletalMuscleMass));
    } catch {
      // 조용히 실패 — 화면 유지
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSave() {
    setError('');
    const w = Number(weight);
    if (!w || w <= 0) {
      setError('체중을 입력해 주세요.');
      return;
    }
    if (!user || !profile) return;

    setSaving(true);
    try {
      const record: BodyComposition = {
        date: todayKey(),
        weight: w,
        createdAt: Date.now(),
      };
      if (fat.trim()) record.bodyFatPercent = Number(fat);
      if (muscle.trim()) record.skeletalMuscleMass = Number(muscle);
      await saveBodyComposition(user.uid, record);

      // 체중이 바뀌면 프로필·목표도 최신화 (북극성 유지)
      if (w !== profile.weight) {
        const goal: GoalMode = profile.goalMode ?? 'maintain';
        const tdee = calcTargetCalories(
          profile.gender,
          w,
          profile.height,
          profile.birthDate,
          profile.activityLevel
        );
        await saveProfile(user.uid, {
          ...profile,
          weight: w,
          targetCalories: calcGoalCalories(tdee, goal),
          targetProtein: calcTargetProtein(w, goal),
        });
        await refreshProfile();
      }
      await load();
    } catch {
      setError('저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  // 선택한 지표의 추이 데이터(값이 있는 기록만, 최근 12개)
  const series = useMemo(
    () =>
      records
        .filter((r) => r[metric] != null)
        .map((r) => ({ date: r.date, value: r[metric] as number }))
        .slice(-12),
    [records, metric]
  );

  const unit = METRICS.find((m) => m.key === metric)!.unit;
  const latest = series.length ? series[series.length - 1].value : null;
  const delta =
    series.length >= 2 ? latest! - series[series.length - 2].value : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>체성분</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          {/* 입력 카드 */}
          <View style={styles.inputCard}>
            <Text style={styles.cardTitle}>오늘 기록</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>체중 (kg) *</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="예: 68.5"
              placeholderTextColor="#9AA0A6"
            />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>체지방률 (%)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  placeholder="선택"
                  placeholderTextColor="#9AA0A6"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>골격근량 (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={muscle}
                  onChangeText={setMuscle}
                  keyboardType="decimal-pad"
                  placeholder="선택"
                  placeholderTextColor="#9AA0A6"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? '저장 중…' : '오늘 체성분 저장'}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>같은 날 다시 저장하면 오늘 기록을 덮어써요.</Text>
          </View>

          {/* 추이 */}
          <Text style={styles.sectionTitle}>추이</Text>
          <View style={styles.metricRow}>
            {METRICS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.metricTab, metric === m.key && styles.metricTabActive]}
                onPress={() => setMetric(m.key)}>
                <Image source={m.icon} style={styles.metricIcon} resizeMode="contain" />
                <Text
                  style={[styles.metricText, metric === m.key && styles.metricTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color="#208AEF" style={{ marginTop: 24 }} />
          ) : series.length === 0 ? (
            <View style={styles.empty}>
              <Image
                source={require('../assets/images/coach-avatar.png')}
                style={styles.emptyMascot}
              />
              <Text style={styles.emptyText}>
                아직 기록이 없어요.{'\n'}위에서 첫 기록을 저장해 보세요!
              </Text>
            </View>
          ) : (
            <View style={styles.chartCard}>
              <View style={styles.chartTop}>
                <Text style={styles.chartLatest}>
                  {latest}
                  <Text style={styles.chartUnit}> {unit}</Text>
                </Text>
                {delta != null ? (
                  <Text
                    style={[
                      styles.chartDelta,
                      { color: delta === 0 ? '#9AA0A6' : delta > 0 ? '#E5484D' : '#30A46C' },
                    ]}>
                    직전 대비 {delta > 0 ? '+' : ''}
                    {Number(delta.toFixed(1))} {unit}
                  </Text>
                ) : null}
              </View>
              <BarChart data={series} unit={unit} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 라이브러리 없이 View로 그리는 막대 추이 차트
function BarChart({
  data,
  unit,
}: {
  data: { date: string; value: number }[];
  unit: string;
}) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  // 최소값도 보이도록 15%~100% 범위로 정규화
  const heightPct = (v: number) => (range === 0 ? 60 : 15 + ((v - min) / range) * 85);

  return (
    <View style={styles.chart}>
      {data.map((d, i) => (
        <View key={d.date + i} style={styles.barCol}>
          <Text style={styles.barValue}>{Number(d.value.toFixed(1))}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${heightPct(d.value)}%` }]} />
          </View>
          <Text style={styles.barDate}>{d.date.slice(5)}</Text>
        </View>
      ))}
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

  inputCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#000', marginBottom: 6 },
  error: { color: '#E5484D', fontSize: 14, marginTop: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#3C4043', marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#000',
  },
  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#9AA0A6', marginTop: 8, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: 24, marginBottom: 10 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metricTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  metricIcon: { width: 20, height: 20 },
  metricTabActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  metricText: { fontSize: 14, color: '#60646C', fontWeight: '700' },
  metricTextActive: { color: '#fff' },

  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyMascot: { width: 88, height: 88, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9AA0A6', textAlign: 'center', lineHeight: 21 },

  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  chartTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  chartLatest: { fontSize: 26, fontWeight: '800', color: '#000' },
  chartUnit: { fontSize: 15, fontWeight: '600', color: '#9AA0A6' },
  chartDelta: { fontSize: 13, fontWeight: '700' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, color: '#60646C', marginBottom: 4 },
  barTrack: { width: '70%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#208AEF', borderRadius: 6, minHeight: 4 },
  barDate: { fontSize: 9, color: '#9AA0A6', marginTop: 6 },
});
