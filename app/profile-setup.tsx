// 최초 프로필 입력 화면 — 저장 시 목표 칼로리 자동 계산

import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { saveProfile } from '@/services/users';
import type { ActivityLevel, Gender, GoalMode, UserProfile } from '@/types';
import {
  ACTIVITY_LABELS,
  calcGoalCalories,
  calcTargetCalories,
  calcTargetProtein,
  GOAL_DESC,
  GOAL_LABELS,
  GOAL_ORDER,
} from '@/utils/calories';

const ACTIVITY_ORDER: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalMode, setGoalMode] = useState<GoalMode>('maintain');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateBirth(s: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }

  async function handleSave() {
    setError('');
    const h = Number(height);
    const w = Number(weight);

    if (!name.trim()) return setError('이름을 입력해 주세요.');
    if (!validateBirth(birthDate))
      return setError('생년월일을 YYYY-MM-DD 형식으로 입력해 주세요. (예: 1985-03-15)');
    if (!h || h < 80 || h > 250) return setError('키를 올바르게 입력해 주세요. (cm)');
    if (!w || w < 20 || w > 300) return setError('몸무게를 올바르게 입력해 주세요. (kg)');
    if (!user) return setError('로그인 정보를 찾을 수 없습니다.');

    const tdee = calcTargetCalories(gender, w, h, birthDate, activityLevel);
    const targetCalories = calcGoalCalories(tdee, goalMode);
    const targetProtein = calcTargetProtein(w, goalMode);

    const profile: UserProfile = {
      name: name.trim(),
      birthDate,
      gender,
      height: h,
      weight: w,
      activityLevel,
      goalMode,
      targetCalories,
      targetProtein,
      targetBloodSugar: { fasting: 100, postMeal: 140 },
      createdAt: Date.now(),
      role: 'user',
    };

    setLoading(true);
    try {
      await saveProfile(user.uid, profile);
      await refreshProfile(); // _layout이 홈으로 이동시킴
    } catch {
      setError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/images/mascot-wave.png')} style={styles.mascot} />
        <Text style={styles.title}>프로필 입력</Text>
        <Text style={styles.subtitle}>목표 칼로리를 계산하기 위한 기본 정보예요</Text>

        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          placeholder="홍길동"
          placeholderTextColor="#9AA0A6"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>생년월일</Text>
        <TextInput
          style={styles.input}
          placeholder="1985-03-15"
          placeholderTextColor="#9AA0A6"
          keyboardType="numbers-and-punctuation"
          value={birthDate}
          onChangeText={setBirthDate}
        />

        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          <Chip label="남성" active={gender === 'male'} onPress={() => setGender('male')} />
          <Chip label="여성" active={gender === 'female'} onPress={() => setGender('female')} />
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>키 (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="175"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>몸무게 (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        </View>

        <Text style={styles.label}>활동 수준</Text>
        {ACTIVITY_ORDER.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.activityItem, activityLevel === level && styles.activityActive]}
            onPress={() => setActivityLevel(level)}>
            <Text
              style={[
                styles.activityText,
                activityLevel === level && styles.activityTextActive,
              ]}>
              {ACTIVITY_LABELS[level]}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>목표</Text>
        <View style={styles.row}>
          {GOAL_ORDER.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.goalChip, goalMode === g && styles.goalChipActive]}
              onPress={() => setGoalMode(g)}>
              <Text style={[styles.goalLabel, goalMode === g && styles.goalLabelActive]}>
                {GOAL_LABELS[g]}
              </Text>
              <Text style={[styles.goalDesc, goalMode === g && styles.goalDescActive]}>
                {GOAL_DESC[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>저장하고 시작하기</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 24, paddingVertical: 24 },
  mascot: { width: 96, height: 96, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#000' },
  subtitle: { fontSize: 14, color: '#60646C', marginTop: 6, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  row: { flexDirection: 'row', gap: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 15, color: '#60646C', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  goalChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goalChipActive: { backgroundColor: '#EAF3FF', borderColor: '#208AEF' },
  goalLabel: { fontSize: 15, color: '#3C4043', fontWeight: '700' },
  goalLabelActive: { color: '#1666C2' },
  goalDesc: { fontSize: 11, color: '#9AA0A6', marginTop: 3 },
  goalDescActive: { color: '#1666C2' },
  activityItem: {
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  activityActive: { backgroundColor: '#EAF3FF', borderColor: '#208AEF' },
  activityText: { fontSize: 14, color: '#3C4043' },
  activityTextActive: { color: '#1666C2', fontWeight: '700' },
  error: { color: '#E5484D', fontSize: 14, marginTop: 16, textAlign: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
