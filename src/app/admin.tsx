// @ts-nocheck
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Linking, TextInput, Alert } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, onSnapshot, setDoc, doc } from 'firebase/firestore';
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

export default function AdminScreen() {
  const [activeGuardians, setActiveGuardians] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');
  const router = useRouter();

  // 攞數據 (唔使理 currentUser 係邊個，直接攞晒)
  useEffect(() => {
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
  }, []);

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);
  const startVideoCall = (roomName) => Linking.openURL(`https://meet.jit.si/guardian-${roomName}`);

  const addAdmin = async () => {
    if (!newAdminName) return Alert.alert('請輸入名稱');
    await setDoc(doc(db, "admins", newAdminName), { role: "admin" });
    setAdminList([...adminList, newAdminName]);
    setNewAdminName('');
    Alert.alert('成功', `${newAdminName} 已成為管理員！`);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>👑 管理員控制台</Text>
        {/* 返回首頁嘅純 HTML 標籤 */}
        <a href="/" style={{ textDecoration: 'none' }}>
          <View style={[styles.navBtn, { backgroundColor: '#F44336' }]}>
            <Text style={styles.navBtnText}>🏠 返回首頁</Text>
          </View>
        </a>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
          <Text style={{ marginTop: 10, color: '#666' }}>名單：{adminList.join(', ')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>👥 註冊用戶總數：{allUsers.length} 人</Text>
          <Text style={{color: '#666', fontSize: 12, marginTop: 5}}>名單：{allUsers.join(', ')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#DDD' },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  navBtn: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  navBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#EEE', fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
