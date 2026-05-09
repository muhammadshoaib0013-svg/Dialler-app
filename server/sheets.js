import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

export async function appendCallToSheet(spreadsheetId, callRecord) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const values = [[
      callRecord.phone, 
      callRecord.customerName, 
      callRecord.disposition, 
      callRecord.talkDuration, 
      callRecord.sentiment, 
      callRecord.agentName, 
      new Date().toISOString()
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Calls!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Failed to append call:', error.message);
  }
}
