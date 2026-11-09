import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router'; // 用嚟跳去後台

// ⚠️ 貼你嘅 Config
const firebaseConfig = {
  apiKey: "AIzaSyAZNQcRCFis8e3aYy7b3nxd8pafzNgYw",
  authDomain: "guardian-app-f23c6.firebaseapp.com",
  projectId: "guardian-app-f23c6",
  storageBucket: "guardian-app-f23c6.firebasestorage.app",
  messagingSenderId: "1075988300124",
  appId: "1:1075988300124:web:59be47526be9800e6e60199",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => Alert.alert('成功', '帳戶已建立！'))
      .catch((error) => Alert.alert('錯誤', error.message));
  };

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => Alert.alert('成功', '登入成功！'))
      .catch((error) => Alert.alert('錯誤', '登入失敗，請檢查帳號密碼。'));
  };

  const handleLogout = () => signOut(auth);

  // 如果已登入，顯示歡迎畫面
  if (user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>👋 歡迎，{user.email}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/admin')}>
          <Text style={styles.buttonText}>進入管理員後台</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#F44336' }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>登出</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 未登入，顯示登入畫面
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛡️ 守護同行 登入</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="密碼" value={password} onChangeText={setPassword} secureTextEntry />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>登入</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#2196F3' }]} onPress={handleSignUp}>
        <Text style={styles.buttonText}>註冊新帳號</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F5F5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
