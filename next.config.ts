import type { NextConfig } from "next";
import os from "os";

// Función para obtener dinámicamente todas las IPs IPv4 locales activas de la máquina
const getLocalIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const net of networkInterface) {
        // Filtrar solo IPv4 no internas (excluir loopback 127.0.0.1)
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
          ips.push(`${net.address}:3000`);
        }
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "localhost:3000",
    ...getLocalIPs()
  ],
};

export default nextConfig;
