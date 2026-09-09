import { api } from './axiosConfig';

export interface HeartbeatResponse {
  status: string;
  online?: boolean;
}

export const sendHeartbeat = async (): Promise<HeartbeatResponse> => {
  const response = await api.post('/presence/heartbeat');
  return response.data;
};
