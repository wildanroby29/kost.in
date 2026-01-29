const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
  } catch (error) {
    console.error('Firebase Error:', error.message);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('Webhook Aktif');

  try {
    const payload = req.body;
    let xenditOrderId = payload.external_id || (payload.data ? payload.data.reference_id : null);
    let xenditStatus = payload.status || (payload.data ? payload.data.status : null);

    if (!xenditOrderId || !xenditStatus) return res.status(200).send('Data Kosong');

    if (xenditStatus === 'PAID' || xenditStatus === 'SETTLED' || xenditStatus === 'COMPLETED') {
      
      let foundDocRef = null;

      // 1. CARI DI KOLEKSI UTAMA 'orders'
      const mainOrdersRef = db.collection('orders');
      const queryMain = await mainOrdersRef.where('orderId', '==', xenditOrderId).get();
      
      if (!queryMain.empty) {
        foundDocRef = queryMain.docs[0].ref;
      } 

      // 2. KALAU GAK KETEMU, CARI DI SUB-COLLECTION USER
      if (!foundDocRef) {
        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
          const subOrdersRef = db.collection('users').doc(userDoc.id).collection('orders');
          const querySub = await subOrdersRef.where('orderId', '==', xenditOrderId).get();
          if (!querySub.empty) {
            foundDocRef = querySub.docs[0].ref;
            break;
          }
        }
      }

      if (foundDocRef) {
        const orderSnap = await foundDocRef.get();
        const orderData = orderSnap.data();

        // CEK STATUS BIAR GA DOUBLE CLAIM
        if (orderData.status !== 'PAID') {
          const userId = orderData.userId;
          
          // HITUNG POIN (100rb = 1000 Poin)
          const subtotal = orderData.items?.reduce((acc, item) => {
            return acc + (Number(item.price || 0) * Number(item.quantity || 0));
          }, 0) || 0;
          
          const earned = Math.floor(subtotal / 100000) * 1000;

          // UPDATE ORDER
          await foundDocRef.update({
            status: 'PAID',
            pointsEarned: earned,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // UPDATE POIN USER
          if (userId && earned > 0) {
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
              points: admin.firestore.FieldValue.increment(earned)
            });
            console.log(`✅ POIN MASUK: ${earned} ke user ${userId}`);
          }
          
          return res.status(200).send(`SUKSES: ${xenditOrderId} PAID & POIN MASUK`);
        }
        return res.status(200).send('INFO: Sudah Paid sebelumnya');
      } else {
        return res.status(200).send(`GAGAL: ${xenditOrderId} TIDAK DITEMUKAN`);
      }
    }

    return res.status(200).send('Status bukan lunas');
  } catch (error) {
    console.error("WEBHOOK ERROR:", error.message);
    return res.status(200).send('Error Internal');
  }
};