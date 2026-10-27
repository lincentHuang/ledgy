// 以多個測試帳號跑智帳君群組流程，驗證 firestore.rules
// 寫入內容與交易模式比照 src/lib/firestoreService.ts，兩邊有改動時要一起更新
// 執行：yarn test:rules (需 Java，會啟動 Firestore 模擬器)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where,
  writeBatch, runTransaction,
} from 'firebase/firestore';

const RULES = fileURLToPath(new URL('../firestore.rules', import.meta.url));
const HID = 'house_test_1';
const CODE = 'ABC123';

let env;
const ctx = (uid, email) => env.authenticatedContext(uid, { email }).firestore();
let alice, bob, carol, dave, anon;

const membersIdsOf = (h) => Array.from(new Set([h.ownerId, ...h.members.map((m) => m.userId)]));
const toDoc = (h) => {
  const { pendingJoinRequests, ...rest } = h;
  return {
    ...rest,
    memberIds: membersIdsOf(h),
    pendingInviteeEmails: (h.pendingInvitations || []).filter((i) => i.status === 'pending').map((i) => i.inviteeEmail),
  };
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ledgy',
    firestore: { rules: readFileSync(RULES, 'utf8') },
  });
  alice = ctx('alice', 'alice@test.com');
  bob = ctx('bob', 'bob@test.com');
  carol = ctx('carol', 'carol@test.com');
  dave = ctx('dave', 'dave@test.com');
  anon = env.unauthenticatedContext().firestore();
});
after(async () => { await env?.cleanup(); });

const baseHouse = {
  id: HID, name: '台北合租', inviteCode: CODE, ownerId: 'alice',
  members: [{ userId: 'alice', displayName: 'Alice', email: 'alice@test.com', role: 'owner', joinedAt: 1 }],
  pendingInvitations: [], currency: 'NT$', defaultSplitMethod: 'equal', createdAt: 1, updatedAt: 1,
};

test('1. users：本人可讀寫，他人與未登入被拒', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { uid: 'alice', displayName: 'Alice' }));
  await assertSucceeds(setDoc(doc(alice, 'users/alice/transactions/t1'), { id: 't1', amount: 100 }));
  await assertFails(getDoc(doc(bob, 'users/alice')));
  await assertFails(getDocs(collection(bob, 'users/alice/transactions')));
  await assertFails(setDoc(doc(bob, 'users/alice'), { hacked: true }));
  await assertFails(getDoc(doc(anon, 'users/alice')));
});

test('2. Alice 建立群組（群組＋邀請碼同一批寫入）', async () => {
  const b = writeBatch(alice);
  b.set(doc(alice, `households/${HID}`), toDoc(baseHouse), { merge: true });
  b.set(doc(alice, `inviteCodes/${CODE}`), { householdId: HID, householdName: baseHouse.name });
  await assertSucceeds(b.commit());
  await assertSucceeds(setDoc(doc(alice, `households/${HID}/transactions/h1`), { id: 'h1', amount: 500 }));
});

test('3. 群組查詢：成員/組長查詢可通過', async () => {
  await assertSucceeds(getDocs(query(collection(alice, 'households'), where('memberIds', 'array-contains', 'alice'))));
  await assertSucceeds(getDocs(query(collection(alice, 'households'), where('ownerId', '==', 'alice'))));
  const s = await getDocs(query(collection(bob, 'households'), where('memberIds', 'array-contains', 'bob')));
  if (s.size !== 0) throw new Error('Bob 不該查到任何群組');
});

test('4. 非成員 Bob：讀群組、公帳、用邀請碼列舉群組皆被拒', async () => {
  await assertFails(getDoc(doc(bob, `households/${HID}`)));
  await assertFails(getDocs(collection(bob, `households/${HID}/transactions`)));
  await assertFails(setDoc(doc(bob, `households/${HID}/transactions/x`), { amount: 1 }));
  await assertFails(getDocs(query(collection(bob, 'households'), where('inviteCode', '==', CODE))));
  await assertFails(getDocs(collection(bob, 'households')));
  await assertFails(getDocs(collection(bob, 'inviteCodes')));
  await assertFails(setDoc(doc(bob, `households/${HID}`), { name: 'pwned' }, { merge: true }));
  await assertFails(setDoc(doc(bob, `inviteCodes/${CODE}`), { householdId: 'bob_house' }));
  await assertFails(getDoc(doc(anon, `inviteCodes/${CODE}`)));
});

