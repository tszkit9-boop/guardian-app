// @ts-nocheck
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const firebaseConfig = {
  apiKey: "AIzaSyAZNQcRCFis8e3aYy7b3nxd8pafzNgYw",
  authDomain: "guardian-app-f23c6.firebaseapp.com",
  projectId: "guardian-app-f23c6",
  storageBucket: "guardian-app-f23c6.firebasestorage.app",
  messagingSenderId: "1075988300124",
  appId: "1:1075988300124:web:59be47526be9800e6e60199",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const router = useRouter();

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert('提示', '請輸入名稱同密碼！');
      return;
    }

    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          // 登入成功，儲存個名落瀏覽器
          localStorage.setItem('currentUser', username);
          Alert.alert('成功', `歡迎返嚟，${username}！`);
          router.push('/admin');
        } else {
          Alert.alert('錯誤', '名稱或密碼錯誤！');
        }
      } else {
        if (userSnap.exists()) {
          Alert.alert('錯誤', '呢個名稱已經有人用咗啦！');
        } else {
          await setDoc(userRef, { username: username, password: password });
          Alert.alert('成功', '註冊成功！請撳登入。');
          setIsLoginMode(true);
        }
      }
    } catch (error) {
      Alert.alert('系統錯誤', '請檢查網絡。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛡️ 守護同行</Text>
      <Text style={styles.subtitle}>{isLoginMode ? '登入帳戶' : '註冊新帳戶'}</Text>

      <TextInput style={styles.input} placeholder="輸入名稱 " value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="輸入密碼" value={password} onChangeText={setPassword} secureTextEntry />
      
      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isLoginMode ? '登入' : '確認註冊'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: 'center', color: '#2196F3', fontSize: 16 }}>
          {isLoginMode ? '未有名稱？去註冊' : '已經有帳戶？去登入'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F5F5' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
