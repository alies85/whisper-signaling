import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// لیست آفرهای در انتظار
const pendingOffers = new Map(); // socketId -> sdp

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // وقتی کاربر offer جدید می‌سازه
  socket.on("new-offer", (sdp) => {
    pendingOffers.set(socket.id, sdp);
    io.emit("offer-list", Array.from(pendingOffers.entries()).map(([id]) => id));
  });

  // وقتی یه کاربر می‌خواد لیست آفرها رو بگیره
  socket.on("get-offers", () => {
    socket.emit("offer-list", Array.from(pendingOffers.entries()).map(([id]) => id));
  });

  // وقتی یه کاربر می‌خواد با یه offer خاص کانکت شه
  socket.on("select-offer", ({ targetId }) => {
    const targetOffer = pendingOffers.get(targetId);
    if (!targetOffer) return;
    socket.emit("target-offer", { from: targetId, sdp: targetOffer });
  });

  // وقتی جواب (answer) داده میشه
  socket.on("answer", ({ to, sdp }) => {
    io.to(to).emit("answer", { from: socket.id, sdp });
    pendingOffers.delete(to); // حذف آفر بعد از استفاده
    io.emit("offer-list", Array.from(pendingOffers.entries()).map(([id]) => id));
  });

  // تبادل ICE
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    pendingOffers.delete(socket.id);
    io.emit("offer-list", Array.from(pendingOffers.entries()).map(([id]) => id));
  });
});

httpServer.listen(8080, () => {
  console.log("WSS server running on wss://turn.aliesmatparast.ir:8080");
});
