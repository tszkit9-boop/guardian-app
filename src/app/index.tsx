// @ts-nocheck
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Linking } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('guard');
  
  // 登入/註冊狀態
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 守護功能狀態
  const [destination, setDestination] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isGuarding, setIsGuarding] = useState(false);
  const [locationText, setLocationText] = useState('僅在你同意後分享定位');

  // 後台管理狀態
  const [activeGuardians, setActiveGuardians] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');

  // 登入/註冊
  const handleAuth = async () => {
    if (!username || !password) return Alert.alert('提示', '請輸入名稱同密碼！');
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          setCurrentUser(username);
          setView('guard');
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

  // 開始守護
  const startGuardian = async () => {
    if (!destination || !contactPhone) return Alert.alert('提示', '請填寫目的地同聯絡人！');
    setLocationText('正在獲取位置及地址...');

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('錯誤', '需要定位權限！');

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      let addressString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const addr = geocode[0];
          addressString = `${addr.region || ''} ${addr.city || ''} ${addr.district || ''} ${addr.street || ''}`.trim();
        }
      } catch (e) {}

      await setDoc(doc(db, "locations", currentUser), {
        username: currentUser,
        lat: latitude,
        lng: longitude,
        address: addressString,
        destination: destination,
        contactPhone: contactPhone,
        updatedAt: new Date().toISOString()
      });

      setLocationText(`已定位：${addressString}`);
      setIsGuarding(true);
    } catch (error) {
      setLocationText('定位出錯');
    }
  };

  // 結束守護
  const stopGuardian = async () => {
    await setDoc(doc(db, "locations", currentUser), { status: 'arrived' }, { merge: true });
    setIsGuarding(false);
    setLocationText('僅在你同意後分享定位');
    Alert.alert('安全抵達', '已通知後台你安全抵達。');
  };

  // 觸發 SOS
  const triggerSOS = async () => {
    Alert.alert('確認求救', '確定要發出緊急求救嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '確定', style: 'destructive', onPress: async () => {
          await addDoc(collection(db, "sos_alerts"), {
            username: currentUser,
            address: locationText,
            contactPhone: contactPhone,
            timestamp: serverTimestamp()
          });
          Alert.alert('求救已發出', '管理員已收到通知！');
      }}
    ]);
  };

  // 視像通話 (Jitsi)
  const startVideoCall = () => {
    Linking.openURL(`https://meet.jit.si/guardian-room-${currentUser}`);
  };

  // 🔥 管理員專用：實時監聽 Firebase 數據
  useEffect(() => {
    if (currentUser === 'tszkit9' && view === 'admin') {
      // 1. 監聽守護中嘅用戶
      const unsubLoc = onSnapshot(collection(db, "locations"), (snapshot) => {
        const locs = [];
        snapshot.forEach(doc => {
          if (doc.data().status !== 'arrived') locs.push(doc.data());
        });
        setActiveGuardians(locs);
      });

      // 2. 監聽 SOS
      const unsubSOS = onSnapshot(collection(db, "sos_alerts"), (snapshot) => {
        const alerts = [];
        snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
        setSosAlerts(alerts);
      });

      // 3. 攞所有用戶同 Admin
      getDocs(collection(db, "users")).then(snap => {
        const users = [];
        snap.forEach(doc => users.push(doc.id));
        setAllUsers(users);
      });
      getDocs(collection(db, "admins")).then(snap => {
        const admins = [];
        snap.forEach(doc => admins.push(doc.id));
        setAdminList(admins);
      });

      return () => { unsubLoc(); unsubSOS(); };
    }
  }, [currentUser, view]);

  const addAdmin = async () => {
    if (!newAdminName) return Alert.alert('請輸入名稱');
    await setDoc(doc(db, "admins", newAdminName), { role: "admin" });
    setAdminList([...adminList, newAdminName]);
    setNewAdminName('');
    Alert.alert('成功', `${newAdminName} 已成為管理員！`);
  };

  // ================= 介面 =================

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

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* 頂部導航 */}
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

      {/* 用戶守護介面 */}
      {view === 'guard' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>守護同行 Guardian</Text>
          
          <View style={styles.card}>
            <Text style={styles.label}>📍 現在位置</Text>
            <Text style={styles.locationText}>{locationText}</Text>
          </View>

          {!isGuarding ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>🏠 目的地</Text>
                <TextInput style={styles.input} placeholder="輸入安全抵達地點" value={destination} onChangeText={setDestination} />
              </View>
              <View style={styles.card}>
                <Text style={styles.label}>📞 緊急聯絡人電話</Text>
                <TextInput style={styles.input} placeholder="例如: 91234567" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
              </View>
              <TouchableOpacity style={styles.button} onPress={startGuardian}>
                <Text style={styles.buttonText}>開始安全陪伴</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.guardingBox}>
              <Text style={styles.guardingText}>🛡️ 守護中...前往 {destination}</Text>
              
              <TouchableOpacity style={[styles.button, { backgroundColor: '#2196F3' }]} onPress={startVideoCall}>
                <Text style={styles.buttonText}>📹 發起視像通話</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, { backgroundColor: '#D32F2F', marginTop: 15 }]} onPress={triggerSOS}>
                <Text style={styles.buttonText}>🚨 我感覺不安全 (SOS)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopGuardian}>
                <Text style={styles.buttonText}>我已安全抵達</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* 管理員後台介面 */}
      {view === 'admin' && currentUser === 'tszkit9' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>👑 管理員控制台</Text>

          {/* 1. SOS 緊急求救區 */}
          {sosAlerts.length > 0 && (
            <View style={[styles.card, { backgroundColor: '#FFEBEE', borderColor: '#D32F2F', borderWidth: 1 }]}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#D32F2F', marginBottom: 10 }}>🚨 緊急求救！</Text>
              {sosAlerts.map((alert) => (
                <View key={alert.id} style={{ marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#FFCDD2', paddingBottom: 5 }}>
                  <Text style={{ fontWeight: 'bold' }}>用戶：{alert.username}</Text>
                  <Text>位置：{alert.address}</Text>
                  <Text>聯絡人：{alert.contactPhone}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 2. 實時守護監控區 */}
          <View style={styles.card}>
            <Text style={styles.label}>📍 實時守護監控 ({activeGuardians.length})</Text>
            {activeGuardians.length === 0 ? <Text style={{color:'#999'}}>目前無人需要守護。</Text> : 
              activeGuardians.map((g, i) => (
                <View key={i} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>👤 {g.username}</Text>
                  <Text>目的地：{g.destination}</Text>
                  <Text>位置：{g.address}</Text>
                  <Text>聯絡人：{g.contactPhone}</Text>
                </View>
              ))
            }
          </View>

          {/* 3. 管理員設定區 */}
          <View style={styles.card}>
            <Text style={styles.label}>👑 新增管理員</Text>
            <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="輸入朋友名稱" />
            <TouchableOpacity style={styles.button} onPress={addAdmin}>
              <Text style={styles.buttonText}>確認新增</Text>
            </TouchableOpacity>
            <Text style={{ marginTop: 10, color: '#666' }}>目前名單：{adminList.join(', ') || '無'}</Text>
          </View>

          {/* 4. 用戶總覽區 */}
          <View style={styles.card}>
            <Text style={styles.label}>👥 註冊用戶總數：{allUsers.length} 人</Text>
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
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  locationText: { fontSize: 16, color: '#333', fontWeight: '500', marginTop: 5 },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#EEE', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  guardingBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginTop: 20 },
  guardingText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10 },
  stopButton: { backgroundColor: '#FF9800', marginTop: 15 },
  listItem: { fontSize: 16, color: '#333', marginBottom: 5 }
});
