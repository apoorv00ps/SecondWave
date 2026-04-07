/**
 * core.js — SecondWave Unified Logic
 * Firebase · Auth · DB · Storage · Pricing · UI Helpers · Eye-Follow Animation
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  getDatabase, ref, push, set, get, onValue, update, remove
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js';

// ── Firebase Configuration ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAmt960tx0cqZu2C7U90L8sh_ypsU7DLB4",
  authDomain: "secondwave-eaf1a.firebaseapp.com",
  databaseURL: "https://secondwave-eaf1a-default-rtdb.firebaseio.com",
  projectId: "secondwave-eaf1a",
  storageBucket: "secondwave-eaf1a.firebasestorage.app",
  messagingSenderId: "580649978923",
  appId: "1:580649978923:web:3a3011cbdbb625c24b2e6e",
  measurementId: "G-5XDXCV5CVW"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// ── Pricing Logic ───────────────────────────────────────────────────
export const MULTIPLIERS = {
  DAY_FROM_HOUR: 15,
  MONTH_FROM_DAY: 10,
};

export function calculateRates(hourlyRate) {
  const h = Number(hourlyRate) || 0;
  const d = Math.round(h * MULTIPLIERS.DAY_FROM_HOUR);
  const m = Math.round(d * MULTIPLIERS.MONTH_FROM_DAY);
  return { hourly: h, daily: d, monthly: m };
}

export function formatPrice(amount, unit = '') {
  const suffix = unit ? `/${unit}` : '';
  return `₹${amount}${suffix}`;
}

// ── Auth Helpers ───────────────────────────────────────────────────
export function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider).then(res => res.user);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function requireAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      callback(user);
    }
  });
}

export function signOutUser() {
  return signOut(auth).then(() => { window.location.href = 'index.html'; });
}

// ── Database (Listings) ───────────────────────────────────────────
export async function createListing(listing) {
  const listingId = listing.id || push(ref(db, 'listings')).key;
  const listingRef = ref(db, `listings/${listingId}`);
  await set(listingRef, { ...listing, id: listingId });
  return listingId;
}

export async function fetchListings() {
  const snap = await get(ref(db, 'listings'));
  const data = snap.val() || {};
  return Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function onListings(callback) {
  return onValue(ref(db, 'listings'), (snapshot) => {
    const data = snapshot.val() || {};
    const arr = Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(arr);
  });
}

export async function fetchListing(id) {
  const snap = await get(ref(db, `listings/${id}`));
  return snap.val();
}

export async function updateListing(id, updates) {
  await update(ref(db, `listings/${id}`), updates);
}

export async function deleteListing(id) {
  await remove(ref(db, `listings/${id}`));
}

export function onMyListings(uid, callback) {
  return onValue(ref(db, 'listings'), (snapshot) => {
    const data = snapshot.val() || {};
    const mine = Object.values(data).filter(l => l.postedBy === uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(mine);
  });
}

// ── Database (Requests) ───────────────────────────────────────────
export async function createRequest(request) {
  const reqRef = push(ref(db, 'requests'));
  await set(reqRef, { ...request, id: reqRef.key });
  return reqRef.key;
}

export async function hasRequested(uid, listingId) {
  const snap = await get(ref(db, 'requests'));
  const data = snap.val() || {};
  return Object.values(data).some(r => r.fromUid === uid && r.listingId === listingId);
}

export function onMyRequests(uid, callback) {
  return onValue(ref(db, 'requests'), (snap) => {
    const data = snap.val() || {};
    const mine = Object.values(data).filter(r => r.fromUid === uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(mine);
  });
}

export function onRequestsReceived(uid, callback) {
  return onValue(ref(db, 'requests'), (snap) => {
    const data = snap.val() || {};
    const received = Object.values(data).filter(r => r.toUid === uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(received);
  });
}

// ── Database (Notifications & Users) ─────────────────────────────
export async function createNotification(uid, notif) {
  const notifRef = push(ref(db, `notifications/${uid}`));
  await set(notifRef, { ...notif, id: notifRef.key });
  return notifRef.key;
}

export function onNotifications(uid, callback) {
  return onValue(ref(db, `notifications/${uid}`), (snap) => {
    const data = snap.val() || {};
    const arr = Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(arr);
  });
}

export async function markAllNotifsRead(uid) {
  const snap = await get(ref(db, `notifications/${uid}`));
  const data = snap.val() || {};
  const updates = {};
  Object.keys(data).forEach(k => { updates[`${k}/read`] = true; });
  if (Object.keys(updates).length > 0) await update(ref(db, `notifications/${uid}`), updates);
}

export async function saveUser(uid, userData) {
  await update(ref(db, `users/${uid}`), { ...userData, lastSeen: Date.now() });
}

// ── Storage (Images) ────────────────────────────────────────────────
export async function uploadListingImages(listingId, files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const path = `listings/${listingId}/${i}_${Date.now()}`;
      const imgRef = sRef(storage, path);
      const snap = await uploadBytes(imgRef, files[i]);
      const url = await getDownloadURL(snap.ref);
      urls.push(url);
      if (typeof onProgress === 'function') onProgress(i + 1, files.length);
    } catch (err) {
      console.error(`Failed to upload image ${i}:`, err);
      throw new Error(`Upload failed for image ${i+1}. Please check your connection.`);
    }
  }
  return urls;
}

// ── Shared UI Constants (Categories) ──────────────────────────────
export const CATEGORIES = [
  { id: 'clothing',     label: 'Clothing',     icon: '👗' },
  { id: 'electronics', label: 'Electronics',   icon: '📱' },
  { id: 'furniture',   label: 'Furniture',     icon: '🛋️' },
  { id: 'property',    label: 'Property',      icon: '🏠' },
  { id: 'kitchen',     label: 'Kitchen',       icon: '🍳' },
  { id: 'books',       label: 'Books',         icon: '📚' },
  { id: 'transport',   label: 'Transport',     icon: '🚲' },
  { id: 'sports',      label: 'Sports',        icon: '⚽' },
  { id: 'tools',       label: 'Tools',         icon: '🔧' },
  { id: 'toys',        label: 'Toys & Games',  icon: '🎮' },
  { id: 'health',      label: 'Health',        icon: '💊' },
  { id: 'other',       label: 'Other',         icon: '📦' },
];

// ── Shared UI Helpers (v2 - Cleaned) ────────────────────────────────
export function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

export function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function updateNavBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Eye-Following & Emoji Animations ──────────────────────────────
export function initEyeFollowing() {
  const pupils = document.querySelectorAll('[data-pupil]');
  if (pupils.length === 0) return;

  const onMove = (e) => {
    const x = e.clientX; const y = e.clientY;
    pupils.forEach(p => {
      const type = p.dataset.pupilType || 'circle';
      const maxOff = parseFloat(p.dataset.maxOffset || 5);
      const ecx = parseFloat(p.dataset.eyeCx);
      const ecy = parseFloat(p.dataset.eyeCy);
      
      const rect = p.getBoundingClientRect();
      const pcx = rect.left + rect.width/2;
      const pcy = rect.top + rect.height/2;

      const dx = x - pcx; const dy = y - pcy;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(maxOff, Math.sqrt(dx*dx + dy*dy) / 20);
      const ox = Math.cos(angle) * dist;
      const oy = Math.sin(angle) * dist;

      if (type === 'rect') {
        const bx = parseFloat(p.dataset.baseX);
        const by = parseFloat(p.dataset.baseY);
        p.setAttribute('x', bx + ox);
        p.setAttribute('y', by + oy);
      } else {
        p.setAttribute('cx', ecx + ox);
        p.setAttribute('cy', ecy + oy);
      }
    });
  };
  window.addEventListener('mousemove', onMove);
}

export function initEmojiBar() {
  const bar = document.getElementById('emoji-bar');
  if (!bar) return;
  const FACES = ['😊', '🤩', '👀', '🥳', '😄', '😎', '🌟', '🤔'];
  bar.innerHTML = '';
  const faces = [];
  FACES.forEach(em => {
    const wrap = document.createElement('div'); wrap.className = 'emoji-face'; wrap.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span'); inner.className = 'emoji-inner'; inner.textContent = em;
    wrap.appendChild(inner); bar.appendChild(wrap); faces.push({ wrap, inner });
  });

  let mouseX = -999, mouseY = -999, tick = 0, isIdle = true, idleTimer;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY; isIdle = false;
    clearTimeout(idleTimer); idleTimer = setTimeout(() => { isIdle = true; }, 3000);
  });

  function animate() {
    tick++;
    faces.forEach(({ wrap, inner }, idx) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
      if (isIdle) {
        const breathe = Math.sin((tick * 0.03) + idx * 0.7) * 0.06;
        const sway = Math.sin((tick * 0.02) + idx * 1.1) * 3;
        inner.style.transform = `translateY(${sway}px) scale(${1 + breathe})`;
      } else {
        const dx = mouseX - cx; const dy = mouseY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy); const angle = Math.atan2(dy, dx);
        const tiltX = (dy/400)*12; const tiltY = -(dx/400)*12;
        inner.style.transform = `perspective(200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotate(${angle*0.04}deg) scale(${1 + Math.min(dist,500)/4000})`;
      }
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ── Dropdowns & Initializer ─────────────────────────────────────────
function initGlobal() {
  // Dropdowns
  document.querySelectorAll('[data-dropdown-trigger]').forEach(btn => {
    const target = document.getElementById(btn.dataset.dropdownTrigger);
    if (!target) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = target.classList.contains('open');
      document.querySelectorAll('.dropdown-panel.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) target.classList.add('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-panel.open').forEach(d => d.classList.remove('open'));
  });

  // Watchers
  initEyeFollowing();
  initEmojiBar();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobal);
else initGlobal();
