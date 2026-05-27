// js/visits.js
import { db } from "./firebaseConfig.js";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function addVisit({
  userId, hotelId, visitedDateStatus, visitedDate,
  dateVisibility, recordVisibility, rating, memo, countForRanking
}) {
  if (!userId) throw new Error("ログイン情報がありません");
  if (!hotelId) throw new Error("ホテル情報がありません");
  if (!rating) throw new Error("評価を選択してください");

  const isUnknown = visitedDateStatus === "unknown";
  if (!isUnknown && !visitedDate) {
    throw new Error("日付を選択するか、日付不明にしてください");
  }

  await addDoc(collection(db, "visits"), {
    userId,
    hotelId,
    visitedDateStatus: isUnknown ? "unknown" : "known",
    visitedDate: isUnknown ? null : visitedDate,
    dateVisibility: isUnknown ? "private" : (dateVisibility || "private"),
    recordVisibility: recordVisibility || "private",
    rating: Number(rating),
    memo: memo || "",
    countForRanking: Boolean(countForRanking),
    verificationStatus: "selfReported",
    rankingEligible: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function fetchMyVisits(userId) {
  if (!userId) throw new Error("ログイン情報がありません");

  const q = query(
    collection(db, "visits"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function fetchVisitById(visitId) {
  if (!visitId) throw new Error("記録IDがありません");

  const visitRef = doc(db, "visits", visitId);
  const visitSnap = await getDoc(visitRef);

  if (!visitSnap.exists()) throw new Error("記録が見つかりません");
  return { id: visitSnap.id, ...visitSnap.data() };
}

export async function updateVisit(visitId, data) {
  if (!visitId) throw new Error("記録IDがありません");

  const isUnknown = data.visitedDateStatus === "unknown";
  if (!isUnknown && !data.visitedDate) {
    throw new Error("日付を選択するか、日付不明にしてください");
  }

  const visitRef = doc(db, "visits", visitId);

  await updateDoc(visitRef, {
    visitedDateStatus: isUnknown ? "unknown" : "known",
    visitedDate: isUnknown ? null : data.visitedDate,
    dateVisibility: isUnknown ? "private" : (data.dateVisibility || "private"),
    rating: Number(data.rating),
    memo: data.memo || "",
    recordVisibility: data.recordVisibility || "private",
    countForRanking: Boolean(data.countForRanking),
    updatedAt: serverTimestamp()
  });
}

export async function deleteVisit(visitId) {
  if (!visitId) throw new Error("記録IDがありません");
  const visitRef = doc(db, "visits", visitId);
  await deleteDoc(visitRef);
}
