// ==================== XIPHORIX GOOGLE APPS SCRIPT - FULL BACKEND ====================
// Deploy sebagai Web App: Execute as "Me", Access "Anyone"
// Sheet name: "Absensi" with headers: Nama | Status | Waktu | Tanggal | Bukti

const SHEET_NAME = 'Absensi';
const FOLDER_ID = '1mwIWs4eImjRxsDu_zqeP-P7TwHwb6j2S'; // Drive folder bukti

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getAbsensi') {
      return ContentService.createTextOutput(JSON.stringify(getAbsensiData())).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({error: 'Invalid action'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'addAbsen') {
      addAbsensi(data);
    } else if (action === 'resetHari') {
      resetHariIni(data.today);
    } else if (action === 'uploadBukti') {
      const link = uploadToDrive(data);
      return ContentService.createTextOutput(JSON.stringify({link: link})).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput('OK');
  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

function getAbsensiData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "Absensi" not found');
  
  const data = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    result.push({
      nama: data[i][0] || '',
      status: data[i][1] || '',
      waktu: data[i][2] || '',
      tanggal: data[i][3] || '',
      bukti: data[i][4] || null,
      timestamp: data[i][5] || 0
    });
  }
  return result;
}

function addAbsensi(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found');
  
  sheet.appendRow([
    data.nama,
    data.status,
    data.waktu,
    data.tanggal,
    data.bukti || '',
    data.timestamp || Date.now()
  ]);
}

function resetHariIni(todayStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  for (let i = lastRow; i > 0; i--) {
    const tanggalCell = sheet.getRange(i, 4).getValue(); // Column D = tanggal
    if (tanggalCell === todayStr) {
      sheet.deleteRow(i);
    }
  }
}

function uploadToDrive(data) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const bytes = Utilities.base64Decode(data.base64Data);
  const blob = Utilities.newBlob(bytes, 'image/jpeg', data.fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// Test function - run manually
function testFunctions() {
  console.log('getAbsensi:', getAbsensiData());
}

// Deploy: Save → Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone

