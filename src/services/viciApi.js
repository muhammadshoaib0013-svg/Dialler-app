import axios from 'axios';

const BASE_URL = import.meta.env.REACT_APP_VICI_API_URL || 'https://dialer.yourdomain.com/agc/api.php';
const VDC_DB_URL = import.meta.env.REACT_APP_VDC_DB_URL || 'https://dialer.yourdomain.com/agc/vdc_db_query.php';

const handleVicidialResponse = (data) => {
  if (typeof data !== 'string') return data;
  if (data.includes('ERROR:')) {
    if (data.includes('Invalid Credentials')) throw new Error('API Error: Invalid Username, Password, or insufficient permissions.');
    if (data.includes('User not logged in')) throw new Error('API Error: Agent session expired.');
    throw new Error(`Vicidial Error: ${data.trim()}`);
  }
  return data;
};

export const viciApi = {
  async sendRequest(endpoint, params) {
    try {
      const response = await axios.get(endpoint, { 
        params: { source: 'react_webrtc', ...params }
      });
      return handleVicidialResponse(response.data);
    } catch (error) {
      console.error("[ViciAPI] Network or CORS Error:", error);
      throw new Error(error.response?.data || "Network failure connecting to Vicidial.");
    }
  },

  async checkAgentStatus(user, pass, agent_user) {
    return this.sendRequest(BASE_URL, {
      user, pass, agent_user, function: 'status_check'
    });
  },

  async externalDial(phoneNumber, user, pass, agent_user) {
    return this.sendRequest(BASE_URL, {
      function: 'external_dial',
      user, pass, agent_user,
      value: phoneNumber,
      phone_code: '1',
      search: 'YES',
      preview: 'NO',
      focus: 'YES'
    });
  },

  async hangupCall(user, pass, agent_user) {
    return this.sendRequest(BASE_URL, {
      function: 'external_hangup',
      user, pass, agent_user,
      value: '1'
    });
  },

  async dispoCall(status, user, pass, agent_user, lead_id) {
    // Note: Dispo often hits vdc_db_query or api.php based on agent screen version
    return this.sendRequest(VDC_DB_URL, {
      user, pass, agent_user,
      ACTION: 'update_dispo', 
      dispo_choice: status,
      lead_id: lead_id || ''
    });
  },

  async getLeadDetails(phoneNumber) {
      // In production, point this to non_agent_api.php or your custom CRM fetcher
      return null;
  }
};
