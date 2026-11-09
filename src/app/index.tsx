// @ts-nocheck
import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import * as Location from 'expo-location';

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
  // --- 狀態管理 ---
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('guard'); // 'guard' 或 'admin'
  
  // 登入/註冊用
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 守護功能用
  const [destination, setDestination] = useState('');
  const [isGuarding, setIsGuarding] = useState(false);
  const [locationText, setLocationText] = useState('僅在你同意後分享定位');

  // 管理員功能用
  const [newAdminName, setNewAdminName] = useState('');
  const [adminList, setAdminList] = useState([]);

  // --- 登入/註冊邏輯 ---
  const handleAuth = async () => {
    if (!username || !password) return Alert.alert('提示', '請輸入名稱同密碼！');
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          setCurrentUser(username);
          setView('guard'); // 登入後預設去守護主頁
          if (username === 'tszkit9') fetchAdmins();
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

  // --- 守護功能邏輯 ---
  const startGuardian = async () => {
    if (!destination) return Alert.alert('提示', '請輸入目的地！');
    setLocationText('獲取定位中...');

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('定位失敗：沒有權限');
        return Alert.alert('錯誤', '需要定位權限！');
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // 上傳去 Firebase
      await setDoc(doc(db, "locations", "user1"), {
        lat: latitude,
        lng: longitude,
        destination: destination,
        updatedAt: new Date().toISOString()
      });

      setLocationText(`已定位並上傳：${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setIsGuarding(true);
      Alert.alert('守護開始', `正在守護你前往：${destination}`);
    } catch (error) {
      console.error(error);
      setLocationText('定位出錯');
      Alert.alert('錯誤', '無法獲取定位。');
    }
  };

  // --- 管理員邏輯 ---
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

  // ================= 介面渲染 =================

  // 1. 如果未登入，顯示登入畫面
  if (!currentUser) {
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

  // 2. 如果已登入，顯示主介面 (包含頂部導航)
  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* 頂部導航列 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>👤 {currentUser}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {currentUser === 'tszkit9' && (
            <TouchableOpacity onPress={() => setView(view === 'guard' ? 'admin' : 'guard')} style={styles.navBtn}>
              <Text style={styles.navBtnText}>{view === 'guard' ? '⚙️ 管理員後台' : '🏠 返回首頁'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setCurrentUser(null)} style={[styles.navBtn, { backgroundColor: '#F44336' }]}>
            <Text style={styles.navBtnText}>登出</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 守護主頁 View */}
      {view === 'guard' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>守護同行 Guardian</Text>
          <Text style={styles.subtitle}>晚上 10:30 · 準備回家了嗎？</Text>

          <View style={styles.card}>
            <Text style={styles.label}>📍 現在位置</Text>
            <Text style={styles.locationText}>{locationText}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>🏠 目的地</Text>
            <TextInput style={styles.input} placeholder="輸入安全抵達地點" value={destination} onChangeText={setDestination} />
          </View>

          {!isGuarding ? (
            <TouchableOpacity style={styles.button} onPress={startGuardian}>
              <Text style={styles.buttonText}>開始安全陪伴</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.guardingBox}>
              <Text style={styles.guardingText}>🛡️ 守護中...</Text>
              <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={() => setIsGuarding(false)}>
                <Text style={styles.buttonText}>我已安全抵達</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* 管理員後台 View */}
      {view === 'admin' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>👑 管理員控制台</Text>
          
          <View style={styles.card}>
            <Text style={styles.label}>新增管理員 (輸入名稱)：</Text>
            <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="輸入朋友名稱" />
            <TouchableOpacity style={styles.button} onPress={addAdmin}>
              <Text style={styles.buttonText}>確認新增</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>目前管理員名單：</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {adminList.map((name) => <Text key={name} style={styles.listItem}>• {name}</Text>)}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F5F5' },
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DDD' },
  headerText: { fontSize: 16, fontWeight: 'bold' },
  navBtn: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  navBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  locationText: { fontSize: 14, color: '#999' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  guardingBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginTop: 20 },
  guardingText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10 },
  stopButton: { backgroundColor: '#FF9800' },
  listItem: { fontSize: 16, color: '#333', marginBottom: 5 }
});
