import Chart from "chart.js/auto";

export function initDashboard() {
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:9999").replace(/\/$/, "");
    const SENSOR_POLL_MS = 10000;
    const DASHBOARD_REFRESH_SECONDS = Math.round(SENSOR_POLL_MS / 1000);
    const ponds = [
      {
        species: "Tilapia",
        name: "Pond Alpha",
        station: "QQ-dbafa5-A",
        status: "critical",
        wqi: 48,
        temp: "37.3 C",
        do: "1.48 mg/L"
      },
      {
        species: "Rohu",
        name: "Pond Beta",
        station: "QQ-rohu-22",
        status: "safe",
        wqi: 85,
        temp: "28.1 C",
        do: "6.92 mg/L"
      },
      {
        species: "Catla",
        name: "Pond Gamma",
        station: "QQ-cat-11",
        status: "warning",
        wqi: 68,
        temp: "31.0 C",
        do: "4.71 mg/L"
      }
    ];

    const sensors = [
      {
        key: "ph",
        name: "pH",
        shortName: "pH",
        unit: "",
        value: 5.8,
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
        value: 1.48,
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
        value: 205,
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
        value: 37.31,
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
        value: 3077,
        safeRange: [0, 1000],
        absoluteRange: [0, 2000],
        decimals: 0,
        icon: "dots",
        seriesBase: 2150
      }
    ];

    const alerts = [
      {
        level: "critical",
        title: { en: "DO crashed below safe threshold", ta: "DO பாதுகாப்பு வரம்புக்கு கீழே சரிந்தது", hi: "DO सुरक्षित सीमा से नीचे गिर गया", kn: "DO ಸುರಕ್ಷಿತ ಮಿತಿಗಿಂತ ಕೆಳಗೆ ಕುಸಿದಿದೆ" },
        copy: { en: "Pond Alpha dropped to 1.48 mg/L during the latest cycle. Fish stress risk is high.", ta: "சமீபத்திய சுழற்சியில் பாண்ட் ஆல்பா 1.48 mg/L வரை குறைந்தது. மீன்களுக்கு அழுத்த ஆபத்து அதிகம்.", hi: "हालिया चक्र में पॉन्ड अल्फा 1.48 mg/L तक गिर गया। मछलियों पर तनाव का जोखिम अधिक है।", kn: "ಇತ್ತೀಚಿನ ಚಕ್ರದಲ್ಲಿ ಪಾಂಡ್ ಆಲ್ಫಾ 1.48 mg/L ಗೆ ಕುಸಿದಿದೆ. ಮೀನು ಒತ್ತಡದ ಅಪಾಯ ಹೆಚ್ಚು." },
        time: "2 min ago"
      },
      {
        level: "critical",
        title: { en: "Temperature exceeded safe band", ta: "வெப்பநிலை பாதுகாப்பு வரம்பை மீறியது", hi: "तापमान सुरक्षित सीमा से ऊपर गया", kn: "ತಾಪಮಾನ ಸುರಕ್ಷಿತ ಮಿತಿಯನ್ನು ಮೀರಿದೆ" },
        copy: { en: "Water temperature rose beyond 30 C and is now outside the ideal species range.", ta: "நீர் வெப்பநிலை 30 C ஐ கடந்துள்ளது; இது இனத்திற்கான சிறந்த வரம்பை மீறியுள்ளது.", hi: "पानी का तापमान 30 C से ऊपर चला गया है और अब आदर्श प्रजाति सीमा से बाहर है।", kn: "ನೀರಿನ ತಾಪಮಾನ 30 C ಗಿಂತ ಮೇಲೇರಿದ್ದು ಈಗ ಆದರ್ಶ ಜಾತಿ ಮಿತಿಯಿಂದ ಹೊರಗಿದೆ." },
        time: "5 min ago"
      },
      {
        level: "warning",
        title: { en: "Turbidity spike after rainfall", ta: "மழைக்குப் பின் குழப்பம் அதிகரிப்பு", hi: "बारिश के बाद टर्बिडिटी बढ़ी", kn: "ಮಳೆಯ ನಂತರ ಮಂಕು ಏರಿಕೆ" },
        copy: { en: "Runoff likely caused a visibility drop. Check feed response and pond inflow.", ta: "மேற்பரப்பு ஓட்டம் காரணமாக தெளிவு குறைந்திருக்கலாம். தீவன எதிர்வினையும் நீர் வரவையும் சரிபார்க்கவும்.", hi: "रनऑफ के कारण दृश्यता घटी हो सकती है। फीड प्रतिक्रिया और तालाब में पानी के प्रवाह की जाँच करें।", kn: "ರನ್‌ಆಫ್‌ನಿಂದ ದೃಶ್ಯತೆ ಕಡಿಮೆಯಾಗಿರಬಹುದು. ಆಹಾರ ಪ್ರತಿಕ್ರಿಯೆ ಮತ್ತು ಕೊಳದ ನೀರಿನ ಪ್ರವಾಹ ಪರಿಶೀಲಿಸಿ." },
        time: "18 min ago"
      },
      {
        level: "safe",
        title: { en: "Pond Beta remains stable", ta: "பாண்ட் பேட்டா நிலையாக உள்ளது", hi: "पॉन्ड बीटा स्थिर है", kn: "ಪಾಂಡ್ ಬೇಟಾ ಸ್ಥಿರವಾಗಿದೆ" },
        copy: { en: "All five sensors stayed within recommended range for the last 6 hours.", ta: "கடைசி 6 மணிநேரமாக அனைத்து ஐந்து சென்சார்களும் பரிந்துரைக்கப்பட்ட வரம்பில் உள்ளன.", hi: "पिछले 6 घंटों से सभी पाँच सेंसर अनुशंसित सीमा में हैं।", kn: "ಕಳೆದ 6 ಗಂಟೆಗಳಿನಿಂದ ಎಲ್ಲಾ ಐದು ಸಂವೇದಕಗಳು ಶಿಫಾರಸು ಮಾಡಿದ ಮಿತಿಯಲ್ಲಿವೆ." },
        time: "34 min ago"
      }
    ];

    const insights = [
      {
        title: { en: "Water Quality Index", ta: "நீர்தர குறியீடு", hi: "जल गुणवत्ता सूचकांक", kn: "ನೀರಿನ ಗುಣಮಟ್ಟ ಸೂಚ್ಯಂಕ" },
        copy: { en: "Pond Alpha is at 48/100. Pond Beta is currently the healthiest station at 85/100.", ta: "பாண்ட் ஆல்பா 48/100 ஆக உள்ளது. பாண்ட் பேட்டா தற்போது 85/100 மதிப்புடன் சிறந்த நிலையில் உள்ளது.", hi: "पॉन्ड अल्फा 48/100 पर है। पॉन्ड बीटा अभी 85/100 के साथ सबसे स्वस्थ स्टेशन है।", kn: "ಪಾಂಡ್ ಆಲ್ಫಾ 48/100 ನಲ್ಲಿ ಇದೆ. ಪಾಂಡ್ ಬೇಟಾ ಈಗ 85/100 ಅಂಕಗಳೊಂದಿಗೆ ಅತ್ಯಂತ ಆರೋಗ್ಯಕರ ಕೇಂದ್ರವಾಗಿದೆ." }
      },
      {
        title: { en: "Rainfall correlation", ta: "மழை தொடர்பு", hi: "वर्षा संबंध", kn: "ಮಳೆಯ ಸಂಬಂಧ" },
        copy: { en: "Turbidity is 12% higher on days with light rain. Consider flagging post-rain readings in reports.", ta: "லேசான மழை பெய்யும் நாட்களில் குழப்பம் 12% அதிகமாக உள்ளது. மழைக்குப் பிறகான அளவீடுகளை அறிக்கையில் குறிக்கலாம்.", hi: "हल्की बारिश वाले दिनों में टर्बिडिटी 12% अधिक है। रिपोर्ट में बारिश के बाद की रीडिंग को अलग से चिह्नित करें।", kn: "ಸಣ್ಣ ಮಳೆಯ ದಿನಗಳಲ್ಲಿ ಮಂಕು 12% ಹೆಚ್ಚು ಇರುತ್ತದೆ. ವರದಿಯಲ್ಲಿ ಮಳೆಯ ನಂತರದ ಓದುಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಗುರುತಿಸಿ." }
      },
      {
        title: { en: "Daily averages", ta: "தினசரி சராசரிகள்", hi: "दैनिक औसत", kn: "ದೈನಂದಿನ ಸರಾಸರಿ" },
        copy: { en: "Average pH today is 6.2, temperature is 32.8 C, and TDS remains above the preferred band.", ta: "இன்றைய சராசரி pH 6.2, வெப்பநிலை 32.8 C, மேலும் TDS விரும்பத்தக்க வரம்பை விட மேலே உள்ளது.", hi: "आज का औसत pH 6.2 है, तापमान 32.8 C है, और TDS अभी भी पसंदीदा सीमा से ऊपर है।", kn: "ಇಂದಿನ ಸರಾಸರಿ pH 6.2, ತಾಪಮಾನ 32.8 C, ಮತ್ತು TDS ಇನ್ನೂ ಬಯಸಿದ ಮಿತಿಗಿಂತ ಮೇಲಿದೆ." }
      },
      {
        title: { en: "Compliance view", ta: "இணக்க காட்சி", hi: "अनुपालन दृश्य", kn: "ಅನುಸರಣೆ ನೋಟ" },
        copy: { en: "Use safe bands here as the baseline for your WHO or BIS comparison module and PDF summary.", ta: "WHO அல்லது BIS ஒப்பீட்டு தொகுதி மற்றும் PDF சுருக்கத்திற்கான அடிப்படையாக இங்குள்ள பாதுகாப்பு வரம்புகளை பயன்படுத்தவும்.", hi: "यहां दिए गए सुरक्षित बैंड को WHO या BIS तुलना मॉड्यूल और PDF सारांश के आधार के रूप में उपयोग करें।", kn: "ಇಲ್ಲಿನ ಸುರಕ್ಷಿತ ಮಿತಿಗಳನ್ನು WHO ಅಥವಾ BIS ಹೋಲಿಕೆ ಘಟಕ ಮತ್ತು PDF ಸಾರಾಂಶಕ್ಕೆ ಆಧಾರವಾಗಿ ಬಳಸಿ." }
      }
    ];

    const i18n = {
      en: {
        navDashboard: "Dashboard", navPonds: "Ponds", navAlerts: "Alerts", navProfile: "Profile",
        liveReadings: "Live Readings", pageDashboard: "Dashboard", lastUpdated: "Last updated",
        exportCSV: "Export CSV", exportExcel: "Export Excel", dailyReport: "Daily Report",
        logout: "Logout",
        loginTitle: "Sign in", loginSub: "Access your pond dashboard and live water quality updates.",
        emailLabel: "Email", passwordLabel: "Password", signIn: "Sign in",
        emailPlaceholder: "farmer@quantumquad.com", passwordPlaceholder: "Enter password",
        demoHint: "Demo login: use any valid email and password with at least 4 characters.",
        loginError: "Enter a valid email and password with at least 4 characters.",
        secondsRefresh: "s refresh", historicalTrends: "Historical trends", recentAlerts: "Recent alerts",
        alertsSub: "Threshold and trend based events", alertLog: "Alert log", pondsTitle: "Ponds",
        pondsSub: "Species-aware overview for all monitored stations", addPond: "+ Add pond",
        analytics: "Analytics", analyticsSub: "Daily stats, WQI and rainfall correlation",
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
        wqi: "WQI", temperature: "Temperature", dissolvedOxygen: "Dissolved Oxygen",
        min: "Min", max: "Max", avg: "Avg", trend: "Trend", rising: "Rising", falling: "Falling",
        selectedLast: "selected · last", waterQualityIndex: "Water Quality Index", rainfallCorrelation: "Rainfall correlation",
        dailyAverages: "Daily averages", complianceView: "Compliance view"
      },
      ta: {
        navDashboard: "டாஷ்போர்டு", navPonds: "குளங்கள்", navAlerts: "எச்சரிக்கைகள்", navProfile: "சுயவிவரம்",
        liveReadings: "நேரடி அளவீடுகள்", pageDashboard: "டாஷ்போர்டு", lastUpdated: "கடைசியாக புதுப்பிக்கப்பட்டது",
        exportCSV: "CSV ஏற்றுமதி", exportExcel: "எக்செல் ஏற்றுமதி", dailyReport: "தினசரி அறிக்கை",
        logout: "வெளியேறு",
        loginTitle: "உள்நுழை", loginSub: "உங்கள் குள டாஷ்போர்டு மற்றும் நேரடி நீர்தர புதுப்பிப்புகளை அணுகவும்.",
        emailLabel: "மின்னஞ்சல்", passwordLabel: "கடவுச்சொல்", signIn: "உள்நுழை",
        emailPlaceholder: "farmer@quantumquad.com", passwordPlaceholder: "கடவுச்சொல்லை உள்ளிடவும்",
        demoHint: "டெமோ உள்நுழைவு: ஏதாவது சரியான மின்னஞ்சல் மற்றும் குறைந்தது 4 எழுத்துகள் கொண்ட கடவுச்சொல் பயன்படுத்தவும்.",
        loginError: "சரியான மின்னஞ்சல் மற்றும் குறைந்தது 4 எழுத்துகள் கொண்ட கடவுச்சொல்லை உள்ளிடவும்.",
        secondsRefresh: "விநாடி புதுப்பிப்பு", historicalTrends: "வரலாற்று போக்குகள்", recentAlerts: "சமீபத்திய எச்சரிக்கைகள்",
        alertsSub: "வரம்பு மற்றும் போக்கு அடிப்படையிலான நிகழ்வுகள்", alertLog: "எச்சரிக்கை பதிவு", pondsTitle: "குளங்கள்",
        pondsSub: "அனைத்து கண்காணிப்பு நிலையங்களின் இன அடிப்படையிலான காட்சி", addPond: "+ குளம் சேர்க்க",
        analytics: "பகுப்பாய்வு", analyticsSub: "தினசரி புள்ளிவிவரங்கள், WQI மற்றும் மழை தொடர்பு",
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
        wqi: "WQI", temperature: "வெப்பநிலை", dissolvedOxygen: "கரைந்த ஆக்சிஜன்",
        min: "குறைந்தது", max: "அதிகபட்சம்", avg: "சராசரி", trend: "போக்கு", rising: "உயர்வு", falling: "குறைவு",
        selectedLast: "தேர்ந்தெடுக்கப்பட்டது · கடைசி", waterQualityIndex: "நீர்தர குறியீடு", rainfallCorrelation: "மழை தொடர்பு",
        dailyAverages: "தினசரி சராசரிகள்", complianceView: "இணக்க காட்சி"
      },
      hi: {
        navDashboard: "डैशबोर्ड", navPonds: "तालाब", navAlerts: "अलर्ट", navProfile: "प्रोफ़ाइल",
        liveReadings: "लाइव रीडिंग", pageDashboard: "डैशबोर्ड", lastUpdated: "अंतिम अपडेट",
        exportCSV: "CSV निर्यात", exportExcel: "एक्सेल निर्यात", dailyReport: "दैनिक रिपोर्ट",
        logout: "लॉग आउट",
        loginTitle: "साइन इन", loginSub: "अपने तालाब डैशबोर्ड और लाइव जल गुणवत्ता अपडेट देखें।",
        emailLabel: "ईमेल", passwordLabel: "पासवर्ड", signIn: "साइन इन",
        emailPlaceholder: "farmer@quantumquad.com", passwordPlaceholder: "पासवर्ड दर्ज करें",
        demoHint: "डेमो लॉगिन: कोई भी वैध ईमेल और कम से कम 4 अक्षरों का पासवर्ड उपयोग करें।",
        loginError: "वैध ईमेल और कम से कम 4 अक्षरों का पासवर्ड दर्ज करें।",
        secondsRefresh: "सेकंड रिफ्रेश", historicalTrends: "ऐतिहासिक रुझान", recentAlerts: "हाल के अलर्ट",
        alertsSub: "सीमा और रुझान आधारित घटनाएं", alertLog: "अलर्ट लॉग", pondsTitle: "तालाब",
        pondsSub: "सभी मॉनिटर किए गए स्टेशनों का प्रजाति-आधारित अवलोकन", addPond: "+ तालाब जोड़ें",
        analytics: "एनालिटिक्स", analyticsSub: "दैनिक आँकड़े, WQI और वर्षा संबंध",
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
        wqi: "WQI", temperature: "तापमान", dissolvedOxygen: "घुलित ऑक्सीजन",
        min: "न्यूनतम", max: "अधिकतम", avg: "औसत", trend: "रुझान", rising: "बढ़ता", falling: "घटता",
        selectedLast: "चयनित · पिछले", waterQualityIndex: "जल गुणवत्ता सूचकांक", rainfallCorrelation: "वर्षा संबंध",
        dailyAverages: "दैनिक औसत", complianceView: "अनुपालन दृश्य"
      },
      kn: {
        navDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", navPonds: "ಕೊಳಗಳು", navAlerts: "ಎಚ್ಚರಿಕೆಗಳು", navProfile: "ಪ್ರೊಫೈಲ್",
        liveReadings: "ಲೈವ್ ರೀಡಿಂಗ್‌ಗಳು", pageDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", lastUpdated: "ಕೊನೆಯ ನವೀಕರಣ",
        exportCSV: "CSV ರಫ್ತು", exportExcel: "ಎಕ್ಸೆಲ್ ರಫ್ತು", dailyReport: "ದಿನಸಿ ವರದಿ",
        logout: "ಲಾಗ್ ಔಟ್",
        loginTitle: "ಸೈನ್ ಇನ್", loginSub: "ನಿಮ್ಮ ಕೊಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ಲೈವ್ ನೀರಿನ ಗುಣಮಟ್ಟ ನವೀಕರಣಗಳನ್ನು ಪ್ರವೇಶಿಸಿ.",
        emailLabel: "ಇಮೇಲ್", passwordLabel: "ಪಾಸ್ವರ್ಡ್", signIn: "ಸೈನ್ ಇನ್",
        emailPlaceholder: "farmer@quantumquad.com", passwordPlaceholder: "ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ",
        demoHint: "ಡೆಮೋ ಲಾಗಿನ್: ಯಾವುದೇ ಮಾನ್ಯ ಇಮೇಲ್ ಮತ್ತು ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳ ಪಾಸ್ವರ್ಡ್ ಬಳಸಿ.",
        loginError: "ಮಾನ್ಯ ಇಮೇಲ್ ಮತ್ತು ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ.",
        secondsRefresh: "ಸೆಕೆಂಡ್ ರಿಫ್ರೆಶ್", historicalTrends: "ಐತಿಹಾಸಿಕ ಪ್ರವೃತ್ತಿಗಳು", recentAlerts: "ಇತ್ತೀಚಿನ ಎಚ್ಚರಿಕೆಗಳು",
        alertsSub: "ಮಿತಿ ಮತ್ತು ಪ್ರವೃತ್ತಿ ಆಧಾರಿತ ಘಟನೆಗಳು", alertLog: "ಎಚ್ಚರಿಕೆ ಲಾಗ್", pondsTitle: "ಕೊಳಗಳು",
        pondsSub: "ಎಲ್ಲಾ ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿರುವ ಕೇಂದ್ರಗಳ ಪ್ರಜಾತಿ ಆಧಾರಿತ ಅವಲೋಕನ", addPond: "+ ಕೊಳ ಸೇರಿಸಿ",
        analytics: "ವಿಶ್ಲೇಷಣೆ", analyticsSub: "ದೈನಂದಿನ ಅಂಕಿಅಂಶಗಳು, WQI ಮತ್ತು ಮಳೆ ಸಂಬಂಧ",
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
        wqi: "WQI", temperature: "ತಾಪಮಾನ", dissolvedOxygen: "ಕರಗಿದ ಆಮ್ಲಜನಕ",
        min: "ಕನಿಷ್ಠ", max: "ಗರಿಷ್ಠ", avg: "ಸರಾಸರಿ", trend: "ಪ್ರವೃತ್ತಿ", rising: "ಏರಿಕೆ", falling: "ಇಳಿಕೆ",
        selectedLast: "ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ · ಕೊನೆಯ", waterQualityIndex: "ನೀರಿನ ಗುಣಮಟ್ಟ ಸೂಚ್ಯಂಕ", rainfallCorrelation: "ಮಳೆ ಸಂಬಂಧ",
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
    let sensorPollInterval;
    let hasLiveSensorData = false;

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
        dots: '<svg viewBox="0 0 24 24"><path d="M8 16c0-1.1.9-2 2-2"></path><path d="M12 19c0-1.1.9-2 2-2"></path><path d="M12 13c0-1.1.9-2 2-2"></path><path d="M8 10c0-1.1.9-2 2-2"></path><path d="M15 7c0-1.1.9-2 2-2"></path></svg>'
      };
      return icons[name] || icons.grid;
    }

    function getStatus(sensor) {
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

    function formatSensorValue(sensor) {
      return sensor.decimals === 0 ? Math.round(sensor.value).toString() : sensor.value.toFixed(sensor.decimals);
    }

    function rangeMarker(sensor) {
      const [min, max] = sensor.absoluteRange;
      return Math.max(0, Math.min(100, ((sensor.value - min) / (max - min)) * 100));
    }

    function renderSummaries() {
      const healthy = ponds.filter((pond) => pond.status === "safe").length;
      const warning = ponds.filter((pond) => pond.status === "warning").length;
      const activeAlerts = 212;

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

      const temp = getSensorByKey("temperature");
      const dissolvedOxygen = getSensorByKey("do");
      ponds[0].temp = `${temp.value.toFixed(1)} C`;
      ponds[0].do = `${dissolvedOxygen.value.toFixed(2)} mg/L`;

      const statuses = sensors.map((sensor) => getStatus(sensor));
      ponds[0].status = statuses.includes("critical")
        ? "critical"
        : statuses.includes("warning")
          ? "warning"
          : "safe";

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
        }
      } catch {
        // Keep mock data when backend/sensor data is unavailable.
      }
    }

    function renderPonds() {
      document.getElementById("pondsGrid").innerHTML = ponds.map((pond) => `
        <article class="pond-card">
          <div class="pond-top">
            <div>
              <div class="pond-species">${pond.species}</div>
              <div class="pond-name">${pond.name}</div>
            </div>
            <div class="status-pill ${pond.status}">${statusLabel(pond.status)}</div>
          </div>

          <div class="pond-meta">
            <div class="pond-metric">
              <div class="k">${t("station")}</div>
              <div class="v">${pond.station}</div>
            </div>
            <div class="pond-metric">
              <div class="k">${t("wqi")}</div>
              <div class="v">${pond.wqi}/100</div>
            </div>
            <div class="pond-metric">
              <div class="k">${t("temperature")}</div>
              <div class="v">${pond.temp}</div>
            </div>
            <div class="pond-metric">
              <div class="k">${t("dissolvedOxygen")}</div>
              <div class="v">${pond.do}</div>
            </div>
          </div>
        </article>
      `).join("");

      const pondsPage = document.getElementById("pondsGridPage");
      if (pondsPage) pondsPage.innerHTML = document.getElementById("pondsGrid").innerHTML;
    }

    function renderInsights() {
      document.getElementById("insightsList").innerHTML = insights.map((item) => `
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
      const cfg = chartConfig[rangeKey];
      const values = [];
      let current = sensor.seriesBase;

      for (let i = 0; i < cfg.points; i++) {
        const drift = sensor.key === "temperature" ? 0.03 : sensor.key === "do" ? -0.02 : 0.01;
        current += (Math.random() - 0.5 + drift) * sensor.seriesBase * cfg.variance;
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
      const status = getStatus(sensor);
      const labels = makeLabels(selectedRange);
      const series = makeSeries(sensor, selectedRange);
      const colors = chartColor(status);
      const min = Math.min(...series);
      const max = Math.max(...series);
      const avg = series.reduce((sum, val) => sum + val, 0) / series.length;
      const trend = series[series.length - 1] > series[0] ? t("rising") : t("falling");

      document.getElementById("trendSubtitle").textContent = `${sensor.name} ${t("selectedLast")} ${selectedRange}`;
      document.getElementById("liveReadingMeta").textContent = `${ponds[0].name} · ${ponds[0].station}`;
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
        en: "Daily report generated. You can replace this with your PDF export flow.",
        ta: "தினசரி அறிக்கை உருவாக்கப்பட்டது. இதை உங்கள் PDF ஏற்றுமதி செயலோட்டத்துடன் இணைக்கலாம்.",
        hi: "दैनिक रिपोर्ट तैयार हो गई। इसे आप अपने PDF एक्सपोर्ट फ्लो से बदल सकते हैं।",
        kn: "ದಿನಸಿ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. ಇದನ್ನು ನಿಮ್ಮ PDF ಎಕ್ಸ್ಪೋರ್ಟ್ ಪ್ರಕ್ರಿಯೆಗೆ ಜೋಡಿಸಬಹುದು."
      };
      alert(messages[currentLang]);
    }

    function updateUserProfile(email) {
      const username = email.split("@")[0] || "Demo Farmer";
      const displayName = username
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      const finalName = displayName || "Demo Farmer";
      const finalEmail = email || "farmer@quantumquad.com";
      document.getElementById("topProfileName").textContent = finalName;
      document.getElementById("topProfileEmail").textContent = finalEmail;
      document.getElementById("profilePageName").textContent = finalName;
      document.getElementById("profilePageEmail").textContent = finalEmail;
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
      if (event.key === "Escape") closeMobileSidebar();
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
    });
    window.downloadCSV = downloadCSV;
    window.downloadExcel = downloadExcel;
    window.generateReport = generateReport;

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
    updateClock();
    switchView("dashboard");
    pollSensorData();
    sensorPollInterval = setInterval(pollSensorData, SENSOR_POLL_MS);
    if (localStorage.getItem(AUTH_KEY) === "1") showApp();
    else showLogin();
    return () => {
      if (sensorPollInterval) clearInterval(sensorPollInterval);
      closeMobileSidebar();
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
      delete window.downloadCSV;
      delete window.downloadExcel;
      delete window.generateReport;
    };
}
