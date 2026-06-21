// 운동 기록 화면 — 유산소/근력 선택 → 운동 종류 → 시간 입력 → 소모칼로리 자동계산 → 저장
// 소모 칼로리 = MET × 체중 × 시간(h). 체중은 프로필 기준, 사용자가 칼로리 직접 수정 가능.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { saveExercise } from '@/services/exercises';
import type { ExerciseType } from '@/types';
import { calcCaloriesBurned } from '@/utils/calories';
import { nowTime, todayKey } from '@/utils/date';
import {
  EXERCISE_PRESETS,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_ORDER,
} from '@/utils/exercise';

export default function AddExerciseScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const weight = profile?.weight ?? 60; // 소모칼로리 계산용 체중

  const [type, setType] = useState<ExerciseType>('cardio');
  const [name, setName] = useState('');
  const [met, setMet] = useState<number | null>(null); // 선택한 프리셋의 MET
  const [duration, setDuration] = useState('30'); // 분
  const [calories, setCalories] = useState(''); // 소모 칼로리(수정 가능)
  const [caloriesEdited, setCaloriesEdited] = useState(false); // 사용자가 직접 고쳤는지
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const presets = EXERCISE_PRESETS[type];

  // 프리셋·시간 기반 자동 추정 칼로리
  const autoCalories = useMemo(() => {
    const mins = Number(duration) || 0;
    if (!met || mins <= 0) return 0;
    return calcCaloriesBurned(met, weight, mins);
  }, [met, duration, weight]);

  // 화면에 표시할 칼로리(사용자가 수정했으면 그 값, 아니면 자동값)
  const shownCalories = caloriesEdited ? calories : autoCalories ? String(autoCalories) : '';

  function selectPreset(p: { name: string; met: number }) {
    setName(p.name);
    setMet(p.met);
    setCaloriesEdited(false); // 다시 자동계산으로
  }

  function changeType(t: ExerciseType) {
    if (t === type) return;
    setType(t);
    setName('');
    setMet(null);
    setCaloriesEdited(false);
  }

  async function handleSave() {
    setError('');
    const mins = Number(duration) || 0;
    const kcal = Number(shownCalories) || 0;
    if (!name.trim()) {
      setError('운동 종류를 선택하거나 입력해 주세요.');
      return;
    }
    if (mins <= 0) {
      setError('운동 시간을 입력해 주세요.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await saveExercise(user.uid, {
        date: todayKey(),
        type,
        name: name.trim(),
        durationMin: mins,
        caloriesBurned: kcal,
        createdAt: Date.now(),
      });
      router.back();
    } catch {
      setError('저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>운동 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* 운동 종류(유산소/근력) */}
          <Text style={styles.label}>운동 종류</Text>
          <View style={styles.typeRow}>
            {EXERCISE_TYPE_ORDER.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeTab, type === t && styles.typeTabActive]}
                onPress={() => changeType(t)}>
                <Text style={[styles.typeTabText, type === t && styles.typeTabTextActive]}>
                  {EXERCISE_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 프리셋 선택 */}
          <Text style={styles.label}>운동 선택</Text>
          <View style={styles.presetWrap}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[styles.preset, name === p.name && styles.presetActive]}
                onPress={() => selectPreset(p)}>
                <Text style={[styles.presetText, name === p.name && styles.presetTextActive]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 직접 입력(선택 안 한 운동) */}
          <Text style={styles.label}>운동 이름 (직접 수정 가능)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setMet(null); // 직접 입력 시 MET 자동계산 해제
            }}
            placeholder="예: 빠르게 걷기"
            placeholderTextColor="#9AA0A6"
          />

          {/* 시간 */}
          <Text style={styles.label}>운동 시간 (분)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor="#9AA0A6"
          />

          {/* 소모 칼로리 (자동계산 + 수정 가능) */}
          <Text style={styles.label}>소모 칼로리 (kcal)</Text>
          <TextInput
            style={styles.input}
            value={shownCalories}
            onChangeText={(v) => {
              setCalories(v);
              setCaloriesEdited(true);
            }}
            keyboardType="number-pad"
            placeholder="운동을 선택하면 자동 계산돼요"
            placeholderTextColor="#9AA0A6"
          />
          <Text style={styles.hint}>
            {met
              ? `체중 ${weight}kg 기준 자동 추정값이에요. 직접 고쳐도 돼요.`
              : '운동을 선택하면 체중·시간으로 자동 계산돼요. 직접 입력도 가능해요.'}
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '저장 중…' : '운동 저장하기'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  cancel: { fontSize: 16, color: '#60646C' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  container: { paddingHorizontal: 20, paddingBottom: 40 },

  error: { color: '#E5484D', fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#3C4043', marginTop: 18, marginBottom: 8 },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeTabActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  typeTabText: { fontSize: 15, color: '#60646C', fontWeight: '700' },
  typeTabTextActive: { color: '#fff' },

  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  presetActive: { backgroundColor: '#E7F1FE', borderColor: '#208AEF' },
  presetText: { fontSize: 14, color: '#3C4043', fontWeight: '600' },
  presetTextActive: { color: '#208AEF' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#000',
  },
  hint: { fontSize: 12, color: '#9AA0A6', marginTop: 6 },

  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