test('5. Alice 以 Email 邀請 Bob（交易更新）', async () => {
  await assertSucceeds(runTransaction(alice, async (t) => {
    const ref = doc(alice, `households/${HID}`);
    const h = (await t.get(ref)).data();
    h.pendingInvitations = [...(h.pendingInvitations || []), {
      id: 'inv_1', householdId: HID, householdName: h.name, inviterUserId: 'alice', inviterName: 'Alice',
      inviteeEmail: 'bob@test.com', role: 'member', status: 'pending', createdAt: 2,
    }];
    h.updatedAt = 2;
    t.set(ref, toDoc(h));
  }));
});

test('6. Bob 查得到寄給自己的邀請，Carol 查不到', async () => {
  const s = await assertSucceeds(getDocs(query(collection(bob, 'households'), where('pendingInviteeEmails', 'array-contains', 'bob@test.com'))));
  if (s.size !== 1) throw new Error(`Bob 應查到 1 筆邀請，實際 ${s.size}`);
  await assertFails(getDocs(query(collection(carol, 'households'), where('pendingInviteeEmails', 'array-contains', 'bob@test.com'))));
  // 被邀請者仍讀不到公帳
  await assertFails(getDocs(collection(bob, `households/${HID}/transactions`)));
});

const bobAccept = (extra) => runTransaction(bob, async (t) => {
  const ref = doc(bob, `households/${HID}`);
  const h = (await t.get(ref)).data();
  const inv = h.pendingInvitations.find((i) => i.id === 'inv_1');
  inv.status = 'accepted';
  h.members.push({ userId: 'bob', displayName: 'Bob', email: 'bob@test.com', role: 'member', joinedAt: 3 });
  h.updatedAt = 3;
  extra?.(h);
  const { memberIds: _m, pendingInviteeEmails: _p, ...plain } = h;
  t.set(ref, toDoc(plain));
});

test('7. Bob 接受邀請：夾帶他人或改名被拒，正常接受成功', async () => {
  await assertFails(bobAccept((h) => h.members.push({ userId: 'dave', displayName: 'Dave', role: 'member', joinedAt: 3 })));
  await assertFails(bobAccept((h) => { h.name = 'Bob 的帳本'; }));
  await assertFails(bobAccept((h) => { h.ownerId = 'bob'; }));
  await assertSucceeds(bobAccept());
  await assertSucceeds(getDoc(doc(bob, `households/${HID}`)));
  await assertSucceeds(getDocs(collection(bob, `households/${HID}/transactions`)));
  await assertSucceeds(setDoc(doc(bob, `households/${HID}/transactions/b1`), { id: 'b1', amount: 80 }));
});

test('8. 成員 Bob 不能奪取組長或刪除群組，但可改預算', async () => {
  await assertFails(setDoc(doc(bob, `households/${HID}`), { ownerId: 'bob' }, { merge: true }));
  await assertFails(deleteDoc(doc(bob, `households/${HID}`)));
  await assertSucceeds(setDoc(doc(bob, `households/${HID}`), { monthlyBudget: 30000 }, { merge: true }));
});

test('9. Carol 用邀請碼申請加入', async () => {
  const code = await assertSucceeds(getDoc(doc(carol, `inviteCodes/${CODE}`)));
  const hid = code.data().householdId;
  if (hid !== HID) throw new Error('邀請碼對照錯誤');
  const req = {
    id: 'carol', householdId: hid, householdName: '台北合租', applicantUserId: 'carol',
    applicantName: 'Carol', applicantEmail: 'carol@test.com', status: 'pending', createdAt: 4,
  };
  // 冒名、或直接把自己設成已核准都被拒
  await assertFails(setDoc(doc(carol, `households/${hid}/joinRequests/dave`), { ...req, id: 'dave', applicantUserId: 'dave' }));
  await assertFails(setDoc(doc(carol, `households/${hid}/joinRequests/carol`), { ...req, status: 'approved' }));
  await assertSucceeds(setDoc(doc(carol, `households/${hid}/joinRequests/carol`), req));
  // 申請中仍讀不到群組，也不能改自己的申請
  await assertFails(getDoc(doc(carol, `households/${hid}`)));
  await assertSucceeds(getDoc(doc(carol, `households/${hid}/joinRequests/carol`)));
  await assertFails(setDoc(doc(carol, `households/${hid}/joinRequests/carol`), { status: 'approved' }, { merge: true }));
  // 第三者看不到別人的申請
  await assertFails(getDoc(doc(dave, `households/${hid}/joinRequests/carol`)));
  await assertFails(getDocs(collection(dave, `households/${hid}/joinRequests`)));
});

