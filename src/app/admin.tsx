// @ts-nocheck
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [newAdminName, setNewAdminName] = useState('');
  const [adminList, setAdminList] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      // 直接由瀏覽器攞個名出嚟
      const currentUser = localStorage.getItem('currentUser');
      
      if (currentUser === 'tszkit9') {
        setIsAdmin(true);
        fetchAdmins();
      } else if (currentUser) {
        const docRef = doc(db, "admins", currentUser);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsAdmin(true);
          fetchAdmins();
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setChecking(false);
    };
    checkAdmin();
  }, []);

  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "admins"));
    const names = [];
    querySnapshot.forEach((doc) => names.push(doc.id));
    setAdminList(names);
  };

  const addAdmin = async () => {
    if (!newAdminName) return Alert.alert('請輸入名稱');
    try {
      await setDoc(doc(db, "admins", newAdminName), { role: "admin" });
      Alert.alert('成功', `${newAdminName} 已成為管理員！`);
      setNewAdminName('');
      fetchAdmins();
    } catch (error) {
      Alert.alert('錯誤', '新增失敗');
    }
  };

  if (checking) return <SafeAreaView style={styles.container}><Text style={{color:'#FFF'}}>檢查權限中...</Text></SafeAreaView>;

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>⛔ 你沒有管理員權限</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
          <Text style={styles.buttonText}>返回首頁</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>👑 管理員控制台</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>新增管理員 (輸入名稱)：</Text>
        <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="例如: friend123" />
        <TouchableOpacity style={styles.button} onPress={addAdmin}>
          <Text style={styles.buttonText}>確認新增</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>目前管理員名單：</Text>
        <ScrollView style={{ maxHeight: 200 }}>
          {adminList.map((name) => (
            <Text key={name} style={styles.listItem}>• {name}</Text>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#F44336' }]} onPress={() => { localStorage.removeItem('currentUser'); router.push('/'); }}>
        <Text style={styles.buttonText}>登出</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1E1E1E', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#2D2D2D', padding: 15, borderRadius: 10, marginBottom: 20 },
  label: { color: '#AAA', marginBottom: 10 },
  input: { backgroundColor: '#FFF', padding: 10, borderRadius: 5, marginBottom: 10 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  errorText: { color: '#F44336', fontSize: 20, textAlign: 'center', marginBottom: 20 },
  listItem: { color: '#FFF', fontSize: 16, marginBottom: 5 }
});
