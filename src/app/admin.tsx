import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const firebaseConfig = { /* 貼你嘅 Config，同上 */ 
  apiKey: "AIzaSyAZNQcRCFis8e3aYy7b3nxd8pafzNgYw",
  authDomain: "guardian-app-f23c6.firebaseapp.com",
  projectId: "guardian-app-f23c6",
  storageBucket: "guardian-app-f23c6.firebasestorage.app",
  messagingSenderId: "1075988300124",
  appId: "1:1075988300124:web:59be47526be9800e6e60199",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function AdminScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminList, setAdminList] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // 檢查呢個 Email 喺唔喺 admins 名單入面
        const docRef = doc(db, "admins", user.email);
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
    });
    return () => unsubscribe();
  }, []);

  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "admins"));
    const emails: string[] = [];
    querySnapshot.forEach((doc) => emails.push(doc.id));
    setAdminList(emails);
  };

  const addAdmin = async () => {
    if (!newAdminEmail) return Alert.alert('請輸入 Email');
    try {
      await setDoc(doc(db, "admins", newAdminEmail), { role: "admin", addedAt: new Date() });
      Alert.alert('成功', `${newAdminEmail} 已成為管理員！`);
      setNewAdminEmail('');
      fetchAdmins();
    } catch (error) {
      Alert.alert('錯誤', '新增失敗');
    }
  };

  if (checking) return <SafeAreaView style={styles.container}><Text>檢查權限中...</Text></SafeAreaView>;

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
        <Text style={styles.label}>新增管理員 (輸入 Email)：</Text>
        <TextInput style={styles.input} value={newAdminEmail} onChangeText={setNewAdminEmail} placeholder="friend@gmail.com" />
        <TouchableOpacity style={styles.button} onPress={addAdmin}>
          <Text style={styles.buttonText}>確認新增</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>目前管理員名單：</Text>
        <ScrollView style={{ maxHeight: 200 }}>
          {adminList.map((email) => (
            <Text key={email} style={styles.listItem}>• {email}</Text>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#F44336' }]} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>返回首頁</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1E1E1E' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#2D2D2D', padding: 15, borderRadius: 10, marginBottom: 20 },
  label: { color: '#AAA', marginBottom: 10 },
  input: { backgroundColor: '#FFF', padding: 10, borderRadius: 5, marginBottom: 10 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  errorText: { color: '#F44336', fontSize: 20, textAlign: 'center', marginBottom: 20 },
  listItem: { color: '#FFF', fontSize: 16, marginBottom: 5 }
});
