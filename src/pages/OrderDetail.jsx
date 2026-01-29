import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ ...docSnap.data(), id: docSnap.id });
        } else {
          navigate('/order');
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        navigate('/order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-bold text-slate-300 text-[8px] tracking-[0.3em] uppercase">
      MEMUAT...
    </div>
  );
  
  if (!order) return null;

  // --- LOGIC PERHITUNGAN & MAPPING DATA ---
  const items = order.items || [];
  const subtotal = items.reduce((a, b) => a + (Number(b.price || 0) * Number(b.quantity || 0)), 0);
  
  const totalWeightGram = items.reduce((a, b) => a + (Number(b.weight || 0) * Number(b.quantity || 0)), 0);
  const displayWeight = (totalWeightGram / 1000).toFixed(1);

  const ongkir = Number(order.courier?.price || order.shipping_cost || 0);
  const totalAkhir = Number(order.total || (subtotal + ongkir));
  
  // Mapping Alamat & Kontak Penerima
  const alamatLengkap = order.shipping?.address || order.shippingAddress || "ALAMAT TIDAK TERSEDIA";
  const namaPenerima = order.shipping?.contact_name || order.customerName || "PELANGGAN";
  const teleponPenerima = order.shipping?.contact_phone || order.customerPhone || "NOMOR TIDAK TERSEDIA";
  
  const cabangPengirim = order.originWarehouse || "CABANG UTAMA";
  const alamatCabang = order.branchAddress || "MEGA UTAMA OFFICIAL CENTER";
  const namaKurir = order.courier?.courier_name || 'REGULER';

  const statusStr = (order.status || "").toUpperCase();
  const isPending = statusStr.includes('PENDING') || statusStr.includes('MENUNGGU');
  const isPaid = !isPending && !['EXPIRED', 'CANCELLED'].includes(statusStr);
  
  const currentStep = (['PAID', 'SETTLED', 'DIPROSES'].includes(statusStr)) ? 2 : 
                      (statusStr === 'DIKIRIM' ? 3 : 
                      (statusStr === 'SELESAI' ? 4 : 1));

  const handlePrintInvoice = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const pri = iframe.contentWindow;

    const htmlContent = `
      <html>
        <head>
          <title>INVOICE - ${id.toUpperCase()}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: 'Segoe UI', sans-serif; text-transform: uppercase; padding: 5mm; font-size: 11px; color: #000; }
            .header { border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .store-name { font-size: 20px; font-weight: 900; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .label { font-size: 9px; font-weight: 800; border-bottom: 1px solid #000; margin-bottom: 5px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { border-bottom: 2px solid #000; text-align: left; padding: 8px 4px; font-size: 10px; }
            td { padding: 8px 4px; border-bottom: 1px solid #eee; }
            .total-section { margin-top: 20px; float: right; width: 45%; }
            .row { display: flex; justify-content: space-between; padding: 3px 0; }
            .grand-total { border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; font-weight: 900; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="store-name">MEGA UTAMA STORE</div>
              <div>#INV-${id.toUpperCase()}</div>
            </div>
            <div style="text-align:right">
              TANGGAL: ${new Date().toLocaleDateString('id-ID')}<br>
              STATUS: ${statusStr}
            </div>
          </div>
          <div class="grid">
            <div>
              <span class="label">PENGIRIM</span><br>
              <strong>${cabangPengirim}</strong><br>
              ${alamatCabang}
            </div>
            <div>
              <span class="label">PENERIMA</span><br>
              <strong>${namaPenerima}</strong><br>
              ${teleponPenerima}<br>
              ${alamatLengkap}
            </div>
          </div>
          <table>
            <thead><tr><th>ITEM</th><th style="text-align:center">QTY</th><th style="text-align:center">BERAT</th><th style="text-align:right">HARGA</th></tr></thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:center">${((item.weight * item.quantity) / 1000).toFixed(1)} KG</td>
                  <td style="text-align:right">RP ${(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-section">
            <div class="row"><span>SUBTOTAL</span><span>RP ${subtotal.toLocaleString()}</span></div>
            <div class="row"><span>ONGKIR (${namaKurir} - ${displayWeight} KG)</span><span>RP ${ongkir.toLocaleString()}</span></div>
            <div class="row grand-total"><span>TOTAL</span><span>RP ${totalAkhir.toLocaleString()}</span></div>
          </div>
        </body>
      </html>
    `;

    pri.document.open();
    pri.document.write(htmlContent);
    pri.document.close();
    setTimeout(() => {
      pri.focus();
      pri.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] antialiased text-slate-900 flex justify-center font-sans uppercase font-black text-left">
      <div className="w-full max-w-md bg-white min-h-screen relative flex flex-col border-x border-slate-50 shadow-sm">
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-6 pt-12 pb-6 border-b border-slate-50">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/order')} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <i className="ri-arrow-left-line text-lg"></i>
              </button>
              <div>
                <p className="text-[7px] text-blue-600 font-bold tracking-[0.2em] mb-0.5">DETAIL TRANSAKSI</p>
                <h1 className="text-sm font-black tracking-tight text-slate-900">#INV-{id.slice(-8).toUpperCase()}</h1>
              </div>
            </div>
            {isPaid && (
              <button onClick={handlePrintInvoice} className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                <i className="ri-printer-line text-lg"></i>
              </button>
            )}
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Tracker Status */}
          {isPaid && (
            <section className="bg-white rounded-2xl p-5 border border-slate-50 shadow-sm">
              <div className="flex justify-between items-center relative px-1">
                <div className="absolute top-[12px] left-4 right-4 h-[1px] bg-slate-100"></div>
                <div className="absolute top-[12px] left-4 h-[1px] bg-blue-600 transition-all duration-700" style={{ width: `${(currentStep - 1) * 33.3}%` }}></div>
                {['LUNAS', 'PROSES', 'KIRIM', 'SAMPAI'].map((step, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${currentStep > idx ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-200'}`}>
                      <i className="ri-checkbox-circle-fill"></i>
                    </div>
                    <span className={`text-[6px] font-black tracking-tighter ${currentStep > idx ? 'text-blue-600' : 'text-slate-300'}`}>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Kartu Resi */}
          <section className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[7px] font-black tracking-widest opacity-70 mb-1 uppercase">NOMOR RESI PENGIRIMAN</p>
                <p className="text-sm font-black tracking-[0.1em]">{order.resi || 'SEDANG DIPROSES'}</p>
              </div>
              {order.resi && (
                <button onClick={() => {navigator.clipboard.writeText(order.resi); alert('RESI DISALIN!')}} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                  <i className="ri-file-copy-line text-lg"></i>
                </button>
              )}
            </div>
          </section>

          {/* Pengirim & Penerima */}
          <section className="space-y-4">
            <div className="bg-white border border-slate-50 rounded-2xl p-4 flex gap-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                <i className="ri-store-2-fill text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] text-blue-600 font-bold tracking-widest mb-1 uppercase">DIKIRIM DARI</p>
                <p className="text-[9px] font-black text-slate-800 mb-0.5 uppercase">{cabangPengirim}</p>
                <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase">{alamatCabang}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-50 rounded-2xl p-4 flex gap-4 shadow-sm">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                <i className="ri-map-pin-2-fill text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] text-slate-300 font-bold tracking-widest mb-1 uppercase">ALAMAT PENERIMA</p>
                <p className="text-[9px] font-black text-slate-800 mb-0.5 uppercase">{namaPenerima}</p>
                {/* NOMOR TELEPON DITAMPILKAN DI SINI */}
                <p className="text-[8px] text-blue-600 font-black mb-1 uppercase tracking-tighter">TELP: {teleponPenerima}</p>
                <p className="text-[8px] text-slate-400 font-medium leading-relaxed lowercase">{alamatLengkap}</p>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-2">
            <p className="text-[7px] text-slate-300 font-bold tracking-widest px-1 uppercase">DAFTAR BELANJA</p>
            {items.map((item, i) => (
              <div key={i} className="flex gap-4 items-center p-3 bg-white border border-slate-50 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-slate-50 rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={item.image} className="w-full h-full object-contain" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9px] font-bold text-slate-700 truncate uppercase">{item.name}</h4>
                  <p className="text-[7px] text-slate-400 font-medium uppercase">{item.quantity} UNIT @ RP {Number(item.price).toLocaleString()}</p>
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase">RP {(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </section>

          {/* Summary */}
          <section className="bg-slate-50/50 border border-slate-50 rounded-2xl p-5 space-y-2">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
              <span>SUBTOTAL</span>
              <span>RP {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
              <span className="flex flex-col">
                <span>BIAYA ONGKIR</span>
                <span className="text-[7px] text-blue-600 font-black tracking-wider">{namaKurir} • {displayWeight} KG</span>
              </span>
              <span>RP {ongkir.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-900 uppercase">TOTAL PEMBAYARAN</span>
              <span className="text-base font-black text-blue-600 tracking-tight uppercase">RP {totalAkhir.toLocaleString()}</span>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="pt-8 space-y-3 pb-12">
            {isPending && (
              <button 
                onClick={() => window.location.href = (order.invoice_url || order.checkout_url)} 
                className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase"
              >
                BAYAR SEKARANG
              </button>
            )}
            <button 
              onClick={() => window.open(`https://wa.me/628123456789?text=Halo Admin, Saya ingin bertanya tentang pesanan #INV-${id.toUpperCase()}`)} 
              className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all uppercase"
            >
              <i className="ri-whatsapp-line text-lg text-green-500"></i> HUBUNGI ADMIN
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}