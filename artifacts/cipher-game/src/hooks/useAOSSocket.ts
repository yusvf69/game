import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";
import { fireDirectorMessage } from "@/components/aos/AOSDirectorMessage";

const BASE_URL = import.meta.env.VITE_API_URL || "";

let sharedSocket: Socket | null = null;
let listenerCount = 0;

export function useAOSSocket() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = getToken();
    if (!token) return;

    if (!sharedSocket) {
      sharedSocket = io(BASE_URL, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 5000,
      }).on("connect_error", () => {}); // silent fail on serverless
    listenerCount++;

    const handler = (data: { text: string }) => {
      if (data?.text) fireDirectorMessage(data.text);
    };

    sharedSocket.on("director:message", handler);

    return () => {
      listenerCount--;
      sharedSocket?.off("director:message", handler);
      if (listenerCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
  }, []);
}