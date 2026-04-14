/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAvrlPme9_52tX29G2x2lmc6p5h1NAHwbg",
  projectId: "rdif-payment-system",
  messagingSenderId: "7483659767",
  appId: "1:7483659767:web:2d71cc5f4870d284e04af2"
});

const messaging = firebase.messaging();

// This handles the background notification
messaging.onBackgroundMessage((payload) => {
  console.log('Background Message received: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Make sure you have an icon in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});