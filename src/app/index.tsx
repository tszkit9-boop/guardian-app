// @ts-nocheck
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Admin 狀態
  const [newAdminName, setNewAdminName] = useState('');
  const [adminList, setAdminList] = useState([]);

  // 登入/註冊邏輯
  const handleAuth = async () => {
    if (!username || !password) return Alert.alert('提示', '請輸入名稱同密碼！');
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          setCurrentUser(username);
          if (username === 'tszkit9') fetchAdmins(); // 如果係 super admin，即時攞名單
        } else {
          Alert.alert('錯誤', '名稱或密碼錯誤！');
        }
      } else {
        if (userSnap.exists()) {
          Alert.alert('錯誤', '名稱已被使用！');
        } else {
          await setDoc(userRef, { username, password });
          Alert.alert('成功', '註冊成功！請登入。');
          setIsLoginMode(true);
        }
      }
    } catch (e) {
      Alert.alert('錯誤', '網絡問題，請重試。');
    }
  };

  // Admin 功能
  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "admins"));
    const names = [];
    querySnapshot.forEach((doc) => names.push(doc.id));
    setAdminList(names);
  };

  const addAdmin = async () => {
    if (!newAdminName) return Alert.alert('請輸入名稱');
    await setDoc(doc(db, "admins", newAdminName), { role: "admin" });
    Alert.alert('成功', `${newAdminName} 已成為管理員！`);
    setNewAdminName('');
    fetchAdmins();
  };

  // 1. 如果已登入，顯示控制台
  if (currentUser) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <Text style={styles.titleWhite}>👑 歡迎，{currentUser}</Text>
        {currentUser === 'tszkit9' ? (
          <View>
            <View style={styles.card}>
              <Text style={styles.label}>新增管理員：</Text>
              <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="輸入朋友名稱" />
              <TouchableOpacity style={styles.button} onPress={addAdmin}>
                <Text style={styles.buttonText}>確認新增</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>目前管理員：</Text>
              {adminList.map((name) => <Text key={name} style={{color:'#FFF'}}>• {name}</Text>)}
            </View>
          </View>
        ) : (
          <Text style={{color:'#FFF', textAlign:'center'}}>你而家係普通用戶。</Text>
        )}
        <TouchableOpacity style={[styles.button, {backgroundColor: '#F44336', marginTop: 20}]} onPress={() => setCurrentUser(null)}>
          <Text style={styles.buttonText}>登出</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 2. 未登入，顯示登入/註冊畫面
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛡️ 守護同行</Text>
      <Text style={styles.subtitle}>{isLoginMode ? '登入帳戶' : '註冊新帳戶'}</Text>

      <TextInput style={styles.input} placeholder="輸入名稱" value={username} onChangeText={setUsername} autoCapitalize="none" />
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
  containerDark: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#1E1E1E' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  titleWhite: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#FFF' },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#2D2D2D', padding: 15, borderRadius: 10, marginBottom: 20 },
  label: { color: '#AAA', marginBottom: 10 },
});
