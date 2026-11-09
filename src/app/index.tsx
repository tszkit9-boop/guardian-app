// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Linking } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
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
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [destination, setDestination] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [duration, setDuration] = useState('30');
  const [isGuarding, setIsGuarding] = useState(false);
  const [locationText, setLocationText] = useState('僅在你同意後分享定位');
  const [timeLeft, setTimeLeft] = useState(0); 
  const timerRef = useRef(null);

  const [activeGuardians, setActiveGuardians] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');

  const handleAuth = async () => {
    if (!username || !password) return Alert.alert('提示', '請輸入名稱同密碼！');
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);
      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          setCurrentUser(username);
          setView('guard');
        } else Alert.alert('錯誤', '名稱或密碼錯誤！');
      } else {
        if (userSnap.exists()) Alert.alert('錯誤', '名稱已被使用！');
        else {
          await setDoc(userRef, { username, password });
          Alert.alert('成功', '註冊成功！請登入。');
          setIsLoginMode(true);
        }
      }
    } catch (e) { Alert.alert('錯誤', '網絡問題。'); }
  };

  const startGuardian = async () => {
    if (!destination || !contactPhone) return Alert.alert('提示', '請填寫目的地同聯絡人！');
    const minutes = parseInt(duration);
    if (isNaN(minutes) || minutes <= 0) return Alert.alert('提示', '請輸入正確預計時間！');

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
        username: currentUser, lat: latitude, lng: longitude, address: addressString,
        destination: destination, contactPhone: contactPhone, status: 'guarding', updatedAt: new Date().toISOString()
      });

      setLocationText(`已定位：${addressString}`);
      setIsGuarding(true);
      setTimeLeft(minutes * 60); 
    } catch (error) { setLocationText('定位出錯'); }
  };

  useEffect(() => {
    if (isGuarding && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (isGuarding && timeLeft === 0) {
      clearInterval(timerRef.current);
      autoTriggerSOS();
    }
    return () => clearInterval(timerRef.current);
  }, [isGuarding, timeLeft]);

  const autoTriggerSOS = async () => {
    Alert.alert('⚠️ 逾時警告', '你已超過預計時間未報平安，系統已自動發出求救！');
    await addDoc(collection(db, "sos_alerts"), {
      username: currentUser, address: locationText, contactPhone: contactPhone, isAuto: true
    });
  };

  const stopGuardian = async () => {
    clearInterval(timerRef.current);
    await setDoc(doc(db, "locations", currentUser), { status: 'arrived' }, { merge: true });
    setIsGuarding(false);
    setTimeLeft(0);
    setLocationText('僅在你同意後分享定位');
    Alert.alert('安全抵達', '已通知後台你安全抵達。');
  };

  const triggerSOS = async () => {
    Alert.alert('確認求救', '確定要發出緊急求救嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '確定', style: 'destructive', onPress: async () => {
          clearInterval(timerRef.current);
          await addDoc(collection(db, "sos_alerts"), {
            username: currentUser, address: locationText, contactPhone: contactPhone, isAuto: false
          });
          Alert.alert('求救已發出', '管理員已收到通知！');
      }}
    ]);
  };

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);
  const startVideoCall = (roomName) => Linking.openURL(`https://meet.jit.si/guardian-${roomName}`);

  useEffect(() => {
    if (currentUser === 'tszkit9' && view === 'admin') {
      const unsubLoc = onSnapshot(collection(db, "locations"), (snapshot) => {
        const locs = [];
        snapshot.forEach(doc => { if (doc.data().status === 'guarding') locs.push(doc.data()); });
        setActiveGuardians(locs);
      });
      const unsubSOS = onSnapshot(collection(db, "sos_alerts"), (snapshot) => {
        const alerts = [];
        snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
        setSosAlerts(alerts);
      });
      getDocs(collection(db, "users")).then(snap => { const u=[]; snap.forEach(d => u.push(d.id)); setAllUsers(u); });
      getDocs(collection(db, "admins")).then(snap => { const a=[]; snap.forEach(d => a.push(d.id)); setAdminList(a); });
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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
          <Text style={{ textAlign: 'center', color: '#2196F3', fontSize: 16 }}>{isLoginMode ? '未有名稱？去註冊' : '已經有帳戶？去登入'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>👤 {currentUser}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {currentUser === 'tszkit9' && (
            <TouchableOpacity onPress={() => setView(view === 'guard' ? 'admin' : 'guard')} style={styles.navBtn}>
              <Text style={styles.navBtnText}>{view === 'guard' ? '⚙️ 管理員後台' : '🏠 返回首頁'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setCurrentUser(null); setView('guard'); }} style={[styles.navBtn, { backgroundColor: '#F44336' }]}>
            <Text style={styles.navBtnText}>登出</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <View style={styles.card}>
                <Text style={styles.label}>⏱️ 預計需要時間（分鐘）</Text>
                <TextInput style={styles.input} placeholder="例如: 30" value={duration} onChangeText={setDuration} keyboardType="numeric" />
              </View>
              <TouchableOpacity style={styles.button} onPress={startGuardian}>
                <Text style={styles.buttonText}>開始安全陪伴</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.guardingBox}>
              <Text style={styles.guardingText}>🛡️ 守護中...前往 {destination}</Text>
              
              <View style={{ alignItems: 'center', marginVertical: 15 }}>
                <Text style={{ fontSize: 16, color: '#666' }}>預計剩餘時間</Text>
                <Text style={{ fontSize: 48, fontWeight: 'bold', color: timeLeft < 300 ? '#D32F2F' : '#2E7D32' }}>
                  {formatTime(timeLeft)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#2196F3', marginTop: 0 }]} onPress={() => callPhone(contactPhone)}>
                  <Text style={styles.buttonText}>📞 致電聯絡人</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#9C27B0', marginTop: 0 }]} onPress={() => startVideoCall(currentUser)}>
                  <Text style={styles.buttonText}>📹 視像通話</Text>
                </TouchableOpacity>
              </View>

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

      {view === 'admin' && currentUser === 'tszkit9' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>👑 管理員控制台</Text>

          {sosAlerts.length > 0 && (
            <View style={[styles.card, { backgroundColor: '#FFEBEE', borderColor: '#D32F2F', borderWidth: 1 }]}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#D32F2F', marginBottom: 10 }}>🚨 緊急求救！</Text>
              {sosAlerts.map((alert) => (
                <View key={alert.id} style={{ marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#FFCDD2', paddingBottom: 5 }}>
                  <Text style={{ fontWeight: 'bold' }}>用戶：{alert.username} {alert.isAuto && '(逾時)'}</Text>
                  <Text>位置：{alert.address}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.button, { flex: 1, padding: 8, backgroundColor: '#D32F2F' }]} onPress={() => callPhone(alert.contactPhone)}>
                      <Text style={styles.buttonText}>📞 致電</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { flex: 1, padding: 8, backgroundColor: '#9C27B0' }]} onPress={() => startVideoCall(alert.username)}>
                      <Text style={styles.buttonText}>📹 視訊</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>📍 實時守護監控 ({activeGuardians.length})</Text>
            {activeGuardians.length === 0 ? <Text style={{color:'#999'}}>目前無人需要守護。</Text> : 
              activeGuardians.map((g, i) => (
                <View key={i} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>👤 {g.username}</Text>
                  <Text>目的地：{g.destination}</Text>
                  <Text>位置：{g.address}</Text>
                  
                  <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${g.lat},${g.lng}`)}>
                    <Text style={{ color: '#2196F3', marginTop: 5, fontWeight: 'bold' }}>🗺️ 喺 Google Maps 睇位置</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.button, { flex: 1, padding: 8, backgroundColor: '#2196F3' }]} onPress={() => callPhone(g.contactPhone)}>
                      <Text style={styles.buttonText}>📞 致電</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { flex: 1, padding: 8, backgroundColor: '#9C27B0' }]} onPress={() => startVideoCall(g.username)}>
                      <Text style={styles.buttonText}>📹 視訊</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            }
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>👑 新增管理員</Text>
            <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="輸入朋友名稱" />
            <TouchableOpacity style={styles.button} onPress={addAdmin}><Text style={styles.buttonText}>確認新增</Text></TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>👥 註冊用戶總數：{allUsers.length} 人</Text>
            <Text style={{color: '#666', fontSize: 12, marginTop: 5}}>名單：{allUsers.join(', ')}</Text>
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
});