test('10. 組長 Alice 審核通過 Carol', async () => {
  await assertSucceeds(getDocs(collection(alice, `households/${HID}/joinRequests`)));
  await assertSucceeds(runTransaction(alice, async (t) => {
    const houseRef = doc(alice, `households/${HID}`);
    const reqRef = doc(alice, `households/${HID}/joinRequests/carol`);
    const h = (await t.get(houseRef)).data();
    const r = (await t.get(reqRef)).data();
    t.delete(reqRef);
    h.members.push({ userId: r.applicantUserId, displayName: r.applicantName, email: r.applicantEmail, role: 'member', joinedAt: 5 });
    h.updatedAt = 5;
    const { memberIds: _m, pendingInviteeEmails: _p, ...plain } = h;
    t.set(houseRef, toDoc(plain));
  }));
  await assertSucceeds(getDoc(doc(carol, `households/${HID}`)));
  await assertSucceeds(getDocs(collection(carol, `households/${HID}/transactions`)));
});

test('11. 舊群組（無 memberIds）：組長仍可查詢與補寫，一般使用者讀不到', async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    const { memberIds, pendingInviteeEmails, ...legacy } = toDoc({ ...baseHouse, id: 'legacy_1', inviteCode: 'OLD999' });
    await setDoc(doc(c.firestore(), 'households/legacy_1'), legacy);
  });
  await assertSucceeds(getDocs(query(collection(alice, 'households'), where('ownerId', '==', 'alice'))));
  await assertFails(getDoc(doc(bob, 'households/legacy_1')));
  const b = writeBatch(alice);
  b.set(doc(alice, 'households/legacy_1'), toDoc({ ...baseHouse, id: 'legacy_1', inviteCode: 'OLD999' }), { merge: true });
  b.set(doc(alice, 'inviteCodes/OLD999'), { householdId: 'legacy_1', householdName: baseHouse.name });
  await assertSucceeds(b.commit());
});

test('12. 他人不能用別的群組蓋掉既有邀請碼', async () => {
  const b = writeBatch(dave);
  b.set(doc(dave, 'households/dave_house'), toDoc({ ...baseHouse, id: 'dave_house', ownerId: 'dave',
    members: [{ userId: 'dave', displayName: 'Dave', role: 'owner', joinedAt: 1 }] }));
  b.set(doc(dave, `inviteCodes/${CODE}`), { householdId: 'dave_house', householdName: 'x' });
  await assertFails(b.commit());
});

test('13. Alice 刪除群組（先刪申請與邀請碼，再刪公帳與群組）', async () => {
  // 非成員不能刪邀請碼；成員 Carol 不能刪群組
  await assertFails(deleteDoc(doc(dave, `inviteCodes/${CODE}`)));
  await assertFails(deleteDoc(doc(carol, `households/${HID}`)));
  const pre = writeBatch(alice);
  (await getDocs(collection(alice, `households/${HID}/joinRequests`))).forEach((d) => pre.delete(d.ref));
  pre.delete(doc(alice, `inviteCodes/${CODE}`));
  await assertSucceeds(pre.commit());
  const b = writeBatch(alice);
  (await getDocs(collection(alice, `households/${HID}/transactions`))).forEach((d) => b.delete(d.ref));
  b.delete(doc(alice, `households/${HID}`));
  await assertSucceeds(b.commit());
});

test('14. 連線測試文件：登入者可寫，未登入被拒', async () => {
  await assertSucceeds(setDoc(doc(alice, '_system/connection_test'), { lastPing: 1 }, { merge: true }));
  await assertFails(setDoc(doc(anon, '_system/connection_test'), { lastPing: 1 }));
  await assertFails(setDoc(doc(alice, '_system/other'), { x: 1 }));
});
