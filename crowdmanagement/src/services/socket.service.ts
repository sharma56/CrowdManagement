import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import type { SocketAlertEvent, SocketLiveOccupancyEvent } from '../types/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

type AlertEventHandler = (event: SocketAlertEvent) => void;
type OccupancyEventHandler = (event: SocketLiveOccupancyEvent) => void;

class SocketService {
  private socket: Socket | null = null;
  private alertHandlers: AlertEventHandler[] = [];
  private occupancyHandlers: OccupancyEventHandler[] = [];

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = authService.getToken();
    if (!token) {
      console.error('Cannot connect socket: No authentication token');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen to alert events
    this.socket.on('alert', (data: SocketAlertEvent) => {
      this.alertHandlers.forEach((handler) => handler(data));
    });

    // Listen to live occupancy events
    this.socket.on('live_occupancy', (data: any) => {
      console.log('SocketService: Received live_occupancy event:', data);
      console.log('SocketService: Data type:', typeof data);
      console.log('SocketService: Data keys:', data ? Object.keys(data) : 'null');
      console.log('SocketService: Raw data:', JSON.stringify(data, null, 2));
      this.occupancyHandlers.forEach((handler) => handler(data));
    });

    // Also listen to other possible event names
    this.socket.on('occupancy', (data: any) => {
      console.log('SocketService: Received occupancy event:', data);
      console.log('SocketService: Data type:', typeof data);
      console.log('SocketService: Data keys:', data ? Object.keys(data) : 'null');
      this.occupancyHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('liveOccupancy', (data: any) => {
      console.log('SocketService: Received liveOccupancy event:', data);
      console.log('SocketService: Data type:', typeof data);
      console.log('SocketService: Data keys:', data ? Object.keys(data) : 'null');
      this.occupancyHandlers.forEach((handler) => handler(data));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // Clear all handlers on disconnect
    this.alertHandlers = [];
    this.occupancyHandlers = [];
  }

  onAlert(handler: AlertEventHandler): () => void {
    this.alertHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.alertHandlers = this.alertHandlers.filter((h) => h !== handler);
    };
  }

  onLiveOccupancy(handler: OccupancyEventHandler): () => void {
    this.occupancyHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.occupancyHandlers = this.occupancyHandlers.filter((h) => h !== handler);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

