// js/hotels.js
import { db } from "./firebaseConfig.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function fetchHotels() {
  const q = query(
    collection(db, "hotels"),
    where("status", "==", "active"),
    where("area", "==", "新宿"),
    orderBy("name")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function fetchHotelById(hotelId) {
  const hotelRef = doc(db, "hotels", hotelId);
  const hotelSnap = await getDoc(hotelRef);
  if (!hotelSnap.exists()) throw new Error("ホテル情報が見つかりません");
  return { id: hotelSnap.id, ...hotelSnap.data() };
}

export function filterHotels(hotels, keyword) {
  const text = keyword.trim().toLowerCase();
  if (!text) return hotels;

  return hotels.filter((hotel) => {
    const name = hotel.name?.toLowerCase() || "";
    const area = hotel.area?.toLowerCase() || "";
    const subArea = hotel.subArea?.toLowerCase() || "";
    const chainName = hotel.chainName?.toLowerCase() || "";
    const tags = (hotel.tags || []).join(" ").toLowerCase();

    return name.includes(text) ||
      area.includes(text) ||
      subArea.includes(text) ||
      chainName.includes(text) ||
      tags.includes(text);
  });
}

export async function addHotel({
  name, area, subArea, address, station,
  chainName, priceRange, tags, features, createdBy
}) {
  if (!name) throw new Error("ホテル名を入力してください");

  await addDoc(collection(db, "hotels"), {
    name,
    area: area || "新宿",
    subArea: subArea || "",
    address: address || "",
    station: station || "",
    chainName: chainName || "なし",
    priceRange: priceRange || "",
    tags: tags || [],
    features: {
      sauna: Boolean(features?.sauna),
      openAirBath: Boolean(features?.openAirBath),
      clean: Boolean(features?.clean),
      priceInfo: Boolean(features?.priceInfo)
    },
    status: "active",
    stats: { visitCount: 0, ratingAverage: 0, ratingCount: 0 },
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateHotel(hotelId, data) {
  if (!hotelId) throw new Error("ホテルIDがありません");
  if (!data.name) throw new Error("ホテル名を入力してください");

  const hotelRef = doc(db, "hotels", hotelId);

  await updateDoc(hotelRef, {
    name: data.name,
    area: data.area || "新宿",
    subArea: data.subArea || "",
    address: data.address || "",
    station: data.station || "",
    chainName: data.chainName || "なし",
    priceRange: data.priceRange || "",
    tags: data.tags || [],
    features: {
      sauna: Boolean(data.features?.sauna),
      openAirBath: Boolean(data.features?.openAirBath),
      clean: Boolean(data.features?.clean),
      priceInfo: Boolean(data.features?.priceInfo)
    },
    status: data.status || "active",
    updatedAt: serverTimestamp()
  });
}

export async function submitHotel({
  submittedBy, name, area, subArea, address, station,
  chainName, priceRange, tags, features
}) {
  if (!submittedBy) throw new Error("ログイン情報がありません");
  if (!name) throw new Error("ホテル名を入力してください");

  await addDoc(collection(db, "hotelSubmissions"), {
    submittedBy,
    name,
    area: area || "新宿",
    subArea: subArea || "",
    address: address || "",
    station: station || "",
    chainName: chainName || "なし",
    priceRange: priceRange || "",
    tags: tags || [],
    features: {
      sauna: Boolean(features?.sauna),
      openAirBath: Boolean(features?.openAirBath),
      clean: Boolean(features?.clean),
      priceInfo: Boolean(features?.priceInfo)
    },
    status: "pending",
    adminNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function fetchPendingHotelSubmissions() {
  const q = query(
    collection(db, "hotelSubmissions"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function approveHotelSubmission(submission, adminUid) {
  if (!submission) throw new Error("申請情報がありません");

  await addHotel({
    name: submission.name,
    area: submission.area,
    subArea: submission.subArea,
    address: submission.address,
    station: submission.station,
    chainName: submission.chainName,
    priceRange: submission.priceRange,
    tags: submission.tags || [],
    features: submission.features || {},
    createdBy: adminUid
  });

  const submissionRef = doc(db, "hotelSubmissions", submission.id);
  await updateDoc(submissionRef, {
    status: "approved",
    updatedAt: serverTimestamp()
  });
}

export async function rejectHotelSubmission(submissionId, adminNote = "") {
  const submissionRef = doc(db, "hotelSubmissions", submissionId);
  await updateDoc(submissionRef, {
    status: "rejected",
    adminNote,
    updatedAt: serverTimestamp()
  });
}
