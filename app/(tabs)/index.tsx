// 홈 대시보드 (Day 1 버전)
// 지금은 프로필 + 목표 칼로리만 표시. Day 2~3에 식사 기록/섭취 현황을 채웁니다.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { signOut } from '@/services/auth';
import { calcAge } from '@/utils/calories';

export default function HomeScreen() {
  const { profile } = useAuth();

  if (!profile) return null; // _layout이 분기 처리하므로 보통 도달하지 않음

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요,</Text>
            <Text style={styles.name}>{profile.name}님 👋</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.logout}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 오늘의 목표 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>오늘의 목표 칼로리</Text>
          <Text style={styles.bigNumber}>
            {profile.targetCalories.toLocaleString()}
            <Text style={styles.unit}> kcal</Text>
          </Text>
          <Text style={styles.cardHint}>
            식사를 기록하면 남은 칼로리가 여기에 표시됩니다 (Day 2에서 추가)
          </Text>
        </View>

        {/* 프로필 요약 */}
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
      </View>
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 15, color: '#60646C' },
  name: { fontSize: 24, fontWeight: '800', color: '#000', marginTop: 2 },
  logout: { fontSize: 14, color: '#9AA0A6' },
  card: {
    backgroundColor: '#208AEF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardLabel: { color: '#D6E9FF', fontSize: 14, fontWeight: '600' },
  bigNumber: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 6 },
  unit: { fontSize: 18, fontWeight: '600' },
  cardHint: { color: '#D6E9FF', fontSize: 12, marginTop: 8 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 15, color: '#60646C' },
  infoValue: { fontSize: 15, color: '#000', fontWeight: '600' },
  disclaimer: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 16,
    lineHeight: 18,
  },
});
