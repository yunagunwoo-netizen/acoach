// 로그인 상태 + 프로필을 앱 전체에서 공유하는 Context

import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase';
import { getProfile } from '@/services/users';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean; // 최초 인증 상태 확인 중
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const p = await getProfile(uid);
    setProfile(p);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.uid);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
