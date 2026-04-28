import Chart from "chart.js/auto";

export function initDashboard() {
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:9999").replace(/\/$/, "");
    const SENSOR_POLL_MS = 10000;
    const GPS_POLL_MS = 10000;
    const CAMERA_FRAME_POLL_MS = 2000;
    const DASHBOARD_REFRESH_SECONDS = Math.round(SENSOR_POLL_MS / 1000);
    const DEFAULT_PREDICTION_HORIZON = 24;
    const DEFAULT_PREDICTION_HISTORY_CONTEXT_POINTS = 16;
    const PONDS_STORAGE_KEY = "qq_ponds";
    const ponds = (() => {
      try {
        const raw = localStorage.getItem(PONDS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((pond) => {
          if (!pond || typeof pond !== "object") return false;
          const name = String(pond.name || "").toLowerCase();
          const station = String(pond.station || "").toLowerCase();
          if (name === "pond alpha" || name === "pond beta" || name === "pond gamma") return false;
          if (station === "qq-dbafa5-a" || station === "qq-rohu-22" || station === "qq-cat-11") return false;
          return true;
        });
      } catch {
        return [];
      }
    })();

    const sensors = [
      {
        key: "ph",
        name: "pH",
        shortName: "pH",
        unit: "",
        value: null,
        safeRange: [6.5, 8.5],
        absoluteRange: [4, 10],
        decimals: 2,
        icon: "flask",
        seriesBase: 6.1
      },
      {
        key: "do",
        name: "Dissolved Oxygen",
        shortName: "Dissolved Oxygen",
        unit: "mg/L",
        value: null,
        safeRange: [5, 20],
        absoluteRange: [0, 15],
        decimals: 2,
        icon: "droplets",
        seriesBase: 3.2
      },
      {
        key: "turbidity",
        name: "Turbidity",
        shortName: "Turbidity",
        unit: "NTU",
        value: null,
        safeRange: [0, 30],
        absoluteRange: [0, 150],
        decimals: 0,
        icon: "waves",
        seriesBase: 118
      },
      {
        key: "temperature",
        name: "Temperature",
        shortName: "Temperature",
        unit: "C",
        value: null,
        safeRange: [20, 30],
        absoluteRange: [10, 40],
        decimals: 2,
        icon: "thermometer",
        seriesBase: 33.4
      },
      {
        key: "tds",
        name: "TDS",
        shortName: "TDS",
        unit: "ppm",
        value: null,
        safeRange: [0, 1000],
        absoluteRange: [0, 2000],
        decimals: 0,
        icon: "dots",
        seriesBase: 2150
      }
    ];

    const alerts = [];

    const insights = [];

    const i18n = {
      en: {
        navDashboard: "Dashboard", navPonds: "Ponds", navAlerts: "Alerts", navProfile: "Profile",
        liveReadings: "Live Readings", pageDashboard: "Dashboard", lastUpdated: "Last updated",
        exportCSV: "Export CSV", exportExcel: "Export Excel", dailyReport: "Daily Report",
        logout: "Logout",
        loginTitle: "Sign in", loginSub: "Access your pond dashboard and live water quality updates.",
        emailLabel: "Email", passwordLabel: "Password", signIn: "Sign in",
        emailPlaceholder: "name@example.com", passwordPlaceholder: "Enter password",
        demoHint: "Use your account email and password to continue.",
        loginError: "Enter a valid email and password with at least 4 characters.",
        secondsRefresh: "s refresh", historicalTrends: "Historical trends", recentAlerts: "Recent alerts",
        predictionsTitle: "Predictions", predictionsSub: "Forecast generated from historical sensor data",
        predictionTargetLabel: "Predict metric", predictionHorizonLabel: "Forecast points", predictionHistoryLabel: "Past points",
        predictionsSelected: "Selected value", predictionsAnomalies: "Anomalies",
        alertsSub: "Threshold and trend based events", alertLog: "Alert log", pondsTitle: "Ponds",
        pondsSub: "Species-aware overview for all monitored stations", addPond: "+ Add pond",
        analytics: "Analytics", analyticsSub: "Daily stats and rainfall correlation",
        systemHealth: "System health", systemHealthSub: "Device and connectivity status",
        online: "Online", deviceStatus: "Device status", espConnected: "ESP32 connected",
        lastPacket: "Last packet", twoSecondsAgo: "2 seconds ago", batteryLevel: "Battery level",
        pondsPageSub: "Overview of all monitored ponds and station details.",
        alertsPageSub: "Track warning and critical events across all ponds.",
        profilePageSub: "Farmer profile, preferences, language and reporting setup.",
        preferredLanguage: "Preferred language", reportPreference: "Report preference",
        dailyPdfEmail: "Daily PDF and email alerts", farmLocation: "Farm location",
        profileSettings: "Profile settings", profileSettingsSub: "Change language and review your current monitoring preferences.",
        activeStations: "Active stations", alertMode: "Alert mode", smsEmailPush: "SMS, email, and push notifications",
        selectedSpecies: "Selected species", totalPonds: "Total Ponds", healthy: "Healthy", warning: "Warning",
        activeAlerts: "Active Alerts", safe: "Safe", critical: "Critical", station: "Station",
        temperature: "Temperature", dissolvedOxygen: "Dissolved Oxygen",
        min: "Min", max: "Max", avg: "Avg", trend: "Trend", rising: "Rising", falling: "Falling",
        selectedLast: "selected · last", rainfallCorrelation: "Rainfall correlation",
        dailyAverages: "Daily averages", complianceView: "Compliance view"
      },
      ta: {
        navDashboard: "டாஷ்போர்டு", navPonds: "குளங்கள்", navAlerts: "எச்சரிக்கைகள்", navProfile: "சுயவிவரம்",
        liveReadings: "நேரடி அளவீடுகள்", pageDashboard: "டாஷ்போர்டு", lastUpdated: "கடைசியாக புதுப்பிக்கப்பட்டது",
        exportCSV: "CSV ஏற்றுமதி", exportExcel: "எக்செல் ஏற்றுமதி", dailyReport: "தினசரி அறிக்கை",
        logout: "வெளியேறு",
        loginTitle: "உள்நுழை", loginSub: "உங்கள் குள டாஷ்போர்டு மற்றும் நேரடி நீர்தர புதுப்பிப்புகளை அணுகவும்.",
        emailLabel: "மின்னஞ்சல்", passwordLabel: "கடவுச்சொல்", signIn: "உள்நுழை",
        emailPlaceholder: "name@example.com", passwordPlaceholder: "கடவுச்சொல்லை உள்ளிடவும்",
        demoHint: "தொடர உங்கள் கணக்கு மின்னஞ்சல் மற்றும் கடவுச்சொல்லைப் பயன்படுத்தவும்.",
        loginError: "சரியான மின்னஞ்சல் மற்றும் குறைந்தது 4 எழுத்துகள் கொண்ட கடவுச்சொல்லை உள்ளிடவும்.",
        secondsRefresh: "விநாடி புதுப்பிப்பு", historicalTrends: "வரலாற்று போக்குகள்", recentAlerts: "சமீபத்திய எச்சரிக்கைகள்",
        predictionsTitle: "முன்கணிப்புகள்", predictionsSub: "வரலாற்று சென்சார் தரவின் அடிப்படையில் உருவாக்கப்பட்ட முன்னறிவிப்பு",
        predictionTargetLabel: "கணிப்பு அளவுரு", predictionHorizonLabel: "முன்கணிப்பு புள்ளிகள்", predictionHistoryLabel: "கடந்த புள்ளிகள்",
        alertsSub: "வரம்பு மற்றும் போக்கு அடிப்படையிலான நிகழ்வுகள்", alertLog: "எச்சரிக்கை பதிவு", pondsTitle: "குளங்கள்",
        pondsSub: "அனைத்து கண்காணிப்பு நிலையங்களின் இன அடிப்படையிலான காட்சி", addPond: "+ குளம் சேர்க்க",
        analytics: "பகுப்பாய்வு", analyticsSub: "தினசரி புள்ளிவிவரங்கள் மற்றும் மழை தொடர்பு",
        systemHealth: "அமைப்பு நிலை", systemHealthSub: "சாதனம் மற்றும் இணைப்பு நிலை",
        online: "ஆன்லைன்", deviceStatus: "சாதன நிலை", espConnected: "ESP32 இணைக்கப்பட்டுள்ளது",
        lastPacket: "கடைசி தொகுப்பு", twoSecondsAgo: "2 விநாடிகள் முன்பு", batteryLevel: "மின்கலம் நிலை",
        pondsPageSub: "அனைத்து கண்காணிக்கப்பட்ட குளங்களும் நிலைய விவரங்களும்.",
        alertsPageSub: "அனைத்து குளங்களிலும் உள்ள எச்சரிக்கை மற்றும் ஆபத்து நிகழ்வுகளை கண்காணிக்கவும்.",
        profilePageSub: "மீன்வளர் சுயவிவரம், விருப்பங்கள், மொழி மற்றும் அறிக்கை அமைப்பு.",
        preferredLanguage: "விருப்ப மொழி", reportPreference: "அறிக்கை விருப்பம்",
        dailyPdfEmail: "தினசரி PDF மற்றும் மின்னஞ்சல் எச்சரிக்கைகள்", farmLocation: "பண்ணை இடம்",
        profileSettings: "சுயவிவர அமைப்புகள்", profileSettingsSub: "மொழியை மாற்றி தற்போதைய கண்காணிப்பு விருப்பங்களை பார்க்கவும்.",
        activeStations: "செயலில் உள்ள நிலையங்கள்", alertMode: "எச்சரிக்கை முறை", smsEmailPush: "SMS, மின்னஞ்சல் மற்றும் push அறிவிப்புகள்",
        selectedSpecies: "தேர்ந்தெடுக்கப்பட்ட இனங்கள்", totalPonds: "மொத்த குளங்கள்", healthy: "ஆரோக்கியம்", warning: "எச்சரிக்கை",
        activeAlerts: "செயலில் உள்ள எச்சரிக்கைகள்", safe: "பாதுகாப்பானது", critical: "மிகவும் ஆபத்து", station: "நிலையம்",
        temperature: "வெப்பநிலை", dissolvedOxygen: "கரைந்த ஆக்சிஜன்",
        min: "குறைந்தது", max: "அதிகபட்சம்", avg: "சராசரி", trend: "போக்கு", rising: "உயர்வு", falling: "குறைவு",
        selectedLast: "தேர்ந்தெடுக்கப்பட்டது · கடைசி", rainfallCorrelation: "மழை தொடர்பு",
        dailyAverages: "தினசரி சராசரிகள்", complianceView: "இணக்க காட்சி"
      },
      hi: {
        navDashboard: "डैशबोर्ड", navPonds: "तालाब", navAlerts: "अलर्ट", navProfile: "प्रोफ़ाइल",
        liveReadings: "लाइव रीडिंग", pageDashboard: "डैशबोर्ड", lastUpdated: "अंतिम अपडेट",
        exportCSV: "CSV निर्यात", exportExcel: "एक्सेल निर्यात", dailyReport: "दैनिक रिपोर्ट",
        logout: "लॉग आउट",
        loginTitle: "साइन इन", loginSub: "अपने तालाब डैशबोर्ड और लाइव जल गुणवत्ता अपडेट देखें।",
        emailLabel: "ईमेल", passwordLabel: "पासवर्ड", signIn: "साइन इन",
        emailPlaceholder: "name@example.com", passwordPlaceholder: "पासवर्ड दर्ज करें",
        demoHint: "जारी रखने के लिए अपने खाते का ईमेल और पासवर्ड उपयोग करें।",
        loginError: "वैध ईमेल और कम से कम 4 अक्षरों का पासवर्ड दर्ज करें।",
        secondsRefresh: "सेकंड रिफ्रेश", historicalTrends: "ऐतिहासिक रुझान", recentAlerts: "हाल के अलर्ट",
        predictionsTitle: "पूर्वानुमान", predictionsSub: "ऐतिहासिक सेंसर डेटा से बनाया गया अनुमान",
        predictionTargetLabel: "कौन सा मान", predictionHorizonLabel: "भविष्य बिंदु", predictionHistoryLabel: "पिछले बिंदु",
        alertsSub: "सीमा और रुझान आधारित घटनाएं", alertLog: "अलर्ट लॉग", pondsTitle: "तालाब",
        pondsSub: "सभी मॉनिटर किए गए स्टेशनों का प्रजाति-आधारित अवलोकन", addPond: "+ तालाब जोड़ें",
        analytics: "एनालिटिक्स", analyticsSub: "दैनिक आँकड़े और वर्षा संबंध",
        systemHealth: "सिस्टम स्वास्थ्य", systemHealthSub: "डिवाइस और कनेक्टिविटी स्थिति",
        online: "ऑनलाइन", deviceStatus: "डिवाइस स्थिति", espConnected: "ESP32 जुड़ा है",
        lastPacket: "अंतिम पैकेट", twoSecondsAgo: "2 सेकंड पहले", batteryLevel: "बैटरी स्तर",
        pondsPageSub: "सभी मॉनिटर किए गए तालाबों और स्टेशन विवरण का अवलोकन।",
        alertsPageSub: "सभी तालाबों में चेतावनी और गंभीर घटनाओं को ट्रैक करें।",
        profilePageSub: "किसान प्रोफ़ाइल, पसंद, भाषा और रिपोर्टिंग सेटअप।",
        preferredLanguage: "पसंदीदा भाषा", reportPreference: "रिपोर्ट पसंद",
        dailyPdfEmail: "दैनिक PDF और ईमेल अलर्ट", farmLocation: "फार्म स्थान",
        profileSettings: "प्रोफ़ाइल सेटिंग्स", profileSettingsSub: "भाषा बदलें और अपनी वर्तमान मॉनिटरिंग पसंद देखें।",
        activeStations: "सक्रिय स्टेशन", alertMode: "अलर्ट मोड", smsEmailPush: "SMS, ईमेल और पुश नोटिफिकेशन",
        selectedSpecies: "चयनित प्रजातियाँ", totalPonds: "कुल तालाब", healthy: "स्वस्थ", warning: "चेतावनी",
        activeAlerts: "सक्रिय अलर्ट", safe: "सुरक्षित", critical: "गंभीर", station: "स्टेशन",
        temperature: "तापमान", dissolvedOxygen: "घुलित ऑक्सीजन",
        min: "न्यूनतम", max: "अधिकतम", avg: "औसत", trend: "रुझान", rising: "बढ़ता", falling: "घटता",
        selectedLast: "चयनित · पिछले", rainfallCorrelation: "वर्षा संबंध",
        dailyAverages: "दैनिक औसत", complianceView: "अनुपालन दृश्य"
      },
      kn: {
        navDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", navPonds: "ಕೊಳಗಳು", navAlerts: "ಎಚ್ಚರಿಕೆಗಳು", navProfile: "ಪ್ರೊಫೈಲ್",
        liveReadings: "ಲೈವ್ ರೀಡಿಂಗ್‌ಗಳು", pageDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", lastUpdated: "ಕೊನೆಯ ನವೀಕರಣ",
        exportCSV: "CSV ರಫ್ತು", exportExcel: "ಎಕ್ಸೆಲ್ ರಫ್ತು", dailyReport: "ದಿನಸಿ ವರದಿ",
        logout: "ಲಾಗ್ ಔಟ್",
        loginTitle: "ಸೈನ್ ಇನ್", loginSub: "ನಿಮ್ಮ ಕೊಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ಲೈವ್ ನೀರಿನ ಗುಣಮಟ್ಟ ನವೀಕರಣಗಳನ್ನು ಪ್ರವೇಶಿಸಿ.",
        emailLabel: "ಇಮೇಲ್", passwordLabel: "ಪಾಸ್ವರ್ಡ್", signIn: "ಸೈನ್ ಇನ್",
        emailPlaceholder: "name@example.com", passwordPlaceholder: "ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ",
        demoHint: "ಮುಂದುವರಿಸಲು ನಿಮ್ಮ ಖಾತೆಯ ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್ವರ್ಡ್ ಬಳಸಿ.",
        loginError: "ಮಾನ್ಯ ಇಮೇಲ್ ಮತ್ತು ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ.",
        secondsRefresh: "ಸೆಕೆಂಡ್ ರಿಫ್ರೆಶ್", historicalTrends: "ಐತಿಹಾಸಿಕ ಪ್ರವೃತ್ತಿಗಳು", recentAlerts: "ಇತ್ತೀಚಿನ ಎಚ್ಚರಿಕೆಗಳು",
        predictionsTitle: "ಭವಿಷ್ಯವಾಣಿ", predictionsSub: "ಐತಿಹಾಸಿಕ ಸೆನ್ಸರ್ ಡೇಟಾ ಆಧರಿಸಿದ ಮುನ್ನೋಟ",
        predictionTargetLabel: "ಯಾವ ಮಾಪನ", predictionHorizonLabel: "ಭವಿಷ್ಯ ಬಿಂದುಗಳು", predictionHistoryLabel: "ಹಿಂದಿನ ಬಿಂದುಗಳು",
        alertsSub: "ಮಿತಿ ಮತ್ತು ಪ್ರವೃತ್ತಿ ಆಧಾರಿತ ಘಟನೆಗಳು", alertLog: "ಎಚ್ಚರಿಕೆ ಲಾಗ್", pondsTitle: "ಕೊಳಗಳು",
        pondsSub: "ಎಲ್ಲಾ ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿರುವ ಕೇಂದ್ರಗಳ ಪ್ರಜಾತಿ ಆಧಾರಿತ ಅವಲೋಕನ", addPond: "+ ಕೊಳ ಸೇರಿಸಿ",
        analytics: "ವಿಶ್ಲೇಷಣೆ", analyticsSub: "ದೈನಂದಿನ ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಮಳೆ ಸಂಬಂಧ",
        systemHealth: "ವ್ಯವಸ್ಥೆ ಆರೋಗ್ಯ", systemHealthSub: "ಸಾಧನ ಮತ್ತು ಸಂಪರ್ಕ ಸ್ಥಿತಿ",
        online: "ಆನ್‌ಲೈನ್", deviceStatus: "ಸಾಧನ ಸ್ಥಿತಿ", espConnected: "ESP32 ಸಂಪರ್ಕಗೊಂಡಿದೆ",
        lastPacket: "ಕೊನೆಯ ಪ್ಯಾಕೆಟ್", twoSecondsAgo: "2 ಸೆಕೆಂಡುಗಳ ಹಿಂದೆ", batteryLevel: "ಬ್ಯಾಟರಿ ಮಟ್ಟ",
        pondsPageSub: "ಎಲ್ಲಾ ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿರುವ ಕೊಳಗಳು ಮತ್ತು ಕೇಂದ್ರ ವಿವರಗಳ ಅವಲೋಕನ.",
        alertsPageSub: "ಎಲ್ಲಾ ಕೊಳಗಳಲ್ಲಿನ ಎಚ್ಚರಿಕೆ ಮತ್ತು ಗಂಭೀರ ಘಟನೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",
        profilePageSub: "ಮೀನುಗಾರರ ಪ್ರೊಫೈಲ್, ಆದ್ಯತೆಗಳು, ಭಾಷೆ ಮತ್ತು ವರದಿ ವ್ಯವಸ್ಥೆ.",
        preferredLanguage: "ಆದ್ಯತೆಯ ಭಾಷೆ", reportPreference: "ವರದಿ ಆದ್ಯತೆ",
        dailyPdfEmail: "ದೈನಂದಿನ PDF ಮತ್ತು ಇಮೇಲ್ ಎಚ್ಚರಿಕೆಗಳು", farmLocation: "ಫಾರ್ಮ್ ಸ್ಥಳ",
        profileSettings: "ಪ್ರೊಫೈಲ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು", profileSettingsSub: "ಭಾಷೆಯನ್ನು ಬದಲಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಮೇಲ್ವಿಚಾರಣಾ ಆದ್ಯತೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        activeStations: "ಸಕ್ರಿಯ ಕೇಂದ್ರಗಳು", alertMode: "ಎಚ್ಚರಿಕೆ ಮೋಡ್", smsEmailPush: "SMS, ಇಮೇಲ್ ಮತ್ತು ಪುಶ್ ಸೂಚನೆಗಳು",
        selectedSpecies: "ಆಯ್ಕೆ ಮಾಡಿದ ಜಾತಿಗಳು", totalPonds: "ಒಟ್ಟು ಕೊಳಗಳು", healthy: "ಆರೋಗ್ಯಕರ", warning: "ಎಚ್ಚರಿಕೆ",
        activeAlerts: "ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು", safe: "ಸುರಕ್ಷಿತ", critical: "ಗಂಭೀರ", station: "ಕೇಂದ್ರ",
        temperature: "ತಾಪಮಾನ", dissolvedOxygen: "ಕರಗಿದ ಆಮ್ಲಜನಕ",
        min: "ಕನಿಷ್ಠ", max: "ಗರಿಷ್ಠ", avg: "ಸರಾಸರಿ", trend: "ಪ್ರವೃತ್ತಿ", rising: "ಏರಿಕೆ", falling: "ಇಳಿಕೆ",
        selectedLast: "ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ · ಕೊನೆಯ", rainfallCorrelation: "ಮಳೆ ಸಂಬಂಧ",
        dailyAverages: "ದೈನಂದಿನ ಸರಾಸರಿ", complianceView: "ಅನುಸರಣೆ ನೋಟ"
      }
    };

    let currentLang = "en";
    let selectedSensor = 0;
    let selectedRange = "24h";
    let activeView = "dashboard";
    const AUTH_KEY = "qq_logged_in";
    const SIDEBAR_WIDTH_KEY = "qq_sidebar_width";
    const SIDEBAR_MIN = 300;
    const SIDEBAR_MAX = 430;
    const SIDEBAR_DEFAULT = 356;
    let trendChart;
    let predictionsChart;
    let sensorPollInterval;
    let gpsPollInterval;
    let cameraFramePollInterval;
    let hasLiveSensorData = false;
    let predictionsTarget = "temperature";
    let predictionHorizon = DEFAULT_PREDICTION_HORIZON;
    let predictionHistoryPreview = DEFAULT_PREDICTION_HISTORY_CONTEXT_POINTS;
    let predictionHistoryContext = [];
    let predictionsData = [];
    let predictionsMetaInfo = {
      history_points: 0,
      step_seconds: 0,
      generated_at: null,
      target: "temperature",
      horizon: DEFAULT_PREDICTION_HORIZON,
      anomaly_threshold: null,
      predicted_anomaly_count: 0,
      error: null
    };
    const predictionHorizonOptions = [12, 24, 36];
    const predictionHistoryOptions = [8, 16, 24, 32];
    let activeCameraPondName = "";

    const chartConfig = {
      "1h": { points: 12, stepMinutes: 5, variance: 0.04 },
      "24h": { points: 24, stepMinutes: 60, variance: 0.08 },
      "7d": { points: 7, stepMinutes: 1440, variance: 0.12 }
    };

    function t(key) {
      return (i18n[currentLang] && i18n[currentLang][key]) || i18n.en[key] || key;
    }

    function iconSVG(name) {
      const icons = {
        grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>',
        ponds: '<svg viewBox="0 0 24 24"><path d="M6 18c0-2.2 1.8-4 4-4"></path><path d="M18 18c0-3.3-2.7-6-6-6"></path><path d="M6 7h.01"></path><path d="M10 10c1.7 0 3-1.3 3-3"></path><path d="M18 7c0 2.8-2.2 5-5 5"></path><path d="M16 16c1.1 0 2-.9 2-2"></path></svg>',
        safe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m9 12 2 2 4-4"></path></svg>',
        warn: '<svg viewBox="0 0 24 24"><path d="M12 4 3 20h18L12 4Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
        pulse: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"></path></svg>',
        flask: '<svg viewBox="0 0 24 24"><path d="M10 3v4l-5 8a4 4 0 0 0 3.4 6h7.2A4 4 0 0 0 19 15l-5-8V3"></path><path d="M8 14h8"></path></svg>',
        droplets: '<svg viewBox="0 0 24 24"><path d="M7 14a5 5 0 1 0 10 0c0-3-5-9-5-9s-5 6-5 9Z"></path><path d="M10 14a2 2 0 0 0 4 0"></path></svg>',
        waves: '<svg viewBox="0 0 24 24"><path d="M3 8c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0 2.3.8 3.5 0 2.3-.8 3.5 0"></path><path d="M3 12c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0 2.3.8 3.5 0 2.3-.8 3.5 0"></path><path d="M3 16c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0 2.3.8 3.5 0 2.3-.8 3.5 0"></path></svg>',
        thermometer: '<svg viewBox="0 0 24 24"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"></path></svg>',
        dots: '<svg viewBox="0 0 24 24"><path d="M8 16c0-1.1.9-2 2-2"></path><path d="M12 19c0-1.1.9-2 2-2"></path><path d="M12 13c0-1.1.9-2 2-2"></path><path d="M8 10c0-1.1.9-2 2-2"></path><path d="M15 7c0-1.1.9-2 2-2"></path></svg>',
        camera: '<svg viewBox="0 0 24 24"><path d="M3 8h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z"></path><path d="m17 11 4-2v8l-4-2z"></path><path d="M8 12h.01"></path></svg>'
      };
      return icons[name] || icons.grid;
    }

    function getPredictionSensorByKey(key) {
      return sensors.find((sensor) => sensor.key === key) || sensors[0];
    }

    function getPredictionTargetLabel(key) {
      if (key === "temperature") return t("temperature");
      if (key === "do") return t("dissolvedOxygen");
      return getPredictionSensorByKey(key).name;
    }

    function populatePredictionTargetSelector() {
      const selector = document.getElementById("predictionTargetSelect");
      if (!selector) return;
      const options = sensors.map((sensor) => {
        const selected = sensor.key === predictionsTarget ? " selected" : "";
        return `<option value="${sensor.key}"${selected}>${getPredictionTargetLabel(sensor.key)}</option>`;
      }).join("");
      selector.innerHTML = options;
      selector.value = predictionsTarget;
    }

    function populatePredictionHorizonSelector() {
      const selector = document.getElementById("predictionHorizonSelect");
      if (!selector) return;
      selector.innerHTML = predictionHorizonOptions.map((value) => {
        const selected = value === predictionHorizon ? " selected" : "";
        return `<option value="${value}"${selected}>${value}</option>`;
      }).join("");
      selector.value = String(predictionHorizon);
    }

    function populatePredictionHistorySelector() {
      const selector = document.getElementById("predictionHistorySelect");
      if (!selector) return;
      selector.innerHTML = predictionHistoryOptions.map((value) => {
        const selected = value === predictionHistoryPreview ? " selected" : "";
        return `<option value="${value}"${selected}>${value}</option>`;
      }).join("");
      selector.value = String(predictionHistoryPreview);
    }

    function getStatus(sensor) {
      if (!Number.isFinite(sensor.value)) return "safe";
      const [safeMin, safeMax] = sensor.safeRange;
      const [absMin, absMax] = sensor.absoluteRange;
      if (sensor.value < absMin || sensor.value > absMax) return "critical";
      if (sensor.value < safeMin || sensor.value > safeMax) return "critical";

      const span = safeMax - safeMin;
      const warnBuffer = span * 0.15;
      if (sensor.value < safeMin + warnBuffer || sensor.value > safeMax - warnBuffer) return "warning";

      return "safe";
    }

    function statusLabel(status) {
      return status === "safe" ? t("safe") : status === "warning" ? t("warning") : t("critical");
    }

    function currentOverallStatus() {
      const statuses = sensors.map((sensor) => getStatus(sensor));
      return statuses.includes("critical")
        ? "critical"
        : statuses.includes("warning")
          ? "warning"
          : "safe";
    }

    function savePonds() {
      try {
        localStorage.setItem(PONDS_STORAGE_KEY, JSON.stringify(ponds));
      } catch {
        // Ignore storage write failures.
      }
    }

    async function getLatestGps() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/gps/latest`, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return null;
        const payload = await response.json();
        const gps = payload?.gps;
        if (!gps) return null;
        const lat = Number(gps.lat);
        const lng = Number(gps.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          created_at: gps.created_at || null
        };
      } catch {
        return null;
      }
    }

    async function fetchLatestCameraFrame() {
      const response = await fetch(`${API_BASE_URL}/api/camera/frame/latest`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const frame = payload?.frame;
      if (!frame?.data_base64) return null;
      return frame;
    }

    function setCameraModalOpen(isOpen) {
      const modal = document.getElementById("cameraModal");
      const image = document.getElementById("cameraStreamImage");
      if (!modal || !image) return;

      modal.classList.toggle("open", isOpen);
      modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
      document.body.classList.toggle("camera-modal-open", isOpen);
      if (!isOpen) {
        if (cameraFramePollInterval) {
          clearInterval(cameraFramePollInterval);
          cameraFramePollInterval = undefined;
        }
        image.src = "";
        activeCameraPondName = "";
      }
    }

    async function refreshCameraModalFrame() {
      const image = document.getElementById("cameraStreamImage");
      const meta = document.getElementById("cameraModalMeta");
      const fallback = document.getElementById("cameraStreamFallback");
      if (!image || !meta || !fallback) return;

      try {
        const frame = await fetchLatestCameraFrame();
        if (!frame) {
          meta.textContent = `${activeCameraPondName} · no frame available`;
          image.style.display = "none";
          fallback.style.display = "grid";
          return;
        }
        fallback.style.display = "none";
        image.style.display = "block";
        image.src = `data:image/jpeg;base64,${frame.data_base64}`;
        meta.textContent = `${activeCameraPondName} · last frame ${new Date(frame.created_at).toLocaleTimeString("en-GB")}`;
      } catch {
        meta.textContent = `${activeCameraPondName} · camera offline`;
        image.style.display = "none";
        fallback.style.display = "grid";
      }
    }

    function openCameraStream(pondName) {
      const image = document.getElementById("cameraStreamImage");
      const meta = document.getElementById("cameraModalMeta");
      const fallback = document.getElementById("cameraStreamFallback");
      if (!image || !meta || !fallback) return;

      activeCameraPondName = pondName || "Pond";
      meta.textContent = `${activeCameraPondName} · connecting...`;
      fallback.style.display = "none";
      image.style.display = "block";
      meta.textContent = `${activeCameraPondName} · connecting...`;
      setCameraModalOpen(true);
      refreshCameraModalFrame();
      if (cameraFramePollInterval) clearInterval(cameraFramePollInterval);
      cameraFramePollInterval = setInterval(refreshCameraModalFrame, CAMERA_FRAME_POLL_MS);
    }

    function formatSensorValue(sensor) {
      if (!Number.isFinite(sensor.value)) return "--";
      return sensor.decimals === 0 ? Math.round(sensor.value).toString() : sensor.value.toFixed(sensor.decimals);
    }

    function rangeMarker(sensor) {
      if (!Number.isFinite(sensor.value)) return 0;
      const [min, max] = sensor.absoluteRange;
      return Math.max(0, Math.min(100, ((sensor.value - min) / (max - min)) * 100));
    }

    function renderSummaries() {
      const healthy = ponds.filter((pond) => pond.status === "safe").length;
      const warning = ponds.filter((pond) => pond.status === "warning").length;
      const activeAlerts = alerts.length;

      const cards = [
        { label: t("totalPonds"), value: ponds.length, tone: "blue", icon: "ponds" },
        { label: t("healthy"), value: healthy, tone: "safe", icon: "safe" },
        { label: t("warning"), value: warning, tone: "warn", icon: "warn" },
        { label: t("activeAlerts"), value: activeAlerts, tone: "danger", icon: "pulse" }
      ];

      document.getElementById("summaryGrid").innerHTML = cards.map((card) => `
        <div class="summary-card">
          <div class="summary-icon ${card.tone}">${iconSVG(card.icon)}</div>
          <div>
            <div class="summary-label">${card.label}</div>
            <div class="summary-value ${card.tone}">${card.value}</div>
          </div>
        </div>
      `).join("");
    }

    function renderReadings() {
      const grid = document.getElementById("readingsGrid");

      grid.innerHTML = sensors.map((sensor, index) => {
        const status = getStatus(sensor);
        const safe = sensor.safeRange;
        const absolute = sensor.absoluteRange;

        return `
          <article class="reading-card ${status} ${index === selectedSensor ? 'active' : ''}" onclick="selectSensor(${index})">
            <div class="reading-top">
              <div class="reading-icon">${iconSVG(sensor.icon)}</div>
              <div class="status-pill ${status}">${statusLabel(status)}</div>
            </div>
            <div class="reading-name">${sensor.name}</div>

            <div class="reading-value">
              ${formatSensorValue(sensor)}
              ${sensor.unit ? `<span class="reading-unit">${sensor.unit}</span>` : ""}
            </div>

            <div class="range-wrap">
              <div class="range-track" style="--marker:${rangeMarker(sensor)}"></div>
              <div class="range-labels">
                <span>${absolute[0]}</span>
                <span>${safe[0]}-${safe[1]}</span>
                <span>${absolute[1]}</span>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    function getSensorByKey(key) {
      return sensors.find((sensor) => sensor.key === key);
    }

    function applySensorReading(reading) {
      if (!reading) return false;

      const mapping = {
        ph: "ph",
        do: "do",
        temperature: "temperature",
        turbidity: "turbidity",
        tds: "tds"
      };

      for (const [field, sensorKey] of Object.entries(mapping)) {
        const val = Number(reading[field]);
        if (!Number.isFinite(val)) return false;
        const sensor = getSensorByKey(sensorKey);
        if (!sensor) return false;
        sensor.value = sensor.decimals === 0 ? Math.round(val) : Number(val.toFixed(sensor.decimals));
      }

      const primaryPond = ponds[0];
      if (primaryPond) {
        const temp = getSensorByKey("temperature");
        const dissolvedOxygen = getSensorByKey("do");
        primaryPond.temp = `${temp.value.toFixed(1)} C`;
        primaryPond.do = `${dissolvedOxygen.value.toFixed(2)} mg/L`;

        const statuses = sensors.map((sensor) => getStatus(sensor));
        primaryPond.status = statuses.includes("critical")
          ? "critical"
          : statuses.includes("warning")
            ? "warning"
            : "safe";
        savePonds();
      }

      return true;
    }

    async function pollSensorData() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/readings/latest?sensor_only=1`, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!payload || !payload.reading) return;
        if (applySensorReading(payload.reading)) {
          hasLiveSensorData = true;
          renderSummaries();
          renderReadings();
          renderPonds();
          renderAlerts();
          renderInsights();
          updateTrendChart();
          updateClock();
          pollPredictionsData();
        }
      } catch {
        // Keep mock data when backend/sensor data is unavailable.
      }
    }

    async function pollGpsData() {
      const primaryPond = ponds[0];
      if (!primaryPond) return;

      const latestGps = await getLatestGps();
      if (!latestGps) return;

      const latChanged = !Number.isFinite(primaryPond.lat) || Math.abs(primaryPond.lat - latestGps.lat) > 0.000001;
      const lngChanged = !Number.isFinite(primaryPond.lng) || Math.abs(primaryPond.lng - latestGps.lng) > 0.000001;
      const timestampChanged = primaryPond.gps_timestamp !== latestGps.created_at;
      if (!latChanged && !lngChanged && !timestampChanged) return;

      primaryPond.lat = latestGps.lat;
      primaryPond.lng = latestGps.lng;
      primaryPond.gps_timestamp = latestGps.created_at ?? null;
      savePonds();
      renderPonds();
    }

    function renderPonds() {
      const pondsGrid = document.getElementById("pondsGrid");
      if (!pondsGrid) return;

      if (!ponds.length) {
        const emptyMarkup = `<div class="section-sub">No ponds added yet. Use ${t("addPond")} to create one.</div>`;
        pondsGrid.innerHTML = emptyMarkup;
        const emptyPage = document.getElementById("pondsGridPage");
        if (emptyPage) emptyPage.innerHTML = emptyMarkup;
        updateProfileStats();
        return;
      }

      function gpsLocationMarkup(pond) {
        if (!Number.isFinite(pond.lat) || !Number.isFinite(pond.lng)) {
          return `
            <div class="gps-reading">--</div>
            <div class="gps-actions">
              <button class="camera-icon-btn" type="button" onclick="openPondCamera('${String(pond.name).replace(/'/g, "\\'")}')" aria-label="Open live camera" title="Open live camera">
                ${iconSVG("camera")}
              </button>
            </div>
          `;
        }
        const lat = Number(pond.lat.toFixed(6));
        const lng = Number(pond.lng.toFixed(6));
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        return `
          <div class="gps-reading">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
          <div class="gps-actions">
            <button class="camera-icon-btn" type="button" onclick="openPondCamera('${String(pond.name).replace(/'/g, "\\'")}')" aria-label="Open live camera" title="Open live camera">
              ${iconSVG("camera")}
            </button>
            <a class="gps-icon-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open Pond location in Google Maps" title="Open Pond location in Google Maps">
              <span class="gps-pin" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"></path>
                  <circle cx="12" cy="10" r="2.5"></circle>
                </svg>
              </span>
            </a>
          </div>
        `;
      }

      pondsGrid.innerHTML = ponds.map((pond, index) => `
        <article class="pond-card">
          <div class="pond-top">
            <div>
              <div class="pond-species">${pond.species}</div>
              <div class="pond-name">${pond.name}</div>
            </div>
            <div class="pond-top-actions">
              <div class="status-pill ${pond.status}">${statusLabel(pond.status)}</div>
              <button
                class="pond-delete-btn"
                type="button"
                title="Delete pond"
                aria-label="Delete pond"
                onclick="deletePond(${index})"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18"></path>
                  <path d="M8 6V4h8v2"></path>
                  <path d="M6 6l1 14h10l1-14"></path>
                  <path d="M10 10v7"></path>
                  <path d="M14 10v7"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="pond-meta">
            <div class="pond-metric">
              <div class="k">${t("station")}</div>
              <div class="v">${pond.station}</div>
            </div>
            <div class="pond-metric">
              <div class="k">${t("temperature")}</div>
              <div class="v">${pond.temp}</div>
            </div>
            <div class="pond-metric">
              <div class="k">${t("dissolvedOxygen")}</div>
              <div class="v">${pond.do}</div>
            </div>
            <div class="pond-metric">
              <div class="k">GPS</div>
              <div class="v gps-value">${gpsLocationMarkup(pond)}</div>
            </div>
          </div>
        </article>
      `).join("");

      const pondsPage = document.getElementById("pondsGridPage");
      if (pondsPage) pondsPage.innerHTML = pondsGrid.innerHTML;
      updateProfileStats();
    }

    function renderInsights() {
      const insightsList = document.getElementById("insightsList");
      if (!insightsList) return;
      insightsList.innerHTML = insights.map((item) => `
        <div class="insight-item">
          <div class="insight-badge">i</div>
          <div>
            <div class="insight-title">${item.title[currentLang]}</div>
            <div class="insight-copy">${item.copy[currentLang]}</div>
          </div>
          <div></div>
        </div>
      `).join("");
    }

    function makeLabels(rangeKey) {
      const cfg = chartConfig[rangeKey];
      return Array.from({ length: cfg.points }, (_, i) => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - (cfg.points - 1 - i) * cfg.stepMinutes);
        if (rangeKey === "7d") {
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      });
    }

    function makeSeries(sensor, rangeKey) {
      if (!Number.isFinite(sensor.value)) return [];
      const cfg = chartConfig[rangeKey];
      const values = [];
      let current = sensor.value;

      for (let i = 0; i < cfg.points; i++) {
        values.push(Number(current.toFixed(sensor.decimals === 0 ? 0 : 2)));
      }

      return values;
    }

    function chartColor(status) {
      if (status === "safe") return { line: "#4d8465", fill: "rgba(77,132,101,0.12)" };
      if (status === "warning") return { line: "#b17a2b", fill: "rgba(177,122,43,0.12)" };
      return { line: "#cc553c", fill: "rgba(204,85,60,0.12)" };
    }

    function updateTrendChart() {
      const sensor = sensors[selectedSensor];
      if (!Number.isFinite(sensor.value)) {
        document.getElementById("trendSubtitle").textContent = "No data available";
        document.getElementById("statMin").textContent = "--";
        document.getElementById("statMax").textContent = "--";
        document.getElementById("statAvg").textContent = "--";
        document.getElementById("statTrend").textContent = "--";
        const primaryPond = ponds[0];
        document.getElementById("liveReadingMeta").textContent = primaryPond
          ? `${primaryPond.name} · ${primaryPond.station}`
          : "No pond selected";

        if (trendChart) {
          trendChart.data.labels = [];
          trendChart.data.datasets[0].data = [];
          trendChart.update();
        }
        return;
      }

      const status = getStatus(sensor);
      const labels = makeLabels(selectedRange);
      const series = makeSeries(sensor, selectedRange);
      const colors = chartColor(status);
      const min = Math.min(...series);
      const max = Math.max(...series);
      const avg = series.reduce((sum, val) => sum + val, 0) / series.length;
      const trend = series[series.length - 1] > series[0] ? t("rising") : t("falling");

      document.getElementById("trendSubtitle").textContent = `${sensor.name} ${t("selectedLast")} ${selectedRange}`;
      const primaryPond = ponds[0];
      document.getElementById("liveReadingMeta").textContent = primaryPond
        ? `${primaryPond.name} · ${primaryPond.station}`
        : "No pond added yet";
      document.getElementById("statMin").previousSibling.textContent = `${t("min")}: `;
      document.getElementById("statMax").previousSibling.textContent = `${t("max")}: `;
      document.getElementById("statAvg").previousSibling.textContent = `${t("avg")}: `;
      document.getElementById("statTrend").previousSibling.textContent = `${t("trend")}: `;
      document.getElementById("statMin").textContent = min.toFixed(sensor.decimals === 0 ? 0 : 1);
      document.getElementById("statMax").textContent = max.toFixed(sensor.decimals === 0 ? 0 : 1);
      document.getElementById("statAvg").textContent = avg.toFixed(sensor.decimals === 0 ? 0 : 1);
      document.getElementById("statTrend").textContent = trend;

      if (!trendChart) {
        trendChart = new Chart(document.getElementById("trendChart"), {
          type: "line",
          data: {
            labels,
            datasets: [{
              data: series,
              borderColor: colors.line,
              backgroundColor: colors.fill,
              fill: true,
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0.38
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: "#74817b",
                  font: { size: 11 },
                  maxTicksLimit: selectedRange === "24h" ? 8 : 6
                }
              },
              y: {
                grid: { color: "rgba(221,216,207,0.7)" },
                ticks: {
                  color: "#74817b",
                  font: { size: 11 }
                }
              }
            }
          }
        });
      } else {
        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = series;
        trendChart.data.datasets[0].borderColor = colors.line;
        trendChart.data.datasets[0].backgroundColor = colors.fill;
        trendChart.update();
      }
    }

    function setPredictionStat(id, value, unit, decimals = 2) {
      const node = document.getElementById(id);
      if (!node) return;
      if (!Number.isFinite(value)) {
        node.textContent = "--";
        return;
      }
      node.textContent = `${Number(value).toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
    }

    function updatePredictionStats() {
      const metric = getPredictionSensorByKey(predictionsTarget);
      const series = predictionsData
        .map((point) => Number(point[predictionsTarget]))
        .filter((value) => Number.isFinite(value));
      const last = series[series.length - 1];
      const min = series.length ? Math.min(...series) : NaN;
      const max = series.length ? Math.max(...series) : NaN;
      const avg = series.length ? series.reduce((sum, value) => sum + value, 0) / series.length : NaN;
      const anomalyCount = Number(predictionsMetaInfo.predicted_anomaly_count) || 0;

      setPredictionStat("predStatSelected", last, metric.unit, metric.decimals ?? 2);
      setPredictionStat("predStatMin", min, metric.unit, metric.decimals ?? 2);
      setPredictionStat("predStatMax", max, metric.unit, metric.decimals ?? 2);
      setPredictionStat("predStatAvg", avg, metric.unit, metric.decimals ?? 2);
      const anomalyNode = document.getElementById("predStatAnomalies");
      if (anomalyNode) anomalyNode.textContent = `${anomalyCount}/${series.length || 0}`;
    }

    function updatePredictionsChart() {
      const metaNode = document.getElementById("predictionsMeta");
      if (!metaNode) return;
      const metric = getPredictionSensorByKey(predictionsTarget);
      const metricLabel = getPredictionTargetLabel(predictionsTarget);

      if (!predictionsData.length) {
        metaNode.textContent = predictionsMetaInfo.error || "Waiting for enough history to generate predictions";
        updatePredictionStats();
        if (predictionsChart) {
          predictionsChart.data.labels = [];
          predictionsChart.data.datasets[0].data = [];
          predictionsChart.data.datasets[1].data = [];
          predictionsChart.data.datasets[2].data = [];
          predictionsChart.update();
        }
        return;
      }

      const historyLabels = predictionHistoryContext.map((point) => {
        const dt = new Date(point.created_at || point.timestamp);
        if (Number.isNaN(dt.getTime())) return "--:--";
        return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      });
      const predictionLabels = predictionsData.map((point) => {
        const dt = new Date(point.timestamp);
        if (Number.isNaN(dt.getTime())) return "--:--";
        return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      });
      const labels = [...historyLabels, ...predictionLabels];
      const historyValues = predictionHistoryContext.map((point) => Number(point[predictionsTarget]));
      const predictionValues = predictionsData.map((point) => Number(point[predictionsTarget]));
      const historicalLine = [...historyValues, ...new Array(predictionValues.length).fill(null)];
      const forecastLine = [...new Array(historyValues.length).fill(null), ...predictionValues];
      const anomalyPoints = [
        ...new Array(historyValues.length).fill(null),
        ...predictionsData.map((point) => {
        if (!point.is_anomaly) return null;
        const value = Number(point[predictionsTarget]);
        return Number.isFinite(value) ? value : null;
        }),
      ];

      const historyCount = predictionsMetaInfo.history_points || 0;
      const stepSeconds = predictionsMetaInfo.step_seconds || 0;
      const threshold = Number.isFinite(Number(predictionsMetaInfo.anomaly_threshold))
        ? Number(predictionsMetaInfo.anomaly_threshold).toFixed(2)
        : "--";
      metaNode.textContent = `${metricLabel} forecast • next ${predictionHorizon} points • ${historyCount} history points used • ${historyValues.length} shown • ${stepSeconds}s step • anomaly z>${threshold}`;

      updatePredictionStats();

      if (!predictionsChart) {
        predictionsChart = new Chart(document.getElementById("predictionsChart"), {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: `Predicted ${metricLabel}`,
                data: forecastLine,
                borderColor: "#2f7f90",
                backgroundColor: "rgba(47,127,144,0.14)",
                fill: true,
                borderWidth: 2.2,
                pointRadius: 2,
                pointHoverRadius: 4,
                tension: 0.32
              },
              {
                label: `Recent ${metricLabel}`,
                data: historicalLine,
                borderColor: "#8a9892",
                backgroundColor: "transparent",
                borderDash: [6, 4],
                fill: false,
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 3,
                tension: 0.2
              },
              {
                label: "Anomaly",
                data: anomalyPoints,
                borderColor: "#c24a54",
                backgroundColor: "#c24a54",
                showLine: false,
                pointRadius: 4,
                pointHoverRadius: 5
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: "#74817b", font: { size: 11 }, maxTicksLimit: 8 }
              },
              y: {
                grid: { color: "rgba(221,216,207,0.7)" },
                ticks: { color: "#74817b", font: { size: 11 } }
              }
            }
          }
        });
      } else {
        predictionsChart.data.labels = labels;
        predictionsChart.data.datasets[0].label = `Predicted ${metricLabel}`;
        predictionsChart.data.datasets[0].data = forecastLine;
        predictionsChart.data.datasets[1].label = `Recent ${metricLabel}`;
        predictionsChart.data.datasets[1].data = historicalLine;
        predictionsChart.data.datasets[2].data = anomalyPoints;
        predictionsChart.update();
      }
    }

    async function pollPredictionsData() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/predictions?horizon=${predictionHorizon}&limit_history=all&history_preview=${predictionHistoryPreview}&source=sensor&target=${encodeURIComponent(predictionsTarget)}`,
          {
          method: "GET",
          headers: { Accept: "application/json" }
          }
        );
        const payload = await response.json();
        if (!response.ok) {
          predictionHistoryContext = [];
          predictionsData = [];
          predictionsMetaInfo = {
            history_points: 0,
            step_seconds: 0,
            generated_at: null,
            target: predictionsTarget,
            horizon: predictionHorizon,
            anomaly_threshold: null,
            predicted_anomaly_count: 0,
            error: payload?.error || "Prediction API unavailable"
          };
          updatePredictionsChart();
          return;
        }
        predictionHistoryContext = Array.isArray(payload?.history_context) ? payload.history_context : [];
        predictionsData = Array.isArray(payload?.predictions) ? payload.predictions : [];
        predictionsMetaInfo = {
          history_points: Number(payload?.history_points) || 0,
          step_seconds: Number(payload?.step_seconds) || 0,
          generated_at: payload?.generated_at || null,
          target: payload?.target || predictionsTarget,
          horizon: Number(payload?.horizon) || predictionHorizon,
          anomaly_threshold: Number(payload?.anomaly_threshold),
          predicted_anomaly_count: Number(payload?.predicted_anomaly_count) || 0,
          error: null
        };
        updatePredictionsChart();
      } catch {
        predictionHistoryContext = [];
        predictionsData = [];
        predictionsMetaInfo = {
          history_points: 0,
          step_seconds: 0,
          generated_at: null,
          target: predictionsTarget,
          horizon: predictionHorizon,
          anomaly_threshold: null,
          predicted_anomaly_count: 0,
          error: "Prediction service not reachable"
        };
        updatePredictionsChart();
      }
    }

    function selectSensor(index) {
      selectedSensor = index;
      renderReadings();
      updateTrendChart();
    }

    function setRange(range) {
      selectedRange = range;
      document.querySelectorAll(".range-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.range === range);
      });
      updateTrendChart();
    }

    function updateClock() {
      const now = new Date();
      document.getElementById("lastUpdated").textContent = now.toLocaleTimeString("en-GB");
    }

    function renderAlerts() {
      if (!alerts.length) {
        const empty = `<div class="section-sub">No alerts yet.</div>`;
        document.getElementById("alertsList").innerHTML = empty;
        const alertsPage = document.getElementById("alertsListPage");
        if (alertsPage) alertsPage.innerHTML = empty;
        return;
      }

      const markup = alerts.map((alert) => `
        <div class="alert-item">
          <div class="alert-badge ${alert.level}">${alert.level === 'safe' ? 'OK' : alert.level === 'warning' ? '!' : '!!'}</div>
          <div>
            <div class="alert-title">${alert.title[currentLang]}</div>
            <div class="alert-copy">${alert.copy[currentLang]}</div>
          </div>
          <div class="alert-time">${alert.time}</div>
        </div>
      `).join("");
      document.getElementById("alertsList").innerHTML = markup;
      const alertsPage = document.getElementById("alertsListPage");
      if (alertsPage) alertsPage.innerHTML = markup;
    }

    function applyTranslations() {
      document.documentElement.lang = currentLang;
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = t(node.dataset.i18n);
      });
      document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
        node.placeholder = t(node.dataset.i18nPlaceholder);
      });
      document.getElementById("languageSelect").value = currentLang;
      document.getElementById("authLanguageSelect").value = currentLang;
      document.getElementById("profileLanguage").textContent = document.getElementById("languageSelect").selectedOptions[0].textContent;
      const errorBox = document.getElementById("loginError");
      if (errorBox.textContent) errorBox.textContent = t("loginError");
      populatePredictionTargetSelector();
      populatePredictionHorizonSelector();
      populatePredictionHistorySelector();
    }

    function switchView(view) {
      activeView = view;
      document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.view === view);
      });
      document.querySelectorAll(".view").forEach((section) => {
        section.classList.toggle("active", section.id === `view-${view}`);
      });
    }

    function clampSidebarWidth(width) {
      return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(width)));
    }

    function applySidebarWidth(width) {
      document.documentElement.style.setProperty("--sidebar", `${clampSidebarWidth(width)}px`);
    }

    function isMobileViewport() {
      return window.matchMedia("(max-width: 1120px)").matches;
    }

    function openMobileSidebar() {
      document.body.classList.add("mobile-sidebar-open");
      const menuBtn = document.getElementById("mobileMenuBtn");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    }

    function closeMobileSidebar() {
      document.body.classList.remove("mobile-sidebar-open");
      const menuBtn = document.getElementById("mobileMenuBtn");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    }

    function toggleMobileSidebar() {
      if (!isMobileViewport()) return;
      if (document.body.classList.contains("mobile-sidebar-open")) closeMobileSidebar();
      else openMobileSidebar();
    }

    function simulateLiveData() {
      if (hasLiveSensorData) return;
      sensors.forEach((sensor) => {
        const direction = sensor.key === "do" ? -1 : 1;
        const span = (sensor.absoluteRange[1] - sensor.absoluteRange[0]) * 0.012;
        sensor.value += (Math.random() - 0.52 + direction * 0.015) * span;
        if (sensor.key === "ph") sensor.value = Math.max(4.2, Math.min(9.4, sensor.value));
        if (sensor.key === "do") sensor.value = Math.max(0.4, Math.min(11, sensor.value));
        if (sensor.key === "turbidity") sensor.value = Math.max(4, Math.min(260, sensor.value));
        if (sensor.key === "temperature") sensor.value = Math.max(19, Math.min(39, sensor.value));
        if (sensor.key === "tds") sensor.value = Math.max(140, Math.min(3400, sensor.value));

        if (sensor.decimals === 0) sensor.value = Math.round(sensor.value);
        else sensor.value = Number(sensor.value.toFixed(sensor.decimals));
      });

      renderReadings();
      renderSummaries();
      updateTrendChart();
      updateClock();
    }

    function downloadCSV() {
      const rows = [
        ["Sensor", "Value", "Unit", "Status"],
        ...sensors.map((sensor) => [sensor.name, formatSensorValue(sensor), sensor.unit || "-", statusLabel(getStatus(sensor))])
      ];
      const csv = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quantumquad_dashboard_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    function downloadExcel() {
      downloadCSV();
    }

    function generateReport() {
      const messages = {
        en: "Daily report generated.",
        ta: "தினசரி அறிக்கை உருவாக்கப்பட்டது.",
        hi: "दैनिक रिपोर्ट तैयार हो गई।",
        kn: "ದಿನಸಿ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ."
      };
      alert(messages[currentLang]);
    }

    async function addPond() {
      const nameInput = prompt("Pond name");
      if (nameInput === null) return;
      const name = nameInput.trim();
      if (!name) {
        alert("Pond name is required.");
        return;
      }

      const speciesInput = prompt("Species", "General");
      if (speciesInput === null) return;
      const species = speciesInput.trim() || "General";

      const stationInput = prompt("Station ID");
      if (stationInput === null) return;
      const station = stationInput.trim();
      if (!station) {
        alert("Station ID is required.");
        return;
      }

      const temp = getSensorByKey("temperature");
      const dissolvedOxygen = getSensorByKey("do");
      const latestGps = await getLatestGps();

      ponds.push({
        species,
        name,
        station,
        status: currentOverallStatus(),
        temp: Number.isFinite(temp?.value) ? `${temp.value.toFixed(1)} C` : "--",
        do: Number.isFinite(dissolvedOxygen?.value) ? `${dissolvedOxygen.value.toFixed(2)} mg/L` : "--",
        lat: latestGps?.lat ?? null,
        lng: latestGps?.lng ?? null,
        gps_timestamp: latestGps?.created_at ?? null
      });
      savePonds();
      renderSummaries();
      renderPonds();
      updateTrendChart();
    }

    function deletePond(index) {
      if (!Number.isInteger(index) || index < 0 || index >= ponds.length) return;
      const pondName = ponds[index]?.name || "this pond";
      if (!confirm(`Delete ${pondName}?`)) return;

      ponds.splice(index, 1);
      savePonds();
      renderSummaries();
      renderPonds();
      updateTrendChart();
    }

    function updateUserProfile(email) {
      const username = email.split("@")[0] || "";
      const displayName = username
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      const finalName = displayName || "-";
      const finalEmail = email || "-";
      document.getElementById("topProfileName").textContent = finalName;
      document.getElementById("topProfileEmail").textContent = finalEmail;
      document.getElementById("profilePageName").textContent = finalName;
      document.getElementById("profilePageEmail").textContent = finalEmail;
      const avatarValue = finalName === "-" ? "-" : finalName.charAt(0).toUpperCase();
      document.querySelectorAll(".avatar").forEach((node) => {
        node.textContent = avatarValue;
      });
    }

    function updateProfileStats() {
      const stationEl = document.getElementById("profileActiveStations");
      if (stationEl) stationEl.textContent = String(ponds.length);
      const speciesEl = document.getElementById("profileSelectedSpecies");
      if (speciesEl) {
        const uniqueSpecies = [...new Set(ponds.map((pond) => String(pond.species || "").trim()).filter(Boolean))];
        speciesEl.textContent = uniqueSpecies.length ? uniqueSpecies.join(", ") : "-";
      }
    }

    function showLogin() {
      document.getElementById("authShell").style.display = "grid";
      document.getElementById("appShell").style.display = "none";
    }

    function showApp() {
      document.getElementById("authShell").style.display = "none";
      document.getElementById("appShell").style.display = "block";
    }

    function handleLogin(event) {
      event.preventDefault();
      const emailInput = document.getElementById("loginEmail");
      const passwordInput = document.getElementById("loginPassword");
      const errorBox = document.getElementById("loginError");
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email.includes("@") || password.length < 4) {
        errorBox.textContent = t("loginError");
        return;
      }
      errorBox.textContent = "";
      localStorage.setItem(AUTH_KEY, "1");
      localStorage.setItem("qq_user_email", email);
      updateUserProfile(email);
      showApp();
    }

    function logout() {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("qq_user_email");
      document.getElementById("loginForm").reset();
      document.getElementById("loginError").textContent = "";
      showLogin();
    }

    document.querySelectorAll(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => setRange(btn.dataset.range));
    });

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchView(btn.dataset.view);
        if (isMobileViewport()) closeMobileSidebar();
      });
    });

    const savedSidebar = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    applySidebarWidth(Number.isFinite(savedSidebar) ? savedSidebar : SIDEBAR_DEFAULT);

    const sidebar = document.getElementById("mobileSidebar");
    const sidebarResizer = document.getElementById("sidebarResizer");
    let sidebarDragging = false;
    let dragStartX = 0;
    let dragStartWidth = SIDEBAR_DEFAULT;

    const onSidebarDragStart = (event) => {
      if (isMobileViewport() || !sidebar) return;
      sidebarDragging = true;
      dragStartX = event.clientX;
      dragStartWidth = sidebar.getBoundingClientRect().width;
      document.body.classList.add("sidebar-resizing");
    };

    const onSidebarDragMove = (event) => {
      if (!sidebarDragging) return;
      const nextWidth = dragStartWidth + (event.clientX - dragStartX);
      applySidebarWidth(nextWidth);
    };

    const onSidebarDragEnd = () => {
      if (!sidebarDragging) return;
      sidebarDragging = false;
      document.body.classList.remove("sidebar-resizing");
      const applied = getComputedStyle(document.documentElement).getPropertyValue("--sidebar");
      const width = Number.parseInt(applied, 10);
      if (Number.isFinite(width)) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(width)));
    };

    const resetSidebarWidth = () => {
      if (isMobileViewport()) return;
      applySidebarWidth(SIDEBAR_DEFAULT);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(SIDEBAR_DEFAULT));
    };

    if (sidebarResizer) {
      sidebarResizer.addEventListener("pointerdown", onSidebarDragStart);
      sidebarResizer.addEventListener("dblclick", resetSidebarWidth);
    }
    window.addEventListener("pointermove", onSidebarDragMove);
    window.addEventListener("pointerup", onSidebarDragEnd);

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileOverlay = document.getElementById("mobileOverlay");
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", toggleMobileSidebar);
    }
    if (mobileOverlay) {
      mobileOverlay.addEventListener("click", closeMobileSidebar);
    }
    const onEscape = (event) => {
      if (event.key === "Escape") {
        closeMobileSidebar();
        setCameraModalOpen(false);
      }
    };
    const onResize = () => {
      if (!isMobileViewport()) closeMobileSidebar();
      if (isMobileViewport()) {
        document.body.classList.remove("sidebar-resizing");
      }
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);

    document.getElementById("languageSelect").addEventListener("change", (event) => {
      currentLang = event.target.value;
      applyTranslations();
      renderSummaries();
      renderReadings();
      renderAlerts();
      renderPonds();
      renderInsights();
      updateTrendChart();
      updatePredictionsChart();
    });
    document.getElementById("authLanguageSelect").addEventListener("change", (event) => {
      currentLang = event.target.value;
      applyTranslations();
      renderSummaries();
      renderReadings();
      renderAlerts();
      renderPonds();
      renderInsights();
      updateTrendChart();
      updatePredictionsChart();
    });
    const predictionTargetSelect = document.getElementById("predictionTargetSelect");
    if (predictionTargetSelect) {
      predictionTargetSelect.addEventListener("change", (event) => {
        predictionsTarget = event.target.value || "temperature";
        pollPredictionsData();
      });
    }
    const predictionHorizonSelect = document.getElementById("predictionHorizonSelect");
    if (predictionHorizonSelect) {
      predictionHorizonSelect.addEventListener("change", (event) => {
        predictionHorizon = Number(event.target.value) || DEFAULT_PREDICTION_HORIZON;
        pollPredictionsData();
      });
    }
    const predictionHistorySelect = document.getElementById("predictionHistorySelect");
    if (predictionHistorySelect) {
      predictionHistorySelect.addEventListener("change", (event) => {
        predictionHistoryPreview = Number(event.target.value) || DEFAULT_PREDICTION_HISTORY_CONTEXT_POINTS;
        pollPredictionsData();
      });
    }
    window.downloadCSV = downloadCSV;
    window.downloadExcel = downloadExcel;
    window.generateReport = generateReport;
    window.addPond = addPond;
    window.deletePond = deletePond;
    window.openPondCamera = openCameraStream;

    const cameraModalClose = document.getElementById("cameraModalClose");
    const cameraModalBackdrop = document.getElementById("cameraModalBackdrop");
    const closeCameraModal = () => setCameraModalOpen(false);
    if (cameraModalClose) cameraModalClose.addEventListener("click", closeCameraModal);
    if (cameraModalBackdrop) cameraModalBackdrop.addEventListener("click", closeCameraModal);

    document.getElementById("loginForm").addEventListener("submit", handleLogin);
    document.getElementById("logoutBtn").addEventListener("click", logout);

    applyTranslations();
    const refreshRateEl = document.getElementById("refreshRate");
    if (refreshRateEl) refreshRateEl.textContent = String(DASHBOARD_REFRESH_SECONDS);
    const savedEmail = localStorage.getItem("qq_user_email");
    if (savedEmail) updateUserProfile(savedEmail);
    renderSummaries();
    renderReadings();
    renderAlerts();
    renderPonds();
    renderInsights();
    updateTrendChart();
    updatePredictionsChart();
    updateClock();
    switchView("dashboard");
    pollSensorData();
    pollPredictionsData();
    sensorPollInterval = setInterval(() => {
      pollSensorData();
      pollPredictionsData();
    }, SENSOR_POLL_MS);
    pollGpsData();
    sensorPollInterval = setInterval(pollSensorData, SENSOR_POLL_MS);
    gpsPollInterval = setInterval(pollGpsData, GPS_POLL_MS);
    if (localStorage.getItem(AUTH_KEY) === "1") showApp();
    else showLogin();
    return () => {
      if (sensorPollInterval) clearInterval(sensorPollInterval);
      if (gpsPollInterval) clearInterval(gpsPollInterval);
      if (cameraFramePollInterval) clearInterval(cameraFramePollInterval);
      closeMobileSidebar();
      setCameraModalOpen(false);
      if (sidebarResizer) {
        sidebarResizer.removeEventListener("pointerdown", onSidebarDragStart);
        sidebarResizer.removeEventListener("dblclick", resetSidebarWidth);
      }
      window.removeEventListener("pointermove", onSidebarDragMove);
      window.removeEventListener("pointerup", onSidebarDragEnd);
      document.body.classList.remove("sidebar-resizing");
      if (mobileMenuBtn) mobileMenuBtn.removeEventListener("click", toggleMobileSidebar);
      if (mobileOverlay) mobileOverlay.removeEventListener("click", closeMobileSidebar);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onResize);
      if (trendChart) trendChart.destroy();
      if (predictionsChart) predictionsChart.destroy();
      delete window.downloadCSV;
      delete window.downloadExcel;
      delete window.generateReport;
      delete window.addPond;
      delete window.deletePond;
      delete window.openPondCamera;
      if (cameraModalClose) cameraModalClose.removeEventListener("click", closeCameraModal);
      if (cameraModalBackdrop) cameraModalBackdrop.removeEventListener("click", closeCameraModal);
    };
}
