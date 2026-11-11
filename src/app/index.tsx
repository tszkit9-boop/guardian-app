// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, SafeAreaView, ScrollView, Linking, Pressable, Platform, Modal } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

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
const storage = getStorage(app);

const showAlert = (title, msg) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
};
const showConfirm = (title, msg, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onConfirm();
  } else {
    Alert.alert(title, msg, [
      { text: '取消', style: 'cancel' },
      { text: '確定', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('guard'); 
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 表單記憶
  const [destination, setDestination] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('guard_dest') || '' : '');
  const [contactPhone, setContactPhone] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('guard_phone') || '' : '');
  const [duration, setDuration] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('guard_duration') || '30' : '30');

  const [isGuarding, setIsGuarding] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('guard_isGuarding') === 'true' : false);
  const [timeLeft, setTimeLeft] = useState(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('guard_timeLeft') || '0', 10) : 0);
  const timerRef = useRef(null);

  // 假電話 & 警報
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const audioRef = useRef(null);

  // 錄影
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 管理員數據
  const [activeGuardians, setActiveGuardians] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [historyList, setHistoryList] = useState([]); // 🌟 歷史紀錄
  const [allUsers, setAllUsers] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 自動儲存狀態
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guard_isGuarding', isGuarding.toString());
      localStorage.setItem('guard_timeLeft', timeLeft.toString());
    }
  }, [isGuarding, timeLeft]);

  const handleAuth = async () => {
    if (!username || !password) return showAlert('提示', '請輸入名稱同密碼！');
    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);
      if (isLoginMode) {
        if (userSnap.exists() && userSnap.data().password === password) {
          setCurrentUser(username);
          if (username === 'tszkit9') setView('admin');
          else setView('guard');
        } else showAlert('錯誤', '名稱或密碼錯誤！');
      } else {
        if (userSnap.exists()) showAlert('錯誤', '名稱已被使用！');
        else {
          await setDoc(userRef, { username, password });
          showAlert('成功', '註冊成功！請登入。');
          setIsLoginMode(true);
        }
      }
    } catch (e) { showAlert('錯誤', '網絡問題。'); }
  };

  const startGuardian = async () => {
    if (!destination || !contactPhone) return showAlert('提示', '請填寫目的地同聯絡人！');
    const minutes = parseInt(duration);
    if (isNaN(minutes) || minutes <= 0) return showAlert('提示', '請輸入正確預計時間！');

    setLocationText('正在獲取位置及地址...');

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return showAlert('錯誤', '需要定位權限！');

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
      
      if (!cameraPermission?.granted) await requestCameraPermission();
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
    showAlert('⚠️ 逾時警告', '系統已自動發出求救！');
    await addDoc(collection(db, "sos_alerts"), {
      username: currentUser, address: locationText, contactPhone: contactPhone, isAuto: true
    });
  };

  const stopGuardian = async () => {
    clearInterval(timerRef.current);
    await setDoc(doc(db, "locations", currentUser), { status: 'arrived' }, { merge: true });
    
    // 🌟 寫入歷史紀錄
    await addDoc(collection(db, "history"), {
      username: currentUser, destination: destination, contactPhone: contactPhone, status: '安全抵達', timestamp: new Date().toISOString()
    });

    setIsGuarding(false);
    setTimeLeft(0);
    if (typeof window !== 'undefined') localStorage.removeItem('guard_isGuarding');
    setLocationText('僅在你同意後分享定位');
    showAlert('安全抵達', '已通知後台你安全抵達。');
  };

  const triggerSOS = () => {
    showConfirm('確認求救', '確定要發出緊急求救嗎？', async () => {
      clearInterval(timerRef.current);
      await addDoc(collection(db, "sos_alerts"), {
        username: currentUser, address: locationText, contactPhone: contactPhone, isAuto: false
      });
      // 🌟 SOS 亦寫入歷史
      await addDoc(collection(db, "history"), {
        username: currentUser, destination: destination, contactPhone: contactPhone, status: '發出SOS', timestamp: new Date().toISOString()
      });
      showAlert('求救已發出', '管理員已收到通知！');
    });
  };

  // 🌟 假電話邏輯
  const triggerFakeCall = () => {
    setFakeCallActive(true);
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg');
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.log(e));
    }
  };
  const endFakeCall = () => {
    setFakeCallActive(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  // 🌟 防狼警報邏輯
  const toggleSiren = () => {
    if (sirenActive) {
      setSirenActive(false);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    } else {
      setSirenActive(true);
      if (typeof window !== 'undefined') {
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.log(e));
      }
    }
  };

  const handleRecordVideo = async () => {
    if (!cameraRef.current) return;
    if (isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 15 });
      if (video) {
        setIsUploading(true);
        const response = await fetch(video.uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `videos/${currentUser}-${Date.now()}.mp4`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, "videos"), {
          username: currentUser, videoUrl: downloadURL, timestamp: new Date().toISOString()
        });
        showAlert('錄影成功', '影片已安全上傳到後台。');
      }
    } catch (error) {
      showAlert('錄影失敗', '請確保已允許相機權限。');
    } finally {
      setIsRecording(false);
      setIsUploading(false);
    }
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
      const unsubVideos = onSnapshot(collection(db, "videos"), (snapshot) => {
        const vids = [];
        snapshot.forEach(doc => vids.push({ id: doc.id, ...doc.data() }));
        setVideoList(vids.reverse()); 
      });
      // 🌟 監聽歷史紀錄
      const unsubHistory = onSnapshot(collection(db, "history"), (snapshot) => {
        const hists = [];
        snapshot.forEach(doc => hists.push({ id: doc.id, ...doc.data() }));
        setHistoryList(hists.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))); 
      });

      getDocs(collection(db, "users")).then(snap => { const u=[]; snap.forEach(d => u.push(d.id)); setAllUsers(u); });
      getDocs(collection(db, "admins")).then(snap => { const a=[]; snap.forEach(d => a.push(d.id)); setAdminList(a); });
      return () => { unsubLoc(); unsubSOS(); unsubVideos(); unsubHistory(); };
    }
  }, [currentUser, view]);

  const addAdmin = async () => {
    if (!newAdminName) return showAlert('提示', '請輸入名稱');
    await setDoc(doc(db, "admins", newAdminName), { role: "admin" });
    setAdminList([...adminList, newAdminName]);
    setNewAdminName('');
    showAlert('成功', `${newAdminName} 已成為管理員！`);
  };

  const resolveSOS = async (id) => {
    showConfirm('確認處理', '確定要標記為已處理並清除警報嗎？', async () => {
      await deleteDoc(doc(db, "sos_alerts", id));
    });
  };

  const changeUserPassword = async () => {
    if (!targetUsername || !newPassword) return showAlert('提示', '請輸入要修改嘅用戶名稱同新密碼！');
    try {
      const userRef = doc(db, "users", targetUsername);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { password: newPassword });
        showAlert('成功', `用戶 ${targetUsername} 嘅密碼已成功修改為：${newPassword}`);
        setTargetUsername(''); setNewPassword('');
      } else {
        showAlert('錯誤', `搵唔到用戶 ${targetUsername}，請確認名稱是否正確。`);
      }
    } catch (e) { showAlert('錯誤', '修改失敗，請檢查網絡。'); }
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
        <Pressable style={({pressed}) => [styles.button, {opacity: pressed ? 0.7 : 1}]} onPress={handleAuth}>
          <Text style={styles.buttonText}>{isLoginMode ? '登入' : '確認註冊'}</Text>
        </Pressable>
        <Pressable onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 20 }}>
          <Text style={{ textAlign: 'center', color: '#2196F3', fontSize: 16 }}>{isLoginMode ? '未有名稱？去註冊' : '已經有帳戶？去登入'}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* 🌟 假電話全螢幕彈出 */}
      <Modal visible={fakeCallActive} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontSize: 24, marginBottom: 10 }}>📞 媽媽 來電...</Text>
          <Text style={{ color: '#AAA', fontSize: 16, marginBottom: 50 }}>手機響緊，扮講電話！</Text>
          <Pressable style={{ backgroundColor: '#4CAF50', padding: 20, borderRadius: 50, marginBottom: 20, width: 150, alignItems: 'center' }} onPress={endFakeCall}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>接聽 (關閉)</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerText}>👤 {currentUser}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {currentUser === 'tszkit9' && (
            <Pressable onPress={() => setView(view === 'guard' ? 'admin' : 'guard')} style={({ pressed }) => [styles.navBtn, { backgroundColor: view === 'admin' ? '#FF9800' : '#2196F3', opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.navBtnText}>{view === 'guard' ? '⚙️ 管理員後台' : '🏠 返回守護'}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => { setCurrentUser(null); setView('guard'); endFakeCall(); setSirenActive(false); }} style={({ pressed }) => [styles.navBtn, { backgroundColor: '#F44336', opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.navBtnText}>登出</Text>
          </Pressable>
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
                <TextInput style={styles.input} placeholder="輸入安全抵達地點" value={destination} onChangeText={(t) => { setDestination(t); if (typeof window !== 'undefined') localStorage.setItem('guard_dest', t); }} />
              </View>
              <View style={styles.card}>
                <Text style={styles.label}>📞 緊急聯絡人電話</Text>
                <TextInput style={styles.input} placeholder="例如: 91234567" value={contactPhone} onChangeText={(t) => { setContactPhone(t); if (typeof window !== 'undefined') localStorage.setItem('guard_phone', t); }} keyboardType="phone-pad" />
              </View>
              <View style={styles.card}>
                <Text style={styles.label}>⏱️ 預計需要時間（分鐘）</Text>
                <TextInput style={styles.input} placeholder="例如: 30" value={duration} onChangeText={(t) => { setDuration(t); if (typeof window !== 'undefined') localStorage.setItem('guard_duration', t); }} keyboardType="numeric" />
              </View>
              
              <Pressable style={({pressed}) => [styles.button, {opacity: pressed ? 0.7 : 1}]} onPress={startGuardian}>
                <Text style={styles.buttonText}>開始安全陪伴</Text>
              </Pressable>
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

              {cameraPermission?.granted ? (
                <View style={{ marginBottom: 15, borderRadius: 10, overflow: 'hidden', height: 200 }}>
                  <CameraView style={{ flex: 1 }} ref={cameraRef} mode="video" facing="back" />
                </View>
              ) : (
                <Pressable style={({pressed}) => [styles.button, {backgroundColor: '#607D8B', opacity: pressed ? 0.7 : 1}]} onPress={requestCameraPermission}>
                  <Text style={styles.buttonText}>允許相機權限 (用於錄影)</Text>
                </Pressable>
              )}

              {/* 🌟 假電話 & 警報掣 */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <Pressable style={({pressed}) => [styles.button, { flex: 1, backgroundColor: '#FF9800', marginTop: 0, opacity: pressed ? 0.7 : 1 }]} onPress={triggerFakeCall}>
                  <Text style={styles.buttonText}>📞 假電話</Text>
                </Pressable>
                <Pressable style={({pressed}) => [styles.button, { flex: 1, backgroundColor: sirenActive ? '#D32F2F' : '#F44336', marginTop: 0, opacity: pressed ? 0.7 : 1 }]} onPress={toggleSiren}>
                  <Text style={styles.buttonText}>{sirenActive ? '🔕 關閉警報' : '🚨 防狼警報'}</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <Pressable style={({pressed}) => [styles.button, { flex: 1, backgroundColor: '#2196F3', marginTop: 0, opacity: pressed ? 0.7 : 1 }]} onPress={() => callPhone(contactPhone)}>
                  <Text style={styles.buttonText}>📞 致電聯絡人</Text>
                </Pressable>
                <Pressable style={({pressed}) => [styles.button, { flex: 1, backgroundColor: '#9C27B0', marginTop: 0, opacity: pressed ? 0.7 : 1 }]} onPress={() => startVideoCall(currentUser)}>
                  <Text style={styles.buttonText}>📹 視像通話</Text>
                </Pressable>
              </View>

              {cameraPermission?.granted && (
                <Pressable style={({pressed}) => [styles.button, { backgroundColor: isRecording ? '#D32F2F' : '#607D8B', marginTop: 15, opacity: pressed ? 0.7 : 1 }]} onPress={handleRecordVideo} disabled={isUploading}>
                  <Text style={styles.buttonText}>{isUploading ? '上傳中...' : isRecording ? '⏹️ 停止錄影並上傳' : '🔴 錄影存證'}</Text>
                </Pressable>
              )}

              <Pressable style={({pressed}) => [styles.button, { backgroundColor: '#D32F2F', marginTop: 15, opacity: pressed ? 0.7 : 1 }]} onPress={triggerSOS}>
                <Text style={styles.buttonText}>🚨 我感覺不安全 (SOS)</Text>
              </Pressable>
              <Pressable style={({pressed}) => [styles.button, styles.stopButton, {opacity: pressed ? 0.7 : 1}]} onPress={stopGuardian}>
                <Text style={styles.buttonText}>我已安全抵達</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {view === 'admin' && currentUser === 'tszkit9' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>👑 管理員控制台</Text>

          {sosAlerts.length > 0 && (
            <View style={[styles.card, { backgroundColor: '#FFEBEE', borderColor: '#D32F2F', borderWidth: 2 }]}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#D32F2F', marginBottom: 10 }}>🚨 緊急求救！</Text>
              {sosAlerts.map((alert) => (
                <View key={alert.id} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#FFCDD2', paddingBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>用戶：{alert.username} {alert.isAuto && '(逾時)'}</Text>
                  <Text style={{ marginVertical: 5 }}>位置：{alert.address}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                    <Pressable style={({pressed}) => [styles.button, { flex: 1, padding: 8, backgroundColor: '#D32F2F', opacity: pressed ? 0.7 : 1 }]} onPress={() => callPhone(alert.contactPhone)}>
                      <Text style={styles.buttonText}>📞 致電</Text>
                    </Pressable>
                    <Pressable style={({pressed}) => [styles.button, { flex: 1, padding: 8, backgroundColor: '#9C27B0', opacity: pressed ? 0.7 : 1 }]} onPress={() => startVideoCall(alert.username)}>
                      <Text style={styles.buttonText}>📹 視訊</Text>
                    </Pressable>
                  </View>
                  <Pressable style={({pressed}) => [styles.button, { marginTop: 10, padding: 10, backgroundColor: '#4CAF50', opacity: pressed ? 0.7 : 1 }]} onPress={() => resolveSOS(alert.id)}>
                    <Text style={styles.buttonText}>✅ 標記為已處理</Text>
                  </Pressable>
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
                  <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${g.lat},${g.lng}`)}>
                    <Text style={{ color: '#2196F3', marginTop: 5, fontWeight: 'bold' }}>🗺️ 喺 Google Maps 睇位置</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Pressable style={({pressed}) => [styles.button, { flex: 1, padding: 8, backgroundColor: '#2196F3', opacity: pressed ? 0.7 : 1 }]} onPress={() => callPhone(g.contactPhone)}>
                      <Text style={styles.buttonText}>📞 致電</Text>
                    </Pressable>
                    <Pressable style={({pressed}) => [styles.button, { flex: 1, padding: 8, backgroundColor: '#9C27B0', opacity: pressed ? 0.7 : 1 }]} onPress={() => startVideoCall(g.username)}>
                      <Text style={styles.buttonText}>📹 視訊</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            }
          </View>

          {/* 🌟 新增：歷史紀錄 */}
          <View style={styles.card}>
            <Text style={styles.label}>📜 守護歷史紀錄 ({historyList.length})</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {historyList.length === 0 ? <Text style={{color:'#999'}}>暫無紀錄。</Text> : 
                historyList.map((h, i) => (
                  <View key={i} style={{ marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                    <Text style={{ fontWeight: 'bold', color: h.status === '發出SOS' ? '#D32F2F' : '#4CAF50' }}>
                      {h.status === '發出SOS' ? '🚨 發出求救' : '✅ 安全抵達'} - {h.username}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>{new Date(h.timestamp).toLocaleString()}</Text>
                    <Text style={{ color: '#333', marginTop: 3 }}>目的地：{h.destination}</Text>
                  </View>
                ))
              }
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>🔐 修改用戶密碼</Text>
            <TextInput style={styles.input} value={targetUsername} onChangeText={setTargetUsername} placeholder="輸入用戶名稱 (例如: user1)" />
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="輸入新密碼" />
            <Pressable style={({pressed}) => [styles.button, {backgroundColor: '#3F51B5', opacity: pressed ? 0.7 : 1}]} onPress={changeUserPassword}>
              <Text style={styles.buttonText}>確認修改密碼</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>🎥 用戶錄影證據 ({videoList.length})</Text>
            {videoList.length === 0 ? <Text style={{color:'#999'}}>暫無影片。</Text> : 
              videoList.map((v, i) => (
                <View key={i} style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>👤 用戶：{v.username}</Text>
                  <Text style={{ color: '#666', fontSize: 12, marginBottom: 10 }}>時間：{new Date(v.timestamp).toLocaleString()}</Text>
                  {Platform.OS === 'web' ? (
                    <video src={v.videoUrl} controls style={{ width: '100%', borderRadius: 8, maxHeight: 200, backgroundColor: '#000' }} />
                  ) : (
                    <Pressable style={styles.button} onPress={() => Linking.openURL(v.videoUrl)}>
                      <Text style={styles.buttonText}>📺 點擊播放影片</Text>
                    </Pressable>
                  )}
                </View>
              ))
            }
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>👑 新增管理員</Text>
            <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="輸入朋友名稱" />
            <Pressable style={({pressed}) => [styles.button, {opacity: pressed ? 0.7 : 1}]} onPress={addAdmin}>
              <Text style={styles.buttonText}>確認新增</Text>
            </Pressable>
            <Text style={{ marginTop: 10, color: '#666' }}>名單：{adminList.join(', ')}</Text>
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
  navBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, cursor: 'pointer' },
  navBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  content: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  locationText: { fontSize: 16, color: '#333', fontWeight: '500', marginTop: 5 },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginTop: 5, marginBottom: 10, borderWidth: 1, borderColor: '#EEE', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  guardingBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginTop: 20 },
  guardingText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10 },
  stopButton: { backgroundColor: '#FF9800', marginTop: 15 },
});
