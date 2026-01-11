// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export const fetcher = (url) => API.get(url).then(res => res.data);
export default API;